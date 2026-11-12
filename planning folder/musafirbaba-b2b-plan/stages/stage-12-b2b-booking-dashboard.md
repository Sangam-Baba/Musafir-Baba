# Stage 12 — B2B Dashboard: Search, Booking & Bookings Management (end of Phase B core)

| | |
| --- | --- |
| **Phase** | B — B2B clients |
| **Duration** | ~3 weeks |
| **Depends on** | Stages 06, 08, 09 (engine, search, after-booking), 10, 11 |
| **Modules** | `hotel-search`, `orders`, `hotel-booking`, `pricing` (client markups), `documents`, `metering` (usage counting), `reporting` |
| **Apps** | Business area `/client` (search, checkout, My Bookings, usage), `admin` (offline bookings, client usage) |
| **Closes** | D3 (billable queries — decided) |

## 1. Goal

B2B clients search the **same hotels with live availability and their own B2B prices**, book with wallet, credit or PayU through the **same engine** as the website (no double booking across channels), and manage all their bookings from the dashboard. Every billable query is **counted per client** from now on (billing switches on in Stage 13).

## 2. Scope

**In:** dashboard search/results/hotel detail with B2B prices, client markups ("my selling price"), wallet/credit payment strategy in the engine, client-branded vouchers, My Bookings (product tabs, filters, export), client cancellations with wallet refunds, client amendment tickets, offline bookings by admin on behalf of clients, usage counting pipeline + usage screens (client and admin), safety limits per client org.
**Out:** plan billing and quotas enforcement (Stage 13), API keys and webhooks (Stage 14).

## 3. Work breakdown

