# Stage 12 — B2B dashboard · Progress

> Split in two by D36 (19 Nov 2026). **Part A** (now, before Stage 07): the dashboard without booking. **Part B** (after Stage 11): booking with wallet / credit / PayU, My Bookings, cancellations, amendments, offline bookings, usage counting — its tasks are added here when it starts. Plan: `docs/plan/stages/stage-12-b2b-booking-dashboard.md`. Rules: `docs/progress/README.md`.

| | |
| --- | --- |
| **Status** | IN_PROGRESS |
| **Phase · Track** | B · clients |
| **Owner(s)** | |
| **Started** | 2026-11-19 |
| **Finished** | — |
| **Plan file** | `docs/plan/stages/stage-12-b2b-booking-dashboard.md` |
| **Depends on** | Part A: Stages 05, 06, 10 · Part B: Stages 07, 08, 09, 11 |
| **Modules** | Part A: `hotel-search` (client selling price on offers / search), `pricing` (client markups — Stage 05), new client screens in the business area |

## Defaults used for part A (owner can change any of them)

| Topic | Default |
| --- | --- |
| Where | The business area `/business` (D14): new pages **Search hotels** (`/business/hotels`, a hotel's page under it) and **My markup**, shown to people whose role allows them |
| Prices on screen | B2B price, GST lines (CGST / SGST or IGST) and total, per room-night breakdown; never the hotel rate or MusafirBaba's margin |
| My selling price | Worked out on the server from the client's own markup and shown beside the B2B price (toggle). **Display only** — never charged by MusafirBaba, never in price tokens |
| Booking | Not yet: \"Reserve\" checks the price and says \"call us to book\" (online booking = part B) |
| Usage counting | Part B (needs Stage 13's plans to matter); the search gateway's usage hook stays a no-op |

## Tasks

| ID | Task | Plan ref | Status | Owner | PR | Tests | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S12-T01 | Part A setup: task list, defaults, split recorded | §3 | DONE | AI (Claude) | | — | Part A tasks only; part B tasks are added when it starts (after Stage 11). No new permission: search uses `hotel-search.search.use` (Stage 06), markups `pricing.markup.read / manage` (Stage 05) |
| S12-T02 | "My selling price" on offers and search results for B2B callers (client markup — display only; never in tokens or totals) | §3.1, §3.3 | DONE | AI (Claude) | | 2 ✅ + search contracts ✅ | For a signed-in B2B client with a markup switched on, every priced option gets `sellingPricePaise` (Stage 05 `sellingPrice`: markup on the B2B price per room-night, overrides by city / property / stars) — search "from" adds `sellingPricePaise` + `sellingPerNightPaise`, offers add `sellingPricePaise` (null when no markup). **Display only:** totals, price tokens and price checks keep MusafirBaba's price (tested). Website responses unchanged (field absent; Stage 06 contract tests green); each client sees only its own markup. Markup read through pricing's `forClient`, kept 15 s per process |
| S12-T03 | Dashboard search: `/business/hotels` (search bar with B2B-visible destinations, results with B2B prices and selling price, filters, sort, map) | §3.1 | TODO | | | | |
| S12-T04 | Dashboard hotel page: content, rooms with B2B price + GST breakdown + total, selling-price toggle, cancellation terms, live updates, price check → \"call us to book\" | §3.1, §3.2 | TODO | | | | |
| S12-T05 | My markup page (Owner changes it; agents see it) + menu entries and client home quick links | §3.3 | TODO | | | | |
| S12-T06 | Part A mandatory tests: same availability website vs dashboard with different prices, two clients' markups isolated, selling price never charged, no hotel rate or margin in client responses | §8 | TODO | | | | |

Status: `TODO` · `DOING` · `REVIEW` · `DONE` · `BLOCKED` · `DEFERRED` (needs a `DEF-…` row) · `DROPPED` (reason in Notes)

## Definition of Done (copied from the stage file)

- [ ] Same property shows on website (website price) and dashboard (B2B price) with identical availability
- [ ] Client agent books via wallet in < 2 s p95; credit-line booking works; PayU works for clients too (part B)
- [ ] Client finds, cancels (refund to wallet) and amends bookings; exports work (part B)
- [ ] Admin creates an offline booking for a client (part B)
- [ ] Each client's usage visible to the client and to admin with identical numbers (part B)
- [ ] Pilot 2 checklist (§10) complete (after Stage 13 if billing is part of the pilot)

## Mandatory tests (copied from the stage file)

- [ ] Mixed-channel last-room race (website + dashboard + admin → 1 winner) (part B)
- [ ] Wallet path ledger postings match the expected table (part B)
- [ ] Insufficient balance releases rooms (part B)
- [ ] Wallet refund on cancel (part B)
- [ ] Client-branded voucher contains no net/margin (part B)
- [ ] Usage counting (N billable calls → N events after flush; failures not counted; refresh-header rules) (part B)
- [ ] My Bookings < 300 ms with any filters on staging data (part B)
