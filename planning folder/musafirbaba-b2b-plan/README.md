# MusafirBaba B2B Platform + Hotel Booking — Engineering Plan (v2)

Two things, built into the **existing MusafirBaba stack** (Next.js frontend, Node.js/Express backend, MongoDB):

1. **B2B system** — companies ("clients") onboard, pass KYC, get a wallet and a subscription plan billed by usage (API/query hits), manage their own users and roles, and use services through a **dashboard or API**.
2. **Hotel listing & booking** — the first service. Hotels onboard and list rooms; the same inventory is sold on the **MusafirBaba website** (end users) and to **B2B clients** (dashboard + API), in real time, **with no double booking**.

Version 1 = hotels only. Flights, packages, transfers, activities and visa plug in later on the same core.

---

## Read in this order

| # | File | Why |
| --- | --- | --- |
| 1 | [`00-reevaluation.md`](00-reevaluation.md) | What was wrong with v1, what changed, requirement coverage |
| 2 | [`01-architecture.md`](01-architecture.md) | How it fits into your Express + Mongo backend; modules; tenancy |
| 3 | [`02-engineering-standards.md`](02-engineering-standards.md) | How code is written and reviewed |
| 4 | [`03-security-baseline.md`](03-security-baseline.md) | Non-negotiable security controls |
| 5 | [`04-domain-model.md`](04-domain-model.md) | Collections, state machines, pricing/GST/cancellation algorithms |
| 6 | [`05-inventory-and-no-double-booking.md`](05-inventory-and-no-double-booking.md) | **The major concern** — exactly how double booking is prevented |
| 7 | [`06-api-and-events.md`](06-api-and-events.md) | API conventions, endpoints, events, webhooks |
| 8 | [`07-testing-strategy.md`](07-testing-strategy.md) | Test harness and mandatory suites |
| 9 | [`08-ai-editor-playbook.md`](08-ai-editor-playbook.md) | How to drive your AI code editor stage by stage |
| 10 | [`09-decisions-and-risks.md`](09-decisions-and-risks.md) | Open decisions, plain-language questions for a CA and a lawyer, risks |
| 11 | [`10-coding-standards.md`](10-coding-standards.md) | **How every line of new code is written** — backend and frontend rules with do/don't examples, tooling config |
| 12 | [`11-notifications-and-realtime.md`](11-notifications-and-realtime.md) | **Notifications and live updates (self-hosted)** — in-app bell, Socket.IO + Redis on our servers, escalation, email (D25); existing app notifications untouched |
| — | [`stages/`](stages/) | One file per stage |
| — | [`templates/`](templates/) | `AGENTS.md` rulebook, ADR, module README, task prompt, PR template |
| — | [`templates/progress/`](templates/progress/) | **Progress tracking** — copied to `docs/progress/` in Stage 00: current stage and task, % done per stage, blockers, things left out on purpose, session log |

## Stages and timeline

| Phase | # | Stage | Weeks | Delivers |
| --- | --- | --- | --- | --- |
| A | 00 | [Foundations in the existing backend](stages/stage-00-foundations.md) | 2 | Structure, tooling, tests, Redis, realtime, progress tracking |
| A | 01 | [Organisations, users, roles & permissions](stages/stage-01-orgs-users-roles.md) | 2.5 | Accounts, logins, roles for every org type; admin access |
| A | 02 | [Hotel onboarding & KYC (+ notifications foundation)](stages/stage-02-hotel-onboarding-kyc.md) | 2.5 | Hotels register and get verified; generic KYC engine; bell + email |
| A | 03 | [Hotel listings](stages/stage-03-hotel-listings.md) | 2 | Properties, rooms, photos, approval |
| A | 04 | [Inventory & rates calendar](stages/stage-04-inventory-rates.md) | 3 | Rooms per night, prices, atomic holds (no double booking) |
| A | 05 | [Pricing & GST](stages/stage-05-pricing-gst.md) | 1.5 | Margins per channel, GST, price tokens |
| A | 06 | [Search & availability (website first)](stages/stage-06-search-availability.md) | 2 | Website search with live availability |
| A | 07 | [Payments (PayU) & ledger core](stages/stage-07-payments-ledger.md) | 2 | PayU, refunds, ledger, reconciliation (parallel with 03–06) |
| A | 08 | [Booking engine (website first)](stages/stage-08-booking-engine.md) | 2.5 | Website customers book and pay; hotel alerted |
| A | 09 | [After booking & hotel operations](stages/stage-09-after-booking-hotel-ops.md) | 2.5 | Cancellations, refunds, hotel inbox, basic hotel settlements |
| — | — | **Pilot 1: hotels + website customers (2–3 weeks) — the working system** | | |
| B | 10 | [B2B client onboarding & KYC](stages/stage-10-client-onboarding-kyc.md) | 1.5 | Clients register, get verified, manage their own users and roles |
| B | 11 | [Client wallet & credit](stages/stage-11-client-wallet-credit.md) | 2 | Wallet, top-ups, credit line (parallel with 10) |
| B | 12 | [B2B dashboard: search, booking & bookings](stages/stage-12-b2b-booking-dashboard.md) | 3 | Clients search and book with B2B prices; My Bookings; usage counted |
| B | 13 | [Subscriptions & usage billing](stages/stage-13-subscriptions-billing.md) | 2.5 | Plans 4,000 / 5,000 / 10,000, limits, invoices |
| — | — | **Pilot 2: B2B clients (2–3 weeks)** | | |
| C | 14 | [API access & webhooks](stages/stage-14-api-access-webhooks.md) | 2.5 | Clients connect their own software (API keys, webhooks, docs) |
| C | 15 | [Hotel payouts, finance & reports](stages/stage-15-payouts-finance-reports.md) | 2.5 | Payout runs, GST registers, reports (parallel with 14) |
| C | 16 | [Hardening & public launch](stages/stage-16-hardening-launch.md) | 2 | Load/pen tests, DR drill, launch |
| — | 17 | [Roadmap](stages/stage-17-roadmap.md) | — | After launch |

