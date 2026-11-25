# Module: bus-booking

The buyer side of the bus service (plan `docs/plan/stages/stage-18-bus-service.md` B5–B6): search, seat map, prices,
and (B6) booking.

| | |
| --- | --- |
| **Collections** | none yet (B6 adds bookings) |
| **Depends on** | `bus-catalog`, `bus-inventory`, `pricing` (index only); operator names / status and city states are passed in by the wiring |
| **Permissions** | `bus-booking.search.use` (B2B clients); website visitors search without signing in |

## Rules

- Offered only when: trip scheduled, seats ready, online sale open, route approved, bus approved with valid papers today,
  operator company active, and a fare for the seat class.
- Price = net fare → margin (a BUS margin rule; hotel rules never match buses) → GST from a `BUS_TRANSPORT` tax rule.
  No starter GST rate is seeded (CA to confirm) — without an approved rule nothing is offered. Place of supply = the
  boarding stop's state. Website sees the price with GST; clients also the GST lines; never the net fare or margin.
- Search: a boarding point in city A reached on the date (Indian time, not passed) and a later dropping point in city B;
  part routes count; buses that left the day before can pick up on the date.
- B6 will lock the price on the seat hold (the breakdown is stored with the hold) instead of a hotel-style price token.
