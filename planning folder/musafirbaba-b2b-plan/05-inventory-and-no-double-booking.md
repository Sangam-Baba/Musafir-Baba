# 05 — Inventory and No Double Booking (deep dive)

> Your major concern, answered precisely. This file is the contract for `hotel-inventory` and `hotel-booking`. Any change needs an ADR and two senior approvals.

---

## 1. The guarantee

**On MusafirBaba (website, B2B dashboard, B2B API, admin offline bookings), a room-night can never be sold more times than the hotel made available — even with thousands of people booking the last room at the same moment, even if servers crash mid-booking, even if users double-click or APIs retry.**

What it does **not** cover on its own: rooms the hotel also sells on other websites (see §9).

## 2. Seven rules that make it true

| # | Rule | Why |
| --- | --- | --- |
| 1 | **One inventory store.** Every channel reads and writes the same `inv_inventory_days` documents through the same `hotel-inventory` service | No copies to get out of sync |
| 2 | **One booking engine.** Website, dashboard, API and admin all call `orders.checkout()` → `hotel-booking` handler | No channel has a shortcut |
| 3 | **Atomic conditional update.** Rooms are taken with one update that succeeds only if `booked + held + qty ≤ total` and not stop-sold | The check and the change are one indivisible step |
| 4 | **All nights or nothing.** Multi-night stays update all night documents inside one MongoDB **transaction** | No half-held stays |
| 5 | **Database rule as last line of defence.** A collection validator rejects any write where `booked + held > total` or counts go negative | Even a buggy script can't oversell |
| 6 | **Holds expire safely.** A sweeper job returns expired holds' rooms; TTL indexes are never used for holds | Abandoned checkouts don't lock rooms forever, and counts stay correct |
| 7 | **Idempotency everywhere.** Booking and payment requests carry an `Idempotency-Key`; repeats return the first result | Double-clicks and retries never create two bookings |

## 3. Data shape

```js
// inv_inventory_days — one document per room type per date
{
  _id: ObjectId,
  hotelOrgId, propertyId, roomTypeId,
  date: '2026-12-24',          // stay night, calendar date string
  total: 10,                   // rooms the hotel gives MusafirBaba for this night (allotment)
  booked: 7,                   // confirmed
  held: 2,                     // in checkout right now
  stopSell: false,
  version: 41,
  updatedAt: ISODate
}
// unique index { roomTypeId: 1, date: 1 }
```

**Collection validator** (created by migration):

```js
db.runCommand({
  collMod: 'inv_inventory_days',
  validator: { $and: [
    { total: { $type: 'number', $gte: 0 } },
    { booked: { $type: 'number', $gte: 0 } },
    { held: { $type: 'number', $gte: 0 } },
    { $expr: { $lte: [ { $add: ['$booked', '$held'] }, '$total' ] } }
  ]},
  validationLevel: 'strict',
  validationAction: 'error'
});
```

`available = total − booked − held`. Nights of a stay = `[checkInDate, checkOutDate)` → a 3-night stay touches 3 documents per room type.

## 4. Reading availability (search — advisory)

```js
// For candidate properties and a stay
db.inv_inventory_days.aggregate([
  { $match: { propertyId: { $in: ids }, date: { $gte: checkIn, $lt: checkOut }, stopSell: false } },
  { $project: { roomTypeId: 1, date: 1, available: { $subtract: ['$total', { $add: ['$booked', '$held'] }] } } },
  { $group: { _id: '$roomTypeId', nights: { $sum: 1 }, minAvailable: { $min: '$available' } } },
  { $match: { nights: nightsCount, minAvailable: { $gte: roomsNeeded } } }
]);
```

Then rates/restrictions from `inv_rate_days` (min/max stay evaluated on arrival date, closed-to-arrival on check-in date, closed-to-departure on check-out date). Search results may be cached for 30–60 s — **they are advisory**. The booking step always re-checks with rule 3.

## 5. Taking rooms (the critical code)

