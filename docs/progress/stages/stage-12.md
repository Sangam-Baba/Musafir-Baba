# Stage 12 — B2B dashboard · Progress

> Split in two by D36 (19 Nov 2026). **Part A — done 19 Nov 2026** (before Stage 07): the dashboard without booking. **Part B** (after Stage 11): booking with wallet / credit / PayU, My Bookings, cancellations, amendments, offline bookings, usage counting — its tasks are added here when it starts. Plan: `docs/plan/stages/stage-12-b2b-booking-dashboard.md`. Rules: `docs/progress/README.md`.

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
| S12-T03 | Dashboard search: `/business/hotels` (search bar with B2B-visible destinations, results with B2B prices and selling price, filters, sort, map) | §3.1 | DONE | AI (Claude) | | tsc ✅ | `/business/hotels` (menu **Search Hotels**, for roles with `hotel-search.search.use`): the website search pieces reused with two new options — who calls (`businessCall`: the signed-in member, so the API answers with **B2B prices, the client's category's hotels and B2B-visible destinations**) and where links go (`/business/hotels/…`). Results show B2B price per night and total incl. GST and, with the **My selling price** toggle, the client's selling price per night. Filters, sort, map, more results as on the website. Website pages unchanged in behaviour (defaults) |
| S12-T04 | Dashboard hotel page: content, rooms with B2B price + GST breakdown + total, selling-price toggle, cancellation terms, live updates, price check → \"call us to book\" | §3.1, §3.2 | DONE | AI (Claude) | | tsc ✅ | `/business/hotels/[slug]`: the hotel content (now a shared `HotelContent` component — the website hotel page uses it too, same output) and rooms for the stay with the B2B view — total incl. GST, **your price + CGST / SGST or IGST**, GST rate, **My selling price** toggle, cancellation sentence, rooms left; **live** updates through the member's own stream token (renewed when refused, never during view-as); **Reserve** = price check → "call us to book this room for your customer" (online booking = part B). Usage-billing refresh header (§3.2) comes with usage counting in part B |
| S12-T05 | My markup page (Owner changes it; agents see it) + menu entries and client home quick links | §3.3 | DONE | AI (Claude) | | tsc ✅ | `/business/markup` (menu **My Markup**, `pricing.markup.read`): show selling price on / off, default markup (% of my price per room-night, ₹ per room-night or ₹ per booking), up to 20 exceptions by city / star rating (hotel-specific exceptions stay in the API), saved on the loaded version; Owner edits (`pricing.markup.manage`), agents read; read-only during view-as. Menu entries are permission-driven, so hotels never see them. Verified client's home links to Search hotels and My markup |
| S12-T06 | Part A mandatory tests: same availability website vs dashboard with different prices, two clients' markups isolated, selling price never charged, no hotel rate or margin in client responses | §8 | DONE | AI (Claude) | | 2 ✅ | `stage-12a-mandatory.test.js`: the same property on the website and the dashboard — identical room types / plans / rooms left, website ₹1,995 vs B2B ₹1,785 for the stay, a calendar change shows on both at once; search, offers and price check for a B2B client (with a markup) carry no hotel rate, margin, rule or hotel company. Header maps the rest (markup isolation and never charged, category prices / hotels, live rooms) |
| S12-T07 | Booking requests — setup (D37): module `hotel-booking` (permissions, events, README), role matrix | D37 | DONE | AI (Claude) | | matrix ✅ | Module `hotel-booking` (only booking requests for now; the engine comes with Stage 08): permissions `hotel-booking.request.create / read` (clients — Owner, Admin, Booking Agent create; Accountant, Viewer read) and `hotel-booking.admin.read / handle` (Operations handles; Finance, Hotels team, Support read), events submitted / confirmed / declined / cancelled, README with the fixed rule "never takes rooms, never moves money". D37 in `09-…` |
| S12-T08 | Booking requests — client: `POST /booking-requests` (price token checked again, OK only), list / detail, cancel; `hbk_booking_requests` | D37 | DONE | AI (Claude) | | 3 ✅ | `POST /booking-requests` (needs `hotel-booking.request.create` and search access; through the search gateway so the client's channel / category price applies): the price token is **checked again** — `SOLD_OUT` refused, a changed price refused with **409 `PRICE_CHANGED`** + the new price and a fresh token, only an unchanged price is stored; names from the catalogue / inventory; the client's own price view stored (never hotel rate / margin); the same token twice → the first request (unique per client + token hash). `GET /booking-requests` (`?status`; agents limited to their own work see only theirs), `GET /:id`, `POST /:id/cancel` (`If-Match`). `hbk_booking_requests` (migration `0042`, tenant `clientOrgId`, reference `BR-XXXX-XXXX`). **No rooms taken** (tested) |
| S12-T09 | Booking requests — admin: queue, take, confirm (hotel confirmation no.) / decline with reason; client notified (bell + email) | D37 | DONE | AI (Claude) | | 2 ✅ | `GET /admin/booking-requests` (open ones oldest first, or `?status`) with the customer's contact, `GET /:id`, `POST /:id/take`, `/confirm` (hotel confirmation number, note), `/decline` (reason required) — `If-Match`, one conditional update with history + event (relayed). Client bell + email to owners on confirmed / declined (`booking-request.confirmed / declined` templates); admin queue pushes on every change. Staff names stay inside MusafirBaba (client history has no `by`) |
| S12-T10 | Booking requests — screens: "Request booking" on the dashboard hotel page, **Booking requests** page, admin tab | D37 | TODO | | | | |
| S12-T11 | Booking requests — tests: OK price only, isolation between clients, status flow, no rooms taken, nothing private stored or shown | D37 | DONE | AI (Claude) | | 5 ✅ | `booking-requests.test.js`: stored with stay / customer / own quoted price, nothing private, same token → same request, **rooms left unchanged**; changed price → 409 with the new one, sold out refused; website visitors 401, hotels 403, another client sees nothing (404), unscoped reads refused; take → confirm with hotel number, client sees it, history without staff names, event stored; decline needs a reason, closed requests can't change, client cancels an open one (412 on a stale version) |

Status: `TODO` · `DOING` · `REVIEW` · `DONE` · `BLOCKED` · `DEFERRED` (needs a `DEF-…` row) · `DROPPED` (reason in Notes)

## Definition of Done (copied from the stage file)

- [x] Same property shows on website (website price) and dashboard (B2B price) with identical availability (part A — stage-12a-mandatory)
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
