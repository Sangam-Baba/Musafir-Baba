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
| 4 | **All nights or nothing — by undo, not by transaction.** Production MongoDB stays standalone (no multi-document transactions — D28). Each night is taken in its own atomic step that **records the hold id inside the night document**; if any night fails, the nights already taken are given back by hold id. A crashed process is cleaned up by the reconciler (§5.4) | A half-held stay can exist for at most seconds and only *blocks* rooms — it can **never sell a room twice** |
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
  holds:    [ { holdId, qty: 1, expiresAt: ISODate } ],   // who holds the `held` rooms (≤ total entries)
  bookings: [ { bookingId, qty: 1 } ],                    // who owns the `booked` rooms (≤ total entries)
  version: 41,
  updatedAt: ISODate
}
// unique index { roomTypeId: 1, date: 1 }; index { 'holds.expiresAt': 1 } (partial: holds not empty)
```

Recording **who** holds or owns each room inside the same document is what makes every step safe without transactions: a step can't be applied twice (its id is already there), and it can always be undone exactly (remove that id, subtract its qty).

**Collection validator** (created by migration):

```js
db.runCommand({
  collMod: 'inv_inventory_days',
  validator: { $and: [
    { total: { $type: 'number', $gte: 0 } },
    { booked: { $type: 'number', $gte: 0 } },
    { held: { $type: 'number', $gte: 0 } },
    { $expr: { $lte: [ { $add: ['$booked', '$held'] }, '$total' ] } },
    { $expr: { $eq: [ '$held',   { $sum: '$holds.qty' } ] } },      // counts always match their owners
    { $expr: { $eq: [ '$booked', { $sum: '$bookings.qty' } ] } }
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

## 5. Taking rooms (the critical code — no multi-document transactions)

Every step below is **one atomic update of one document**. MongoDB guarantees a single-document update is all-or-nothing and that two updates to the same document never interleave — on a standalone server too.

### 5.0 The hold document (state of the checkout's rooms)

`inv_holds`: `{ _id: holdId, orderId, propertyId, lines[{roomTypeId, qty, dates[]}], status, expiresAt, extendedOnce, appliedAt? }`
Statuses: `PLACING → ACTIVE → CONFIRMING → CONFIRMED`, or `PLACING/ACTIVE → RELEASING → RELEASED`, or `PLACING → FAILED`. Every status change is a conditional update (`{ _id, status: <expected> }`), so two processes can never both win.

### 5.1 Hold all nights

```ts
// modules/hotel-inventory/inventory.service.js
async holdRooms(ctx: SystemContext, req: HoldRequest): Promise<Hold> {
  const hold = await this.holds.createPlacing(req);              // status PLACING, expiresAt = now + 15 min
  const steps = nightsOf(req.lines);                             // sorted: roomTypeId, then date
  const taken: NightStep[] = [];

  for (const step of steps) {
    const res = await InventoryDay.updateOne(
      {
        roomTypeId: step.roomTypeId, date: step.date, stopSell: false,
        'holds.holdId': { $ne: hold.id },                         // never apply the same hold twice
        $expr: { $lte: [{ $add: ['$booked', '$held', step.qty] }, '$total'] },
      },
      {
        $inc: { held: step.qty, version: 1 },
        $push: { holds: { holdId: hold.id, qty: step.qty, expiresAt: hold.expiresAt } },
        $set: { updatedAt: this.clock.now() },
      },
    );
    if (res.modifiedCount === 1 || (await this.alreadyHeld(step, hold.id))) { taken.push(step); continue; }
    await this.giveBack(hold.id, taken);                          // undo the nights already taken (§5.3)
    await this.holds.markFailed(hold.id, 'SOLD_OUT');
    throw new SoldOutError({ roomTypeId: step.roomTypeId, date: step.date });
  }

  await this.holds.activate(hold.id);                             // PLACING → ACTIVE, pushes inventory.changed event (§7a)
  return hold;
}
```

**Why this can never oversell:** each night's check (`booked + held + qty ≤ total`) and change happen in one indivisible update, and the collection validator (§3) rejects any impossible write. Two buyers racing for the last room on a night: MongoDB applies one update, the other's condition is false → `SOLD_OUT`. Multi-night stays only add the possibility that *some* nights were taken before another night sold out — those are given back immediately, and if the process died first, the reconciler gives them back within a minute. Rooms can be **briefly blocked**, never **double sold**.

> **Mongoose setting warning:** these updates depend on operator filters (`$expr`, `$ne`, `$gte`). Global `mongoose.set('sanitizeFilter', true)` would wrap them in `$eq` and the updates would silently match nothing. Global `sanitizeFilter` is therefore **not** used (see `02-…` §5); an integration test runs these primitives with the production connection settings.

### 5.2 Confirm (hold → booked)

```ts
// 1. claim the hold for confirming — the sweeper can no longer release it
holds.updateOne({ _id: holdId, status: 'ACTIVE' }, { $set: { status: 'CONFIRMING', bookingId } })   → must match
// 2. per night (idempotent)
updateOne({ roomTypeId, date, 'holds.holdId': holdId },
          { $inc: { held: -qty, booked: qty }, $pull: { holds: { holdId } }, $push: { bookings: { bookingId, qty } } })
→ 0 modified: if `bookings.bookingId` already present → already done; else HoldLost → one re-hold attempt for that night (5.1 condition), else refund path (§6)
// 3. hold → CONFIRMED; booking + order → CONFIRMED (each a conditional single-document update)
```

A crash between steps leaves the hold in `CONFIRMING` with money captured → the reconciler (§5.4) **finishes it forward** (steps are idempotent). Once money is captured, the flow only ever moves forward (confirm) or ends in a refund — never silently stops.

### 5.3 Release / give back (payment failed, abandoned, expired, sold out on a later night)

```ts
holds.updateOne({ _id: holdId, status: { $in: ['PLACING', 'ACTIVE'] } }, { $set: { status: 'RELEASING' } })   // no-op if already released/confirming
for each night: updateOne({ roomTypeId, date, 'holds.holdId': holdId }, { $inc: { held: -qty }, $pull: { holds: { holdId } } })
holds.updateOne({ _id: holdId, status: 'RELEASING' }, { $set: { status: 'RELEASED' } })
```

The night update only matches if this hold is still recorded there, so running it twice (or by two processes) returns rooms **exactly once**.

**Cancel a confirmed booking:** same pattern on `bookings` — booking `CONFIRMED → CANCELLING` (conditional), per night `{ 'bookings.bookingId': id } → $inc booked: -qty, $pull bookings`, then `CANCELLED`. Reconciler finishes any `CANCELLING` booking.

### 5.4 Reconciler and sweeper (the safety net that replaces transactions)

Runs in the worker every 30 s (lease-locked schedule, so one runner at a time):

| Finds | Does |
| --- | --- |
| Holds `PLACING` for > 30 s (process died while taking nights) | Give back by hold id (5.3) → `FAILED`; order → `FAILED` with "please try again" |
| Holds `ACTIVE` with `expiresAt < now` | Release (5.3); order → `EXPIRED` (except `PAYMENT_PENDING` inside its extension) |
| Holds `RELEASING` for > 30 s | Finish the release |
| Holds `CONFIRMING` for > 30 s | Finish the confirm forward (5.2); if a night is truly lost → refund path |
| Bookings `CANCELLING` for > 30 s | Finish the cancel |
| Night entries in `holds[]` whose `expiresAt` is > 5 min past and whose hold is not `CONFIRMING` (orphans) | Pull them (`$inc held: -qty`) |

Plus an **invariant checker** every 10 min: `held = Σ holds.qty`, `booked = Σ bookings.qty` (also enforced by the validator), and every `bookings[]` entry belongs to a `CONFIRMED`/`CANCELLING` booking. Any finding pages the on-call developer.

## 6. Timers (fixes the v1 race)

| Timer | Value | Rule |
| --- | --- | --- |
| Room hold | 15 min from "Continue to payment" | Created when the order is created |
| PayU payment window | `min(12 min, holdExpiresAt − now − 2 min)` | Set when the payment is started, so it **always ends before the hold**. A PayU checkout is only started if ≥ 5 min of hold remain (after the one extension) |
| Hold extension | +10 min, once | If < 5 min remain when payment starts, extend first (conditional update on `status: 'ACTIVE', extendedOnce: false`) |
| Wallet/credit payment | seconds | Hold rooms → hold funds → confirm rooms → capture funds, each step idempotent; reconciler finishes or undoes it (§5.4) |
| PayU pending | +10 min, once | If PayU reports `pending` (common with UPI/net banking), the hold is extended once while the poller checks; if still unresolved, rooms are released and a later success goes to the late-payment path |
| Sweeper / reconciler | every 30 s | Releases `ACTIVE` holds with `expiresAt < now`; marks orders `EXPIRED` (except `PAYMENT_PENDING` orders inside their extension) |

**Gateway payments (PayU):** pay → verify server-to-server (response hash + PayU verify API; the browser redirect alone is never trusted) → confirm rooms. Because the payment window always ends before the hold, a lost hold is rare. If a payment succeeds after the hold expired, the engine tries one re-hold; if rooms are gone, the order becomes `FAILED`, an **automatic PayU refund** is issued (idempotent, tracked to completion) and the customer is told immediately that the money is being refunded, with PayU's refund timeline (never "you were not charged").

## 7. Double-click, retry, and crash safety

| Situation | What happens |
| --- | --- |
| User double-clicks "Book" | Same `Idempotency-Key` → second request returns the first order |
| API client retries after timeout | Same key → same result; no second hold |
| Different key, same price token, same buyer, within 2 min | Rejected with `409 DUPLICATE_ORDER_SUSPECTED` and the existing open order; the user can confirm (`confirmDuplicate: true`) to create a second booking — a real repeat booking is never silently swallowed |
| Server crashes while taking nights | Hold stays `PLACING`; reconciler gives the nights back within ~1 min and fails the order; the client's retry with the same key sees the result and can start again |
| Worker crashes during confirm | Hold stays `CONFIRMING`; reconciler finishes the remaining idempotent steps forward |
| PayU callback/webhook arrives twice | Inbox dedupe by `txnId` + status |
| PayU callback never arrives (browser closed) | Poller calls PayU's verify API for orders in `AWAITING_PAYMENT`/`PAYMENT_PENDING` every 2 min |

## 7a. Events without transactions

The status change that matters (hold `ACTIVE`, booking `CONFIRMED`, `CANCELLED`…) is a single-document update, and **the same update pushes the event into that document's `pendingEvents[]`** (and sets `hasPendingEvents: true`). The relay in the worker copies pending events into `core_outbox` (unique `eventId`) and then pulls them from the document. So an event exists **if and only if** the change happened — the guarantee an outbox-in-a-transaction would give.

## 8. Real time for every viewer

1. Inventory-changing steps emit `inventory.changed {propertyId, dates}` events (§7a). The worker turns them into signals in `rt_signals` (debounced to one per property per second):
   - `cache:evict` for that property (API instances clear their in-process cache, if enabled);
   - `availability:changed {propertyId, dates}` for room `availability:property:{id}`, delivered by the self-hosted Socket.IO server (`11-notifications-and-realtime.md`) — open website pages and dashboards refresh prices (these automatic refreshes are not billed — Stage 12 §3.2).
2. `rt_signals` is a **capped collection** read with a tailable cursor (works on a standalone server — no change streams needed).
3. The hotel calendar in the business area subscribes too, so hotel staff see bookings land live.
4. Client **webhooks** (Stage 14) are produced from the **outbox** events by the worker, so each event is sent once even with several instances.

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
- For hot dates (New Year's Eve in Goa) many updates target the same night document; MongoDB serialises them (each is microseconds), losers get `SOLD_OUT` immediately — no retries needed. Limit holds per org (default 20 concurrent) and rate-limit booking endpoints; the `holds[]`/`bookings[]` arrays stay small (≤ `total` entries).
- Index on `{roomTypeId, date}` makes each update a single-document lookup.
- ~5,000 hotels × 4 room types × 365 days ≈ 7.3 M documents — comfortable for MongoDB with these indexes; archive past dates monthly.

## 12. Tests that must pass before go-live

| Test | Pass condition |
| --- | --- |
| Last-room race | 50 parallel bookings for 1 remaining room → exactly 1 confirmed, 49 `SOLD_OUT`, counts consistent |
| Multi-night partial | Night 2 sold out → night 1 given back immediately; counts back to the start values |
| Mixed channels | Website + dashboard + API booking the last room at once → 1 winner |
| Hold expiry | Abandoned checkout → rooms back within 2 min; no negative counts |
| Late payment | PayU success after hold expiry with rooms gone → order `FAILED`, automatic refund issued once, customer notified |
| PayU pending | Pending payment resolved by the poller → confirmed (or released and refunded if it succeeds too late) |
| Duplicate guard | Same token, new key within 2 min → `DUPLICATE_ORDER_SUSPECTED`; with `confirmDuplicate` → second order |
| Idempotency | Same key ×5 → 1 order, 1 hold |
| Crash injection | Kill the process after each step of hold, confirm, release and cancel → reconciler restores a consistent state within 1 min; never `booked + held > total` at any moment |
| Validator | Direct DB write making `booked + held > total` is rejected |
| Hotel reduces allotment below booked | Rejected with clear message |
| Soak | 2 h mixed load with random process kills → invariant check finds 0 violations |
| Standalone mode | All suites above run on a **standalone** MongoDB (same as production) |
