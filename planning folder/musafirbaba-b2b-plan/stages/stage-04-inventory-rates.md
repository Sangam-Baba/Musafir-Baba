# Stage 04 — Inventory & Rates Calendar

| | |
| --- | --- |
| **Phase** | A — hotels + website (working system) |
| **Duration** | ~3 weeks |
| **Depends on** | Stage 03 |
| **Modules** | `hotel-inventory` |
| **Apps** | Business area `/hotel` calendar, `admin` (read/override) |
| **Closes** | D12 (allotment model) |
| **Must read** | **`05-inventory-and-no-double-booking.md`** (this stage implements §3–§5, §10) |

## 1. Goal

Hotels control rooms, prices and rules per night quickly and safely; the platform computes availability correctly and has the **atomic hold / confirm / release** primitives the booking engine will use.

## 2. Scope

**In:** rate plans, meal plans, cancellation policies, per-occupancy prices (tax-exclusive), inventory days (allotment), restrictions, calendar UI with bulk edits, CSV import, availability query, hold/confirm/release/return primitives, hold sweeper, change events + change stream listener, audit of ARI changes.
**Out:** pricing/GST (Stage 05), search API (Stage 06), checkout (Stage 08).

## 3. Work breakdown

1. **Rate plans**: room types covered, meal plan (EP/CP/MAP/AP), cancellation policy, pricing model (`PER_ROOM` or `PER_OCCUPANCY`), min/max advance days, status. Derived plans (e.g. "CP = EP + ₹500") are expanded into rate days when saved.
2. **Cancellation policies**: reusable rules (hours before check-in → % / nights / fixed), no-show penalty, non-refundable flag; auto-generated summary text.
3. **Inventory days**: created 365 days ahead when a room type is created; nightly job extends the horizon. Fields per `05-…` §3. **Collection validator** created by migration.
4. **Rate days**: per rate plan × room type × date: prices by occupancy key, `minLos`, `maxLos`, `closedToArrival`, `closedToDeparture`, `stopSell`. **Prices are tax-exclusive** (form label says so).
5. **Calendar UI**: grid of room types × rate plans × dates; 30/60/90-day views; inline edit; select ranges + weekdays ("every Fri–Sat in December"); bulk set rooms/prices/restrictions; preview before save; undo last bulk change; warning when price changes > 50%; virtualised for speed; live updates via the self-hosted realtime server (`availability:property:{id}`) when bookings land.
6. **Guarded allotment edits**: reducing `total` uses the conditional update from `05-…` §10; response lists dates that couldn't change.
7. **CSV import**: template, validation report, dry run, apply (≤ 50k rows).
8. **Availability query** (`checkAvailability(propertyIds, stay, rooms)`): aggregation from `05-…` §4 + rate/restriction checks; returns sellable room type × rate plan with nightly nets and available count.
9. **Inventory primitives** (service methods, used only by `hotel-booking`, run as SYSTEM actor inside the caller's transaction): `holdRooms`, `confirmHold`, `releaseHold`, `extendHold` (once), `returnRooms` (cancellation). Exact code pattern in `05-…` §5.
10. **Hold sweeper** (worker, every minute): finds `ACTIVE` holds past `expiresAt`, releases each in its own transaction, emits events; alert if any hold is > 2 min overdue.
11. **Change stream listener** (runs once, in the worker): on `inv_inventory_days` changes → Redis cache invalidation per property + `availability:changed` emit to `availability:property:{id}` via the Socket.IO Redis emitter; resume token persisted. Webhooks never come from here (outbox only).
12. **ARI change log**: who changed what dates, old → new (append-only, partitioned by month via date field + archival).
13. **Admin**: read-only calendar for any property; override with reason (audited).

## 4. Collections & indexes

`inv_rate_plans`, `inv_cancellation_policies`, `inv_inventory_days` (unique `{roomTypeId, date}`, `{propertyId, date}`, validator), `inv_rate_days` (unique `{ratePlanId, roomTypeId, date}`, `{propertyId, date}`), `inv_holds` (`{status, expiresAt}`, unique `{orderId}`), `inv_change_log`.

## 5. API

Hotel: CRUD `/hotel/rate-plans`, `/hotel/cancellation-policies`; `GET /hotel/properties/{id}/calendar?from&to`; `PUT /hotel/properties/{id}/calendar` (bulk, idempotent); `POST /hotel/calendar-imports`.
Admin: `GET /admin/properties/{id}/calendar`, `POST /admin/properties/{id}/calendar-override`.
Internal service only (no HTTP): `checkAvailability`, `holdRooms`, `confirmHold`, `releaseHold`, `extendHold`, `returnRooms`.

## 6. Events

`hotelInventory.inventory.changed` (propertyId, roomTypeIds, dateFrom, dateTo), `hotelInventory.hold.expired`.

## 7. Rules & edge cases

- Nights `[checkIn, checkOut)`; min/max stay checked on arrival date; closed-to-arrival on check-in; closed-to-departure on check-out.
- Missing price for a date/occupancy → that plan isn't sellable for stays covering it.
- Past dates read-only (hotel local date).
- Max stay 30 nights online.
- Inventory days for a room type never deleted; room type archived instead.

## 8. Security

| Threat | Control | Test |
| --- | --- | --- |
| Oversell by direct writes | Validator + conditional updates; primitives not exposed over HTTP | Validator test |
| Hotel edits another property's calendar | Tenant guard + property limits | Isolation |
| Fat-finger price disaster | Preview, > 50% warning, undo, audit | Tests |
| Calendar flood | Rate limits, batch caps | Load test |

## 9. Mandatory tests

- Availability property test vs naive reference (random calendars/restrictions/stays).
- Concurrency: 100 parallel `holdRooms` on 3 rooms → exactly 3 succeed; counts consistent.
- Multi-night all-or-nothing; release idempotent; sweeper returns rooms; validator rejects `booked + held > total`.
- Allotment reduction below booked rejected with dates listed.

## 10. Definition of Done

- [ ] Hotel sets 2 room types × 2 rate plans with policies; loads 90 days via calendar and CSV
- [ ] Availability correct in all edge cases
- [ ] Hold primitives pass the concurrency suite
- [ ] Calendar shows a test booking appear live

## 11. AI editor prompt

```
Read: AGENTS.md, 05-inventory-and-no-double-booking.md (all), this stage §3.9–3.10.
Task: holdRooms / confirmHold / releaseHold / returnRooms + hold sweeper.
Constraints: modules/hotel-inventory; must run inside caller's session; conditional $expr updates; check modifiedCount; no TTL index on holds.
Tests first (MongoMemoryReplSet): 100 concurrent holds for 3 rooms → 3 succeed; night-2 sold out → nothing held; release twice → second is no-op;
sweeper releases expired; validator rejects direct oversell write.
```