**Order (decided 12 Nov 2026):** foundations → **hotel side first** (onboarding, listings, rooms & rates, pricing, website search, payments, booking, after-booking) so there is a **working system** — hotels list, website customers book — → then **B2B clients** (onboarding, wallet, dashboard booking, plans) → then **API access**, finance and launch.

**Phases:** **A** = hotels + website (working system) · **B** = B2B clients · **C** = API, finance, launch.

**Effort (2–3 developers):** Phase A critical path 00 → 01 → 02 → 03 → 04 → 05 → 06 → 08 → 09 ≈ **20.5 weeks** (Stage 07 runs in parallel) → **Pilot 1 around week 21–26**. Phase B ≈ 7.5 weeks (10 ∥ 11, then 12, 13) → **Pilot 2 around week 29–35**. Phase C ≈ 4.5 weeks (14 ∥ 15, then 16) → **public launch around week 34–42**. Re-plan after Stage 01 and after Pilot 1.

Hotel contracting (getting real hotels to list) must start in parallel from Stage 03 — inventory is a business task as much as a technical one.

**Fixed choices (12 Nov 2026):** payments stay on **PayU** (existing gateway); the B2B/hotel **business area lives inside the existing Next.js app**; **business users and dashboards are new and separate** from website customers (whose hotel bookings appear in their existing website dashboard); the **vehicle-partner module (MBGO/MBConnect) is unrelated** and not reused; **dashboard and API usage both count** towards a client's plan; **new notification features use no third-party service** (self-hosted Socket.IO + Redis) and the **existing app notifications (Ably/Expo for MBConnect/MBGO) are not touched**. A **CA must be engaged before Stage 05** — plain-language questions are in `09-decisions-and-risks.md` §3.

## Rules of the road

1. **One task at a time** inside a stage; two tracks may run in parallel only on different modules.
2. **Docs before code** — each module gets `docs/modules/<name>.md` approved first.
3. **Every stage ships** code + tests + API docs + admin screens + its security checklist.
4. **Money, permissions, tenancy and inventory code** are always reviewed by a senior human.
5. **Decisions are written down** as ADRs (`docs/adr/`); later sessions never silently reverse them.
6. **Coding standards are mandatory** — every PR follows `10-coding-standards.md`; lint, types and boundary checks enforce what they can, reviewers check the rest.
7. **Progress is tracked in `docs/progress/`** — every PR updates its task status, every session adds a log entry, and anything not built is recorded in `DEFERRED.md` (rules in `templates/progress/README.md`).

## Glossary (use these words exactly)

| Term | Meaning |
| --- | --- |
| **Platform** | MusafirBaba itself (admins/staff) |
| **Org** | A company account: type `PLATFORM`, `CLIENT` or `HOTEL` |
| **Client** | B2B buyer company (travel agency, corporate, OTA, reseller). **Never call it "partner"** — that word already means vehicle/driver partner in the codebase |
| **Hotel org** | A hotel or chain that lists properties |
| **Property** | One hotel listing (a hotel org can own several) |
| **Member** | A business user (new `id_users`, not the website `User`) inside an org, with roles |
| **Customer** | End user booking on the website — keeps the existing website account (`User`) and sees hotel bookings in the existing website dashboard |
| **Channel** | Where a request came from: `WEBSITE`, `B2B_PORTAL`, `B2B_API`, `ADMIN` |
| **Room type** | Category of room (Deluxe Double) |
| **Rate plan** | How a room type is sold: meal plan + cancellation policy |
| **Inventory day** | Rooms for one room type on one date: `total`, `booked`, `held` |
| **Hold** | Temporary reservation of rooms (or wallet money) during checkout |
| **Net rate** | Price the hotel charges MusafirBaba (tax-exclusive) |
| **Margin** | MusafirBaba's amount on top of net |
| **Markup** | A client's own amount on top of its price, for its customers |
| **Order** | Product-agnostic purchase; owns payment, invoice, refunds |
| **Hotel booking** | The hotel part of an order: rooms, guests, dates |
| **Plan** | Subscription package: monthly fee + included API calls + overage price |
| **Usage event** | One counted billable call (search, booking…) |
| **Wallet** | Client's prepaid balance (closed, usable only on MusafirBaba services) |
| **Gateway** | PayU — the existing payment gateway, used for website payments, wallet top-ups and plan payments |