```ts
// modules/hotel-inventory/inventory.service.ts
async holdRooms(ctx: SystemContext, req: HoldRequest, session: ClientSession): Promise<Hold> {
  // Sort for a consistent order across concurrent transactions (fewer write conflicts)
  const lines = sortBy(req.lines, (l) => `${l.roomTypeId}:${l.dates[0]}`);

  for (const line of lines) {
    for (const date of line.dates) {                       // already sorted ascending
      const res = await InventoryDay.updateOne(
        {
          roomTypeId: line.roomTypeId,
          date,
          stopSell: false,
          $expr: { $lte: [{ $add: ['$booked', '$held', line.qty] }, '$total'] },
        },
        { $inc: { held: line.qty, version: 1 }, $set: { updatedAt: this.clock.now() } },
        { session },
      );
      if (res.modifiedCount !== 1) {
        throw new SoldOutError({ roomTypeId: line.roomTypeId, date });   // aborts the whole transaction
      }
    }
  }

  const [hold] = await InventoryHold.create([{
    orderId: req.orderId, propertyId: req.propertyId, lines,
    status: 'ACTIVE', expiresAt: addMinutes(this.clock.now(), HOLD_MINUTES),
  }], { session });

  await this.outbox.add(session, inventoryEvents.changed(req.propertyId, lines));
  return toHold(hold);
}
```

Called inside:

```ts
await mongoSession.withTransaction(
  async (session) => { /* create order (AWAITING_PAYMENT) + holdRooms + save booking HELD + outbox */ },
  { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } },
);
```

**Why this is safe under concurrency:** if two transactions try to change the same night document, MongoDB lets one commit and gives the other a **write conflict**; `withTransaction` retries the loser from the start; on retry it reads the new counts and the `$expr` condition fails if no room is left → `SOLD_OUT`. The validator (§3) would also reject an impossible write. There is no window where two buyers both "see" the last room and both get it.

> **Mongoose setting warning:** this code (and §5.1–5.3) depends on operator filters (`$expr`, `$gte`). Global `mongoose.set('sanitizeFilter', true)` would wrap them in `$eq` and the updates would silently match nothing. Global `sanitizeFilter` is therefore **not** used (see `02-…` §5); an integration test runs these primitives with the production connection settings.

### 5.1 Confirm (hold → booked)

```ts
// inside the confirm transaction
for each line, date:
  updateOne({ roomTypeId, date, held: { $gte: qty } }, { $inc: { held: -qty, booked: qty } }, { session })
  → modifiedCount must be 1, else throw HoldLost
InventoryHold.updateOne({ _id, status: 'ACTIVE' }, { $set: { status: 'CONFIRMED' } }, { session })  → must match
```

### 5.2 Release (payment failed, user abandoned, hold expired)

```ts
// guarded by status so it can never run twice
const h = await InventoryHold.findOneAndUpdate({ _id, status: 'ACTIVE' }, { $set: { status: reason } }, { session });
if (!h) return;                         // already released/confirmed — no-op
for each line, date: updateOne({ roomTypeId, date, held: { $gte: qty } }, { $inc: { held: -qty } }, { session })
```

### 5.3 Cancel a confirmed booking

Same pattern on `booked` (`$inc: { booked: -qty }`), guarded by the booking's state transition `CONFIRMED → CANCELLED` in the same transaction, so rooms are returned exactly once.

## 6. Timers (fixes the v1 race)

| Timer | Value | Rule |
| --- | --- | --- |
| Room hold | 15 min from "Continue to payment" | Created when the order is created |
| PayU payment window | `min(12 min, holdExpiresAt − now − 2 min)` | Set when the payment is started, so it **always ends before the hold**. A PayU checkout is only started if ≥ 5 min of hold remain (after the one extension) |
| Hold extension | +10 min, once | If < 5 min remain when payment starts, extend first (conditional update on `status: 'ACTIVE', extendedOnce: false`) |
| Wallet/credit payment | seconds | Hold → confirm in one transaction, no waiting |
| PayU pending | +10 min, once | If PayU reports `pending` (common with UPI/net banking), the hold is extended once while the poller checks; if still unresolved, rooms are released and a later success goes to the late-payment path |
| Sweeper | every 1 min | Releases `ACTIVE` holds with `expiresAt < now`; marks orders `EXPIRED` (except `PAYMENT_PENDING` orders inside their extension) |

**Gateway payments (PayU):** pay → verify server-to-server (response hash + PayU verify API; the browser redirect alone is never trusted) → confirm rooms. Because the payment window always ends before the hold, a lost hold is rare. If a payment succeeds after the hold expired, the engine tries one re-hold; if rooms are gone, the order becomes `FAILED`, an **automatic PayU refund** is issued (idempotent, tracked to completion) and the customer is told immediately that the money is being refunded, with PayU's refund timeline (never "you were not charged").

## 7. Double-click, retry, and crash safety

