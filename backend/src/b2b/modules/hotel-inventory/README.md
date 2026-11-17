# Module: hotel-inventory

Rooms, prices and rules per night for each property (plan Stage 04) and the **only** code allowed to take
or give back rooms (`docs/plan/05-inventory-and-no-double-booking.md` — read it before changing anything here).

| | |
| --- | --- |
| **Collections** | `inv_cancellation_policies`, `inv_rate_plans`, `inv_inventory_days` (validator), `inv_rate_days`, `inv_holds`, `inv_change_log` |
| **Tenant** | `hotelOrgId` (tenant guard on); always read through the property (`hotel-catalog` `loadOwned`, so property limits apply) |
| **Public interface** | `index.js` only |
| **Permissions** | `hotel-inventory.calendar.read / manage` (hotel), `hotel-inventory.admin.read / override` (MusafirBaba) |
| **Events** | `hotel-inventory.inventory.changed`, `hotel-inventory.hold.expired` |

## Rules that never change without an ADR

- Rooms are taken only by one conditional update per night that records the hold id (`$expr` + `$ne`),
  `modifiedCount` is checked, taken nights are given back on failure. No transactions, no change streams,
  no TTL index on holds. Never turn on global `sanitizeFilter`.
- The collection validator on `inv_inventory_days` rejects `booked + held > total`, negative counts, and counts
  that don't match their owners (`holds[]`, `bookings[]`).
- Hold / confirm / release / return are service methods for `hotel-booking` only — never HTTP endpoints.
- Prices are **tax-exclusive**, integer paise. Nights are `[checkIn, checkOut)` as `'YYYY-MM-DD'` strings;
  "today" and "past" use the property's own time zone.
- A new night starts with **0 rooms** — nothing is sellable until the hotel sets its allotment.
