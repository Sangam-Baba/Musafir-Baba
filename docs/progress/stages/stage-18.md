# Stage 18 — Bus service · Progress

> Task list from `docs/plan/stages/stage-18-bus-service.md` (owner approved 25 Nov 2026). Sub-stages B1–B8; each is split into tasks when it starts. Rules and status values: `docs/progress/README.md`.

| | |
| --- | --- |
| **Status** | IN_PROGRESS |
| **Phase · Track** | D · bus |
| **Owner(s)** | |
| **Started** | 2026-11-25 |
| **Finished** | — |
| **Plan file** | `docs/plan/stages/stage-18-bus-service.md` |
| **Depends on** | Stages 00–16 |
| **Modules** | `bus-catalog`, `bus-inventory`, `bus-booking` (new); additive changes to organizations, access, KYC, core permissions |

## Defaults used for this stage

| Topic | Default |
| --- | --- |
| Switch | `B2B_BUS_ENABLED` — off: operator registration answers "not enabled" (503); nothing else changes. Selling has its own switch later (`B2B_BUS_SELLING_ENABLED`) |
| Org type | `BUS_OPERATOR`, reference `MBBO-…`, roles **Owner** (everything), **Manager** (buses, routes, trips, bookings), **Counter staff** (block / release seats, read bookings) |
| KYC | The existing engine; operator details = the hotel form with "number of buses" instead of properties; documents: GST certificate (or below-threshold declaration), PAN, business registration, cancelled cheque, signed operator agreement. Per-bus papers come in B2 |
| Built and tried locally first | Nothing is pushed until the owner checks it |

## Tasks

| ID | Task | Plan ref | Status | Owner | PR | Tests | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S18-T01 | Setup: task list, defaults, switch | §6 | DONE | AI (Claude) | | — | |
| S18-T02 | B1 — org type `BUS_OPERATOR`: core list, organizations (reference `MBBO`), access system roles (Owner / Manager / Counter staff), KYC + audit permissions, tenant isolation | §6 B1, §8 | DONE | AI (Claude) | | bus-operator-org.test.js (+ full suite) | `BUS_OPERATOR` added to the company types (core permissions, Actor type, organisation / KYC application / custom role fields, organisations / access / KYC / audit permission lists, admin filters); reference `MBBO-…`; owner role `bus.owner`; system roles Owner (`**`), Manager (bus-catalog / inventory / booking), Counter staff (seat block, bookings read) — they resolve only to operator permissions; hotels and clients unchanged. No database migration needed (no stored type rules) |
| S18-T03 | B1 — operator registration and KYC: details (fleet size), document set, `POST /registrations/operator` behind `B2B_BUS_ENABLED`, KYC details form for operators, admin verification shows operators | §6 B1 | DONE | AI (Claude) | | bus-operator-registration.test.js, bus-operator-switch.test.js, route-permissions.test.js | operator details = hotel checks + `fleetSize` (1–1000; property count refused); operator document set (GST certificate / declaration, PAN, business registration, cancelled cheque, signed operator agreement); `POST /registrations/operator` (503 `BUS_NOT_ENABLED` while `B2B_BUS_ENABLED` is off; same IP limit and browser header as hotels); `PUT /kyc` picks the form by company type (hotels and clients unchanged); the admin verification queue filters and shows operators; verification email says "bus company" |
| S18-T04 | B1 — screens: "I run buses" on registration (behind `NEXT_PUBLIC_FEATURE_BUS`), operator menu, admin labels | §6 B1 | DONE | AI (Claude) | | website tsc + next build | registration: "Bus operator" choice shown only with `NEXT_PUBLIC_FEATURE_BUS=true`, a "Number of buses" step, posts to `/registrations/operator`; Verification page: the operator form with "Number of buses" (hotels keep properties, clients nothing); admin verification queue labels "Bus operator". Operator menu entries (My Buses, Routes, Trips…) arrive with B2–B4 |
| S18-T05 | B2 — buses, seat layouts, papers, approval | §6 B2 | DONE | AI (Claude) | | bus-catalog.test.js, bus-catalog-api.test.js, bus-operator-switch.test.js, route-permissions.test.js (+ full suite), website tsc + next build | seat layouts (`bus_layouts`): 4 common templates, editor (add / remove seats, ladies seats, seat types, renumber, rows), every problem shown at once, locked once a bus using it is approved or waiting (copy to change); buses (`bus_vehicles`, migration 0083): registration number unique across operators, AC / kind / amenities, four papers (RC, permit, insurance, fitness) uploaded as `bus-paper` files with number and expiry; send for approval needs a layout and four valid papers; staff review in admin Partners → Buses (papers, seat map, approve / ask for changes / suspend / reinstate; tab shown only with `NEXT_PUBLIC_FEATURE_BUS`); changing the layout of an approved bus sends it back; expired paper → not sellable; reminders 30 / 7 days and on expiry (bell + email, every 6 h); operator screens My Buses, bus page, Seat layouts. Everything answers 503 `BUS_NOT_ENABLED` while `B2B_BUS_ENABLED` is off. Photos → DEF-043 (S18-T11) |
| S18-T06 | B3 — routes, stops, schedules, trips | §6 B3 | TODO | | | | |
| S18-T07 | B4 — seat inventory (leg masks), blocks, fares | §6 B4, §5 | TODO | | | | |
| S18-T08 | B5 — pricing, GST, search, seat map | §6 B5 | TODO | | | | |
| S18-T09 | B6 — booking engine, e-ticket, manifest | §6 B6 | TODO | | | | |
| S18-T10 | B7 — cancellations, trip problems, payouts | §6 B7 | TODO | | | | |
| S18-T11 | B8 — reviews, website, B2B API, demo, launch | §6 B8 | TODO | | | | |