| Situation | What happens |
| --- | --- |
| User double-clicks "Book" | Same `Idempotency-Key` → second request returns the first order |
| API client retries after timeout | Same key → same result; no second hold |
| Different key, same price token, same buyer, within 2 min | Rejected with `409 DUPLICATE_ORDER_SUSPECTED` and the existing open order; the user can confirm (`confirmDuplicate: true`) to create a second booking — a real repeat booking is never silently swallowed |
| Server crashes after hold, before response | Transaction either committed (hold exists; client retries with same key → gets it) or didn't (nothing changed) |
| Worker crashes during confirm | Confirm is a transaction — all or nothing; sweeper/reconciler retries from order state |
| PayU callback/webhook arrives twice | Inbox dedupe by `txnId` + status |
| PayU callback never arrives (browser closed) | Poller calls PayU's verify API for orders in `AWAITING_PAYMENT`/`PAYMENT_PENDING` every 2 min |

## 8. Real time for every viewer

1. Every inventory change is visible to a **change stream** on `inv_inventory_days` (filtered by `propertyId`).
2. One listener, running **in the worker** (single instance or leader lock; resume token stored), does:
   - delete Redis cache keys for that property's search/offer results;
   - emit `availability:changed {propertyId, dates}` to room `availability:property:{id}` through the self-hosted Socket.IO Redis emitter (`11-notifications-and-realtime.md`) — open website pages and dashboards refresh prices (these automatic refreshes are not billed — Stage 12 §3.2).
3. The hotel calendar in the business area subscribes too, so hotel staff see bookings land live.
4. Client **webhooks** (Stage 14) are produced from the **outbox** events by the worker — never from this listener — so each event is sent once even with several backend instances.

Result: changes are visible across website, dashboard and API within ~1–2 s; correctness never depends on this (the booking step is authoritative).

## 9. Rooms sold outside MusafirBaba (honest limit)

If a hotel sells the **same** physical rooms on MakeMyTrip, Booking.com or at its front desk, no system can stop overbooking unless all channels share one inventory. v2 handles this in three layers:

1. **Allotment model (v1):** the hotel commits a number of rooms per night to MusafirBaba (`total`). Those rooms are ours to sell; the hotel must not sell them elsewhere. Written into the hotel contract.
2. **Stop-sell and quick edits:** the hotel extranet lets staff reduce `total` or stop-sell instantly (cannot go below `booked + held`).
3. **Channel manager sync (Phase C):** connect AxisRooms / STAAH / eZee so the hotel's single inventory feeds all sites automatically.

And a safety net for the rare case it still happens: **"hotel cannot honour"** flow (Stage 09) — relocate the guest to an equal/better hotel or refund fully, with a penalty/adjustment against the hotel.

## 10. Hotel edits vs live bookings

- Reduce allotment: `updateOne({ roomTypeId, date, $expr: { $gte: [newTotal, { $add: ['$booked', '$held'] }] } }, { $set: { total: newTotal } })` → if 0 matched, show "you already have N rooms booked on these dates".
- Bulk calendar edits run per document with the same guard; the response lists dates that couldn't change.
- Price changes never affect existing bookings (price snapshot) or open checkouts (signed price token is honoured until it expires, then re-priced).

## 11. Load and scale

- Contention only exists on the **same room type + same night**. Different hotels/dates never block each other.
- For hot dates (New Year's Eve in Goa) write conflicts rise; `withTransaction` retries; keep transactions tiny (no network calls inside), limit holds per org (default 20 concurrent) and rate-limit booking endpoints.
- Index on `{roomTypeId, date}` makes each update a single-document lookup.
- ~5,000 hotels × 4 room types × 365 days ≈ 7.3 M documents — comfortable for MongoDB with these indexes; archive past dates monthly.

## 12. Tests that must pass before go-live

| Test | Pass condition |
| --- | --- |
| Last-room race | 50 parallel bookings for 1 remaining room → exactly 1 confirmed, 49 `SOLD_OUT`, counts consistent |
| Multi-night partial | Night 2 sold out → no night held (all-or-nothing) |
| Mixed channels | Website + dashboard + API booking the last room at once → 1 winner |
| Hold expiry | Abandoned checkout → rooms back within 2 min; no negative counts |
| Late payment | PayU success after hold expiry with rooms gone → order `FAILED`, automatic refund issued once, customer notified |
| PayU pending | Pending payment resolved by the poller → confirmed (or released and refunded if it succeeds too late) |
| Duplicate guard | Same token, new key within 2 min → `DUPLICATE_ORDER_SUSPECTED`; with `confirmDuplicate` → second order |
| Idempotency | Same key ×5 → 1 order, 1 hold |
| Crash injection | Kill process mid-transaction → no partial state |
| Validator | Direct DB write making `booked + held > total` is rejected |
| Hotel reduces allotment below booked | Rejected with clear message |
| Soak | 2 h mixed load → invariant check finds 0 violations |
