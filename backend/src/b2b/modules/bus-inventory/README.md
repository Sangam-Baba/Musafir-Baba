# Module: bus-inventory

Trips and trip seats for the bus service (plan `docs/plan/stages/stage-18-bus-service.md` B3–B4, §5) and — from B4 —
the **only** code allowed to take or give back bus seats.

| | |
| --- | --- |
| Collections | `bus_trips` (one per schedule + departure date, unique), `bus_trip_seats` (one per seat of a trip, unique trip + seat), `bus_seat_claims` (holds and counter blocks — the state document of each seat-taking flow) |
| Depends on | `bus-catalog` (index only): route rules (`tripDates`, `instantOf`), and the trip sources passed in by the wiring |
| Jobs | seat sweeper every minute (expired holds, claims stuck in TAKING / RELEASING); trip job every 6 h while `B2B_BUS_ENABLED=true` (`routes/background-wiring.js`) — makes trips 90 days ahead, finishes half-made ones, cancels unsold trips of ended schedules |

## Rules

- Trips are inserted only when missing (`$setOnInsert`, unique schedule + date) — the job is repeat-safe.
- Seats are inserted unordered (duplicates ignored), then `seatsReady: true`; a crash in between is finished next run.
- A trip keeps the stops, bus and layout it was made with. A later layout change on the bus affects only new trips;
  moving existing trips to another bus (seat re-mapping) comes in B4.
- Ending a schedule cancels its trips from the end day **only if no seat is taken**; sold trips stay for ops.
- B4 / B6: take seats with one conditional update (`taken: { $bitsAllClear: mask }` → `$bit: { taken: { or: mask } }`,
  recording the entry in the same update), then re-check the trip is still `SCHEDULED` and give the seats back if not.
- Leg masks stay positive int32 (routes have at most 31 stops) — `$bit` refuses doubles.

## Seat claims (B4)

- `seat-steps.js` is the only code that changes `taken`: take (one conditional update: legs free, claim not already on
  the seat, ladies rule → `$bit or` + push entry), give back (`$bit and ~mask` + pull, only while the entry is there),
  confirm (HOLD entries → BOOKING). Several seats: one by one, give back on the first failure.
- `claims.service.js`: claim document first (TAKING) → seats → trip checked again → ACTIVE; release ACTIVE / CONFIRMED →
  RELEASING → RELEASED; the sweeper finishes middle statuses (expired holds after 15 min, TAKING older than 2 min).
- Invariant (tested under 500 concurrent buyers): every seat's `taken` = OR of its entries' masks, entries never overlap.
