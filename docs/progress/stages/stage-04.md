# Stage 04 — Inventory & rates calendar · Progress

> Task list from `docs/plan/stages/stage-04-inventory-rates.md` §3, split so each task fits one reviewable change. Rules and status values: `docs/progress/README.md`. Contract: `docs/plan/05-inventory-and-no-double-booking.md`.

| | |
| --- | --- |
| **Status** | IN_PROGRESS |
| **Phase · Track** | A · hotels |
| **Owner(s)** | |
| **Started** | 2026-11-17 |
| **Finished** | — |
| **Plan file** | `docs/plan/stages/stage-04-inventory-rates.md` |
| **Depends on** | Stage 03 (awaiting owner sign-off) |
| **Modules** | `hotel-inventory` (new) · reads `hotel-catalog` (properties, room types, meal plans) through its public interface |

## Defaults used for this stage (owner can change any of them)

| Topic | Default |
| --- | --- |
| Allotment model (D12) | **Allotment**: per night the hotel gives MusafirBaba a number of rooms (`total`) to sell; it must not sell those elsewhere (contract — L4). Channel managers later (Phase C) |
| Calendar window | 365 days ahead, extended nightly. A new night starts with **0 rooms**, so nothing is sellable until the hotel sets its rooms |
| Prices | Rupees in the screens, stored as integer paise, **tax-exclusive** (GST comes in Stage 05) |
| Timers | Hold 15 min, one extension of +10 min, sweeper every 30 s (plan `05-…` §6) |
| Changes to existing code | None to Stage 00–03 behaviour: inventory reads properties / room types through `hotel-catalog`'s public interface; nights are created by the inventory module itself (when the calendar is opened or edited, and by the nightly job) — no new event in `hotel-catalog` |
| CSV import, calendar grid | No new package (own CSV reader; own windowed grid) |

## Tasks