1. **Dashboard search UI**: search bar, results list + map, filters, sort, hotel detail, room cards showing **B2B price, taxes and total**, "my selling price" toggle, cancellation summary, price check before checkout — calling the Stage 06 search API with `channel = B2B_PORTAL`. Only properties with `visibility.b2b` (and the client's category, if restricted).
2. **Real time**: dashboard joins `availability:property:{id}` (`useRealtime`); automatic refreshes send `X-MB-Refresh: realtime` and are **not billed** — honoured only for business-area sessions (never API keys), only for offers/price-check, max 1 per property per user per 60 s.
3. **Client markups** (`prc_client_markups`): client owner sets its own markup (percent/fixed, by city/star/hotel) for display and client-branded vouchers; MusafirBaba never charges it.
4. **Wallet / credit payment strategy** (registered into the Stage 08 engine, no engine changes): one transaction `holdFunds` → `confirmHold` (rooms booked) → `captureHold` → journal (wallet → hotel payable + margin revenue + GST) → order and booking `CONFIRMED`. Insufficient balance → rooms released, offer PayU or top-up. PayU path from Stage 08 also available to clients.
5. **Client checkout UI**: guests per room → review with breakdown → wallet (balance shown) / credit / PayU → confirmation with downloads; customer reference field.
6. **Client-branded voucher** (`VOUCHER_CLIENT_BRANDED`): client logo/contact or unbranded; **never shows net/margin**; optionally the client's selling price. Guest emails for B2B bookings: client setting, default off.
7. **My Bookings** (client): tabs Hotels | Flights | Packages | Transfers | Activities (others "coming soon"); filters: booking ID, booking/check-in/check-out dates, customer name, destination, booking status, payment status, branch, created by; CSV export (async, permission, expiring link). Uses the Stage 09 read model.
8. **Client cancellations & refunds**: same cancellation flow as Stage 09; refund **to wallet** (instant) for wallet/credit bookings, to source for PayU bookings.
9. **Client amendment tickets**: Stage 09 ticket module opened to client users (same types, SLA, email threads); price differences via wallet adjustment (maker–checker).
10. **Offline bookings by admin**: admin books on behalf of a client (phone/email request) through the same engine (`channel = ADMIN`, `createdBy = admin`) using the client's wallet/credit; same inventory rules, documents; audited; client notified.
11. **Usage counting** (D3): gateway usage recorder fills the Stage 06 hook — after response, only billable routes (`hotel.search`, `hotel.offers`, `hotel.pricecheck`, `hotel.booking`) and successful statuses: Redis `INCR usage:{org}:{metric}:{yyyymm}` + Redis stream → worker batches into `mtr_usage_events` and `mtr_usage_daily`. Honoured `X-MB-Refresh` calls recorded as `billable: false`. Website traffic is recorded under the platform org for analytics only.
12. **Usage screens**: client dashboard (queries used this month by endpoint, by user, daily chart; API split appears from Stage 14) and admin (same per client + all-clients table sorted by usage, filterable, exportable). Both read `mtr_usage_daily`.
13. **Safety limits**: max 20 concurrent held orders per client org; max order value without admin approval (config); velocity alerts.

## 4. Collections

`prc_client_markups`, `mtr_usage_events` (`orgId`, `userId?`, `apiKeyId?`, `channel`, `metric`, `billable`, `statusCode`, `requestId`, `at`; index `{orgId, at}`; archive monthly), `mtr_usage_daily` (`orgId`, `metric`, `day`, `count`), `sub_entitlements` (seeded default).

## 5. API

Client: search/offers/price-check (Stage 06), `POST /orders` + `POST /orders/{ref}/payments` with `WALLET`/`CREDIT`, `GET /bookings/hotels` (client scope + filters), `POST /exports/bookings`, `GET/PUT /markups`, `GET /usage`.
Admin: `/admin/offline-bookings`, `/admin/usage`, `/admin/usage/{clientOrgId}`.

## 6. Rules & edge cases

- **Search is advisory, booking is authoritative.** Website, dashboard and admin bookings share one inventory — the race suite now includes all three channels.
- Branch-limited users see only their branches' bookings; exports respect branch limits and contain no restricted data.
- Counted queries (D3): 1 each by default (weights editable in Stage 13); autocomplete/content free but rate-limited; counted on the dashboard now and on the API from Stage 14, into one pool per client.

## 7. Security

| Threat | Control | Test |
| --- | --- | --- |
| Cross-client price leak via cache | Pricing context hash (client category/org) in keys | Two-client test |
| Net rate / margin leak | DTO per permission; branded voucher has no net/margin | Contract + PDF tests |
| Seeing other clients' bookings | Ownership + branch checks | Isolation tests |
| Billing bypass via refresh header | Ignored for API keys; per-user/property limit | Test |
| Offline booking abuse | Admin permission + audit + client notified | Test |
| Export data theft | Permission, audit, 1 h link expiry, row caps | Tests |

## 8. Mandatory tests

Mixed-channel last-room race (website + dashboard + admin → 1 winner); wallet path ledger postings match the expected table; insufficient balance releases rooms; wallet refund on cancel; client-branded voucher contains no net/margin; usage counting (N billable calls → N events after flush; failures not counted; refresh-header rules); My Bookings < 300 ms with any filters on staging data.

## 9. Definition of Done

- [ ] Same property shows on website (website price) and dashboard (B2B price) with identical availability
- [ ] Client agent books via wallet in < 2 s p95; credit-line booking works; PayU works for clients too
- [ ] Client finds, cancels (refund to wallet) and amends bookings; exports work
- [ ] Admin creates an offline booking for a client
- [ ] Each client's usage visible to the client and to admin with identical numbers
- [ ] Pilot 2 checklist (§10) complete (after Stage 13 if billing is part of the pilot)

## 10. Pilot 2 checklist — B2B clients (2–3 weeks)

- [ ] 5–10 friendly clients approved, wallets funded or credit lines set
- [ ] Mixed-channel race suite and invariant checker green nightly
- [ ] Ops trained: client KYC, offline bookings, wallet approvals, client amendments
- [ ] Ask pilot clients about plan pricing and per-query billing (feeds D3/D7 before billing goes live)
- [ ] Note which clients want API integration (they get keys in Stage 14)

## 11. AI editor prompt

```
Read: AGENTS.md, 10-coding-standards.md, 05-inventory-and-no-double-booking.md, stage-08 (engine), stage-11 (wallet), this stage §3.4 & §3.11.
Task: wallet/credit payment strategy registered into the orders engine + usage recorder (INCR + XADD after response) with worker batching.
Constraints: no changes to orders engine core; strategy via the registry; metering in src/core/http + modules/metering.
Tests first: wallet happy path; insufficient balance → rooms released; mixed-channel last-room race → 1 winner; N billable calls → N rows; refresh header ignored for API keys.
```
