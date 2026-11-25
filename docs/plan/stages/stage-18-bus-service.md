# Stage 18 — Bus service (operators, buses, seat inventory, booking)

| | |
| --- | --- |
| **Phase** | D — next products |
| **Duration** | ~10–12 weeks for B1–B8 (one developer + AI editor); can ship in two halves (B1–B5 operators can list, B6–B8 selling) |
| **Depends on** | Stages 00–16 (orgs, KYC, files, pricing, orders engine, payments, wallet, documents, notifications, payouts, metering, API) |
| **Modules (new)** | `bus-catalog` (operators' buses, layouts, routes), `bus-inventory` (schedules, trips, seats, blocks), `bus-booking` (the order item, tickets, cancellations, manifests, reviews) |
| **Status** | **Draft — waiting for owner approval.** Nothing is built until approved. |

## 1. Goal

Bus operators onboard themselves like hotels do: register, pass KYC, add their buses (with seat layouts and papers),
routes and schedules, and manage seats and fares. Website customers and B2B clients search buses, pick exact seats on a
seat map and book; operators get alerts and trip manifests; MusafirBaba earns its margin and pays operators weekly.
**The existing website, apps and the vehicle-partner system (MBGO / MBConnect) are not touched** — this is a new,
separate product inside the B2B system, behind its own switch.

## 2. Owner decisions (asked 25 Nov 2026)

| Topic | Decision |
| --- | --- |
| Who books | Website customers (PayU) **and** B2B clients (wallet / credit / API), like hotels |
| Seats | **Exact seat on a seat map** — operator draws each bus layout (seater / sleeper, lower / upper deck, seat numbers) |
| Trips | **Routes with stops + schedules**: boarding / dropping points with times; daily or chosen days; each date is a trip; **part of a route can be booked** and the seat stays free for the rest |
| Existing vehicle system | **Completely separate** — MBGO / MBConnect / `models/partner/*` never imported or changed |
| Money | **Like hotels**: operator sets a **net fare**, MusafirBaba adds **margin** (rules) + **GST**; operator paid the net fare in the weekly payout run after the trip |
| Counter sales | Operator **blocks / books seats in their panel** (counter, staff, maintenance) — sold everywhere at once |
| Buyer gives / gets | Passenger **name, age, gender** per seat; **e-ticket** (page + PDF, emailed — no SMS); operator **trip manifest**; **ladies-only seats** |
| First version extras | **Amenities & photos**, **fares by date** (weekend / festival, set by the operator — no automatic surge), **reviews / ratings** |
| Not in v1 | Live GPS tracking |
| Checks before selling | **Company KYC** (PAN, GST, bank) · **per-bus papers** (RC, permit, insurance, fitness — with expiry; expired → that bus stops selling) · **staff approve each bus and route** before it goes live |
| Passenger cancels | **Operator's own time slabs** (e.g. > 24 h: 10 % fee; 12–24 h: 25 %; < 12 h: no refund); **some seats** can be cancelled |
| Operator cancels / changes a trip | **MusafirBaba ops handle it** — the operator reports it in its panel; ops cancel the bookings with a **full refund** and tell passengers (tools to do it booking by booking, or all of a trip in one action with two people) |

## 3. Who uses it

| Who | Where | Does |
| --- | --- | --- |
| Bus operator (new org type `BUS_OPERATOR`) — roles Owner, Manager, Counter staff | Business area → *My Buses*, *Routes & schedules*, *Trips & seats*, *Bookings*, *Manifests*, *Statement / Payouts* | Registers, KYC, buses + layouts + papers, routes, schedules, fares, blocks seats, sees bookings and manifests, reports trip problems, gets paid |
| Website customer | musafirbaba.com → **Buses** | Searches A → B on a date, picks seats, passengers, boarding / dropping point, pays by PayU, gets e-ticket, cancels, reviews |
| B2B client | Business area → **Search Buses** (+ API) | Same at B2B prices, pays from wallet / credit, own markup, own branding on the ticket |
| MusafirBaba staff | Admin → B2B admin — **Partners** (operator verification, bus & route approval, papers expiring) · **Services** (bus orders, trip problems, fares & margins) · **Control** (payouts, GST, reports) | Approve, handle problems, pay operators |

## 4. How it works (example)

> **Shree Travels** (operator) registers and passes KYC. It adds bus **RJ14 PA 1234** — a 2+1 AC sleeper with 30 berths
> (lower L1–L15, upper U1–U15; L1–L2 ladies only), uploads RC / permit / insurance / fitness (expiry dates), photos and
> amenities (AC, charging, blanket, water). Staff approve the bus.
> It creates route **Delhi → Jaipur** with stops *Delhi Kashmere Gate 22:00 → Gurugram IFFCO Chowk 22:45 → Neemrana
> 00:30 → Jaipur Sindhi Camp 04:30*, and net fares per seat type for each pair (Delhi → Jaipur lower ₹900, upper ₹800;
> Gurugram → Jaipur lower ₹750 …), Friday–Sunday +₹100. Schedule: daily, bus RJ14 PA 1234. Staff approve the route; trips
> for the next 90 days appear.
> A website customer searches Delhi → Jaipur for 12 Dec, sees the trip with **₹900 + margin + GST**, opens the seat map,
> picks L5 and L6, enters two passengers, boarding Kashmere Gate, dropping Sindhi Camp, pays by PayU → seats confirmed,
> e-ticket (PNR **MBB-…**) emailed. Another buyer can still book **Neemrana → Jaipur** on a seat sold only Delhi → Gurugram.
> At the counter Shree sells U3: it blocks U3 in *Trips & seats* — it disappears for every buyer at once.
> On the day the operator downloads the **manifest** for the conductor. After the trip the net fares become payable and
> go out in the weekly payout run. The passenger rates the trip.

## 5. No double booking — how seats are protected

The same guarantee as hotel rooms (`05-inventory-and-no-double-booking.md`), adapted to seats and route legs:

- A route with stops `S0 … Sn` has **legs** `0 … n-1` (S0→S1, S1→S2 …). A booking from stop *a* to stop *b* needs legs
  `a … b-1` — written as a **leg mask** (a number with those bits set; up to 31 legs per route).
- One document per **trip seat** (`bus_trip_seats`: trip, seat, `taken` mask, entries per hold / booking / block).
- Taking a seat is **one conditional update**: only if none of the wanted legs is taken
  (`taken: { $bitsAllClear: mask }`) → set them (`$bit: { taken: { or: mask } }`) and record the hold id in the same
  update. `modifiedCount === 1` or the seat is gone. **No read-then-write, no transactions.**
- Several seats: taken one by one; if one fails, the ones already taken are given back (same as hotel nights).
- Holds last 15 minutes while paying; the sweeper releases expired holds (guarded by hold id) — no TTL indexes.
- Counter blocks use the same update with a block id, so a blocked seat can never also be sold.
- Ladies-only and stop-sold seats are checked in the same filter.
- Mandatory tests: the 500-buyer race for the last seat, part-route races (overlapping and non-overlapping legs on the
  same seat), block vs sale race, crash between seats (give-back), invariants: `taken` = OR of its entries' masks.

## 6. Work breakdown (sub-stages)

| # | Sub-stage | Delivers | Weeks |
| --- | --- | --- | --- |
| **B1** | **Operators & KYC** | Org type `BUS_OPERATOR` with roles (Owner / Manager / Counter staff) and permissions; registration "I run buses"; KYC (PAN, GST, bank — the existing engine with an operator document set); admin verification in **Partners**; operator business-area menu | 1.5 |
| **B2** | **Buses, seat layouts, papers** | Buses (registration number, type AC / non-AC, seater / sleeper / mixed, amenities, photos); **layout editor** (grid per deck, seat numbers, types, ladies-only, aisle / gaps) with layout templates (2+2 seater, 2+1 sleeper …); papers RC / permit / insurance / fitness with expiry (files module); **staff approval**; expiry reminders 30 / 7 days; expired → bus stops selling | 2 |
| **B3** | **Routes, stops, schedules, trips** | Stops master (city + boarding / dropping points); routes with ordered stops and times (incl. next-day arrival); schedules (days, bus, from–to dates); **trips generated 90 days ahead** (like the hotel calendar window); trip seats created from the bus layout; route approval in Partners | 1.5 |
| **B4** | **Seat inventory & fares** | `bus-inventory`: holds / confirm / release / block with leg masks (§5); operator *Trips & seats* screen (seat map per trip, block / release, stop sale, change bus with seat re-mapping); fares per stop pair × seat type, date overrides (weekend / festival), fare change log; invariants | 2 |
| **B5** | **Pricing, GST, search & seat map** | Margin rules get `productType: BUS` and route / operator match fields (data, ADR); GST rule for passenger transport (**CA to confirm**: AC contract carriage vs exempt; SAC); price tokens for chosen seats; search A → B on a date (website + B2B, channel visibility), filters (departure time, AC / sleeper, price, operator rating), seat-map endpoint, boarding / dropping points; usage meters `bus.search`, `bus.seatmap`, `bus.order` | 1.5 |
| **B6** | **Booking engine** | `bus-booking` implements the orders `OrderItemHandler` (hold → pay → confirm, the same engine as hotels — no change to orders / payments core): passengers (name, age, gender; ladies-only check), PNR `MBB-…`, website PayU and B2B wallet / credit / API; **e-ticket** (page + PDF, client branding for B2B) + invoice + receipt (documents); operator alert (bell + email) and **manifest** (page + CSV per trip); My Bookings shows buses (read model is product-agnostic) | 2 |
| **B7** | **After booking & money** | Passenger cancel with the **operator's slabs**, **partial (some seats)**, quote → cancel, refund to wallet / source, credit note; operator **reports a trip problem** → ops queue in **Services**; ops **cancel with full refund** per booking or whole trip (two people); payables per booking after the trip → **weekly payout runs** (supplier-generic payables — small ADR, §8); bus lines in reports and GST register | 1.5 |
| **B8** | **Reviews, website, B2B extras, launch** | Reviews / ratings after the trip (one per booking, moderation, operator reply); website **Buses** pages (new folder, behind `NEXT_PUBLIC_FEATURE_BUS`); B2B API endpoints + webhooks (`bus_booking.confirmed`, `.cancelled`); admin areas updated; demo data (operators, buses, trips, bookings — local); mandatory tests; go-live notes | 1.5 |

## 7. Data (new collections, prefix `bus_` — needs the prefix added, ADR)

`bus_vehicles` (operator, registration no., type, amenities, photos, status, papers + expiry), `bus_layouts` (decks,
seats: number, type, deck, row/col, ladies-only), `bus_stops` (city, point name, address, geo), `bus_routes` (operator,
ordered stops with day offset + time, status), `bus_fares` (route, from/to stop, seat type, net fare, date overrides),
`bus_schedules` (route, bus, weekdays, valid from/to), `bus_trips` (schedule, date, bus, status, departure / arrival
instants), `bus_trip_seats` (trip, seat, `taken` mask, entries), `bus_holds`, `bus_blocks`, `bus_bookings` (order, trip,
seats + legs, passengers, boarding / dropping, PNR, status, price breakdown), `bus_cancellation_policies`,
`bus_trip_problems`, `bus_reviews`. Shared modules reused: orders, payments, wallet, documents, notifications,
pricing, metering, reporting, files, KYC, organizations.

## 8. Changes to existing B2B code (all inside `backend/src/b2b/`; none outside)

| Change | Why | Risk control |
| --- | --- | --- |
| New org type `BUS_OPERATOR` (organizations, access system roles, KYC document set) | Operators are a new kind of company | Additive; hotel / client behaviour unchanged; tenant tests extended |
| Allowed prefix `bus_` (core) | New collections | ADR; guard tests |
| Pricing: rules may match `productType` / route / operator | Bus margins | Existing rules keep matching hotels only (no `productType` = hotel); pricing property tests |
| Payables / payout runs: supplier-generic (`supplierOrgId`, `productType`) alongside today's hotel fields | Pay operators in the same run | Hotel payables unchanged; Stage 15 tests must stay green; ADR |
| Orders: register the `BUS` item handler | Bus bookings | Engine unchanged (the handler interface already exists) |
| Website: new `/buses` pages and a nav entry | Website selling | New folder only + one approved nav edit, behind `NEXT_PUBLIC_FEATURE_BUS` |

Each is its own reviewed change with tests first. **Zero files outside the B2B areas** except the one website nav edit,
which needs the owner's OK (as Stage 06 did for hotels).

## 9. Switches

`B2B_BUS_ENABLED` (operators can register and list; off by default) · `B2B_BUS_SELLING_ENABLED` (search and booking;
off) · `NEXT_PUBLIC_FEATURE_BUS` (website pages; off). All off until the owner turns them on, one at a time; the pilot
list (`B2B_PILOT_ORGS`) applies to B2B buyers.

## 10. Open questions for the CA / lawyer (do not block building)

- **GST on bus tickets**: AC vs non-AC contract / stage carriage — rate, ITC, SAC; is MusafirBaba the principal (sells
  at its price) — same model as hotels? Invoice on behalf of the operator or our own?
- TDS / TCS on operator payouts (194-O / 52 GST TCS) — same as hotels?
- Passenger data (name, age, gender) — DPDP notice wording; no ID numbers collected.
- Operator agreement (net-fare contract, cancellation by operator, liability for missed / cancelled trips).

## 11. Mandatory tests

Seat race (last seat, 500 buyers); part-route races; block vs sale; multi-seat give-back on failure / crash; ladies-only
rule; layout validation (unique seat numbers, decks); papers expiry stops selling; trip generation idempotent; fares by
date; price token tamper; cancellation slabs (property tests) and partial cancel totals; ops full-refund trip cancel;
payables / payout for operators balanced in the ledger; tenant isolation for `BUS_OPERATOR`; website / existing system
untouched (guards).

## 12. Definition of done

- [ ] An operator onboards, adds a bus with layout and papers, a route and schedule; staff approve; trips appear
- [ ] Website customer and B2B client book seats (part-route too); e-ticket; operator gets alert and manifest
- [ ] Counter blocks never oversell; race suites green
- [ ] Cancellations by slabs (partial), ops full-refund for trip problems; operator paid in the payout run; GST register shows bus invoices
- [ ] Reviews after trips; demo data and walkthrough; all switches off by default; guards: nothing outside the B2B areas changed