| ID | Task | Plan ref | Status | Owner | PR | Tests | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S04-T01 | Stage setup: `hotel-inventory` module skeleton (permissions, events, README), permission catalogue + role matrix, D12 recorded | §3 | DONE | AI (Claude) | | matrix ✅ | Module from the generator with the sample removed. Permissions: hotel `hotel-inventory.calendar.read / manage` (Owner; Manager limited to assigned properties; not Front Desk, not clients); MusafirBaba `hotel-inventory.admin.read` (`**.read` roles: Hotels team, Support), `hotel-inventory.admin.override` (Super Admin; sensitive). Events `inventory.changed`, `hold.expired`. Matrix test extended. D12 (allotment) recorded |
| S04-T02 | Cancellation policies (`inv_cancellation_policies`): reusable rules (hours before check-in → % / nights / fixed), no-show penalty, non-refundable; summary text | §3.2 | DONE | AI (Claude) | | 8 ✅ | Rules in `domain/cancellation.js` (pure): up to 5 rules "cancelled less than N hours before check-in → % of the booking / N nights / fixed ₹", no-show penalty, or non-refundable; all problems at once (`POLICY_INVALID`: repeated hours, ranges, rules on a non-refundable policy, a cheaper penalty closer to check-in); the summary sentence guests read; `penaltyAt` (which penalty applies at a moment — for Stage 08). `inv_cancellation_policies` (migration `0027`, a name once per property among active ones). `GET/POST /hotel/properties/:id/cancellation-policies`, `PUT …/:policyId` (`If-Match`, 428 / 412), `DELETE …` archives (never deleted; refused while a rate plan uses it — wired in S04-T03). **Per property** rather than per hotel company (plan §5 said `/hotel/cancellation-policies`) so Managers limited to some properties only see theirs. ≤ 20 per property; nothing on an archived property. Shared Stage 04 test setup `tests/b2b/helpers/inventory-app.js` |
| S04-T03 | Rate plans (`inv_rate_plans`): room types covered, meal plan, policy, pricing model (per room / per occupancy), min / max advance days, status; derived plans (e.g. CP = EP + ₹500) | §3.1 | DONE | AI (Claude) | | 9 ✅ | Rules in `domain/rate-plan.js` (pure, all problems at once — `RATE_PLAN_INVALID`): room types of this property (active, from hotel-catalog's room type service), meal plan from the master list, an active policy of the property, booking window min ≤ max days ahead; a **derived** plan follows one plan (one level only, same pricing model, only the parent's room types, + amount or −90…+500 %), `derivedPrice` (never below ₹1) for S04-T05. A plan others follow keeps their pricing model and room types and can't be archived before them (`RATE_PLAN_HAS_DERIVED`). `inv_rate_plans` (migration `0028`; unique name per property — archiving frees it; indexes for followers and for policy use). `GET/POST /hotel/properties/:id/rate-plans`, `PUT …/:ratePlanId` (`If-Match`; `status` ACTIVE / INACTIVE), `DELETE …` archives. A policy used by a plan can't be archived (`POLICY_IN_USE`). ≤ 30 per property. Note: room types are read through hotel-catalog's own service, so the reader also needs `hotel-catalog.property.read` (Owner and Manager have it) |
| S04-T04 | Inventory days (`inv_inventory_days` + validator by migration): created for the window, nightly extension, never deleted; owner arrays `holds[]` / `bookings[]` | §3.3, `05-…` §3 | DONE | AI (Claude) | | 10 ✅ | `inv_inventory_days` exactly as `05-…` §3 (total / booked / held / stopSell, `holds[]` with hold id + expiry, `bookings[]`). Migration `0029`: **collection validator** (strict, error) — booked + held ≤ total, no negatives, held = Σ holds, booked = Σ bookings — tested with raw driver writes (a "buggy script" can't oversell: the second hold on the last room is refused); unique {roomTypeId, date}; {hotelOrgId, propertyId, date}; {propertyId, date}; hold expiry (partial). `ensureNights` creates missing nights with **0 rooms** (`$setOnInsert` upserts — repeat-safe, 6 processes at once still make each night once, existing nights never overwritten). Nightly-ish schedule `inventory-calendar-window` (every 6 h, lease-locked) keeps every room type the module knows 365 (+1 for time zones) days ahead — newest night per room type read from the index, no full scan; no hotel-catalog event needed (nights first appear when the calendar is opened / edited — S04-T05 / T06). Stay dates `domain/dates.js`: real dates only, nights = [from, to), "today" in the property's time zone |
| S04-T05 | Rate days (`inv_rate_days`): prices by occupancy, min / max stay, closed to arrival / departure, stop-sell; calendar read `GET /hotel/properties/:id/calendar` | §3.4, §5 | DONE | AI (Claude) | | 7 ✅ | `inv_rate_days` (migration `0030`; unique plan × room type × date): tax-exclusive paise prices — one per room (`guests: 0`) or one per number of guests 1 … room maximum; min / max stay, closed to arrival / departure, stop-sell. Rules in `domain/rate-day.js`: **derived plans' prices are worked out when read** from the parent's (plan said "expanded when saved" — reading them live means they can never drift); for their rules the stricter of own and parent's applies (a parent stop-sell closes the breakfast plan too); no price = not sellable. `domain/calendar.js` builds the grid: per room type its rooms per night (total / booked / held / available / stop-sell) and per plan selling it its nights; past nights (property's date) and beyond the 365-day window read-only. `GET /hotel/properties/:id/calendar?from&to` (≤ 92 nights, `private, no-store`) — opening it creates the window's missing nights (0 rooms) for the active room types. Room types for rate plans and the calendar come from one lookup (id, name, max guests) |
| S04-T06 | Calendar bulk edit `PUT /hotel/properties/:id/calendar` (ranges + weekdays, rooms / prices / rules, guarded allotment reduction listing refused dates, past dates read-only, preview, > 50 % price warning, undo last bulk change, idempotent) + ARI change log (`inv_change_log`) | §3.5, §3.6, §3.12 | DONE | AI (Claude) | | 8 ✅ | `PUT /hotel/properties/:id/calendar`: range (≤ 366 nights) + optional weekdays; `rooms[]` (total, stop-sell per room type) and `rates[]` (prices per number of guests, min / max stay, closed to arrival / departure, stop-sell per plan × room type). Past nights (property's date) and beyond the window skipped and listed. **Rooms**: one guarded `updateMany` (`total ≥ booked + held`, `05-…` §10) — refused nights listed with booked / held. **Prices / rules**: one upsert per night merged inside MongoDB (pipeline update) — prices for other guests and simultaneous edits never lost; derived plans take rules only (`PRICES_COME_FROM_PARENT`). `preview: true` writes nothing; a price moving > 50 % → 409 `BIG_PRICE_CHANGE` with the list unless `confirmBigChange`; ≤ 20 000 cells; 60 changes / 10 min per person. **Change log** `inv_change_log` (migration `0031`): who, when, nights, request, values before; `month` for archiving; unique request id per property (repeat → first result; a half-applied one → `CALENDAR_EDIT_IN_PROGRESS`). `POST …/calendar/undo {changeId}` — only the latest change, rooms restored with the same guard (nights booked meanwhile listed). `GET …/calendar/changes` (recent 30). Archiving old log months: with the reporting / archiving work (Stage 15) |
| S04-T07 | Availability query `checkAvailability(propertyIds, stay, rooms)` with rate / restriction checks; property test against a naive reference | §3.8 | TODO | | | | |
| S04-T08 | Inventory primitives: `inv_holds`; `holdRooms`, `confirmHold`, `releaseHold`, `extendHold`, `returnRooms` (service only, idempotent, no transactions); concurrency + crash-injection tests | §3.9, `05-…` §5 | TODO | | | | |
| S04-T09 | Sweeper + reconciler rules (every 30 s) and invariant check (every 10 min); overdue-hold alert | §3.10, `05-…` §5.4 | TODO | | | | |
| S04-T10 | Availability signals: `inventory.changed` → `availability:changed` for `availability:property:{id}` (debounced per property) | §3.11, `05-…` §8 | TODO | | | | |
| S04-T11 | CSV import: template, validation report, dry run, apply (≤ 50k rows) `POST /hotel/calendar-imports` | §3.7 | TODO | | | | |
| S04-T12 | Admin: read-only calendar for any property, override with reason (audited) — API + admin page | §3.13 | TODO | | | | |
| S04-T13 | Business area: cancellation policies, rate plans and the calendar screen (grid, ranges + weekdays, bulk edit with preview, undo, live updates) | §3.5 | TODO | | | | |
| S04-T14 | Mandatory test suite: availability vs reference, 100 parallel holds on 3 rooms, all-or-nothing, release idempotent, sweeper, validator, allotment reduction below booked; isolation | §9 | TODO | | | | |

Status: `TODO` · `DOING` · `REVIEW` · `DONE` · `BLOCKED` · `DEFERRED` (needs a `DEF-…` row) · `DROPPED` (reason in Notes)

## Definition of Done (copied from the stage file)

- [ ] Hotel sets 2 room types × 2 rate plans with policies; loads 90 days via calendar and CSV
- [ ] Availability correct in all edge cases
- [ ] Hold primitives pass the concurrency suite
- [ ] Calendar shows a test booking appear live

## Mandatory tests (copied from the stage file)

- [ ] Availability property test vs naive reference (random calendars/restrictions/stays)
- [ ] Concurrency: 100 parallel `holdRooms` on 3 rooms → exactly 3 succeed; counts consistent
- [ ] Multi-night all-or-nothing; release idempotent; sweeper returns rooms; validator rejects `booked + held > total`
- [ ] Allotment reduction below booked rejected with dates listed

## Left out on purpose in this stage

- (none yet)
