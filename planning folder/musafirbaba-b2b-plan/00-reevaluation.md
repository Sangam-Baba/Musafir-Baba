# 00 — Re-evaluation of the Plan (v1 → v2)

> Second full review of the plan, done after (a) your clarified requirements, (b) your stack (Next.js + Node/Express + MongoDB), and (c) your code editor's review of the existing codebase.
> Every finding below is fixed in v2. "Fixed in" points to the file.

---

## 1. Verdict in one paragraph

v1 was a **good design for the wrong situation**. It assumed a greenfield NestJS + PostgreSQL build, it ordered work so that real bookings arrived only around month 9, and it had a few genuine bugs (hold timer, cross-org tenancy, invoice number length, a GST dead zone). v2 keeps the parts that were right — hold → confirm → capture, signed prices, idempotency, a ledger for money, per-night GST — and rebuilds everything else **inside your existing Express + MongoDB backend**, with **one booking engine shared by the website, the B2B dashboard and the API**, so a room can never be sold twice on your platform.

## 2. Your requirements → where v2 covers them

| # | Your requirement | v2 answer | Where |
| --- | --- | --- | --- |
| B1 | B2B client onboarding | Self-registration → KYC upload → admin verification → activation | Stage 02 |
| B2 | Subscription + wallet per client | Plans (configurable price + included API calls), prepaid wallet, optional credit line | Stages 07, 10 |
| B3 | Billing by usage (API/query hits), plans like 4,000 / 5,000 / 10,000 | Every billable call counted per client; plan includes a quota; overage charged from wallet; plans editable by admin | Stages 06 (counting), 10 (billing) |
| B4 | Manage via dashboard **or** API | One API; the dashboard is just another client of it; API keys + webhooks | Stages 06, 11 |
| B5 | B2B panel for clients | Business portal → "Client" workspace | Stages 01–09 |
| B6 | Clients create their own users and roles | Org owner invites users, creates custom roles from a permission list, can limit users to branches | Stage 01 |
| B7 | Admin manages everything for every client | Platform admin permissions over all orgs + safe "view as client" | Stage 01 + every stage's admin section |
| B8 | KYC & verification from admin | One KYC workflow for clients and hotels, admin queue | Stage 02 |
| H1 | Hotels self-register | Hotel org registration | Stage 02 |
| H2 | Hotels create/manage listings and rooms | Hotel workspace: property wizard, room types, photos, rates, calendar | Stages 03, 04 |
| H3 | Admin manages every hotel | Admin hotel management + listing approval | Stage 03 |
| H4 | Hotel KYC from admin | Same KYC workflow | Stage 02 |
| H5 | Same data on B2B and on the website | One catalogue, visibility flags per channel | Stages 03, 06 |
| H6 | End users book on the website | Website calls the same booking engine (`channel = WEBSITE`) | Stage 08 |
| H7 | B2B clients book from dashboard | Same engine (`channel = B2B_PORTAL`) | Stage 08 |
| H8–H9 | **Real-time inventory, no duplicate booking (major concern)** | Single inventory store, atomic conditional updates inside MongoDB transactions, DB-level validator, holds with sweeper, idempotency, live updates via change streams | **`05-inventory-and-no-double-booking.md`**, Stages 04, 08 |

## 3. Findings

### 3.1 Strategic (S1)

| # | Finding | Fix | Fixed in |
| --- | --- | --- | --- |
| E1 | v1 planned a second stack (NestJS + Postgres) next to your Express + Mongo system: two databases, two logins, two Razorpay integrations, two wallets | **Build inside the existing backend** as new, isolated modules (`src/modules/*`), new collections with module prefixes, same deploy | `01-architecture.md` |
| E2 | Real bookings only at month ~9; SaaS billing and public API built before anyone booked | **Phase A ends in a pilot with real bookings** (website + B2B dashboard). Usage is *counted* from day one; billing switches on in Phase B | `README.md`, stages |
| E3 | Scope too big for 2–3 devs (SSO, mandatory passkeys, WORM audit anchoring, 3 SDKs, dev portal, sandbox env, mutation testing, OpenSearch, e-invoicing) | Cut or deferred. Security stays strong where it matters (tenancy, money, inventory, auth) | `03-security-baseline.md`, Stage 14 |
| E4 | Name clash: "partner" already means vehicle/driver partner in your code | New code uses **Client** (B2B buyer) and **Hotel** (supplier). The word "partner" is banned in new modules | `templates/AGENTS.md`, glossary |
| E5 | Hotels selling the same rooms on other OTAs can still cause double booking — no platform can prevent that alone | Stated clearly: v2 guarantees **no double booking across your website, dashboard and API**. Outside sales need hotel **allotment + stop-sell** now, channel-manager sync later | `05-inventory…` §9 |

### 3.2 Design bugs (S1/S2)

| # | Bug in v1 | Fix | Fixed in |
| --- | --- | --- | --- |
| E6 | Hold (15 min from order) could expire before the payment window (12 min from pay click) closed | Payment window = `min(12 min, holdExpiresAt − 2 min)`; if < 5 min remain, hold is extended once (atomically) before payment starts | `05-inventory…` §6, Stage 08 |
| E7 | Late payment after hold expiry → refund noise | Payment window always shorter than the hold; payment verified server-to-server with **PayU** (hash + verify API) before the booking is confirmed; if rooms were lost, automatic PayU refund (rare by design). *(v2 first proposed Razorpay manual capture; changed in v2.1 because PayU is the live gateway)* | Stages 07, 08 |
| E8 | Postgres RLS allowed one org per transaction, but bookings involve a client **and** a hotel | MongoDB has no RLS; v2 uses a **tenant guard** (repository + Mongoose plugin) with explicit **multi-party documents** (`clientOrgId`, `hotelOrgId`) and a defined **system actor** for cross-org writes | `01-architecture.md` §6 |
| E9 | Invoice number format ~21 chars; GST allows max 16 | `I2627DL000123` style (≤ 16), gap-free per series | `04-domain-model.md` §6 |
| E10 | Back-calculating GST from tax-inclusive rates has a dead zone (₹7,875–₹8,850 fit neither slab) | **Hotels enter tax-exclusive rates only.** The platform computes GST. No back-calculation | Stage 04, 05 |
| E11 | One global hash chain for audit = bottleneck | Plain append-only audit collection (you already have `AuditLog`); no global chain | `03-security…` §9 |
| E12 | Cancellation-buffer revenue and GST on cancellation charges undefined | Ledger postings + tax treatment listed as CA decision D5; engine supports both | `04-domain-model.md` §5, `09-decisions…` |
| E13 | Wallet regulatory status unaddressed | Design as **closed, non-transferable prepaid balance usable only on MusafirBaba services**; withdrawals only as refunds to source; confirm with counsel (D6) | Stage 07 |
| E14 | Naming inconsistencies across files (saga table names, event naming, billable hits) | One glossary and one naming table; AI rulebook enforces them | `02-engineering-standards.md` §3 |

### 3.3 Missing features (S2)

| # | Gap | Fix | Fixed in |
| --- | --- | --- | --- |
| E15 | Offline/manual bookings by ops | Admin "book on behalf of client" through the same engine | Stage 09 |
| E16 | Credit-line clients (normal in India) | Credit limit per client, admin-approved, with statements and due dates | Stage 07 |
| E17 | Hotel can't honour a confirmed booking | "Hotel failure" flow: relocate or full refund, penalty/adjustment against the hotel | Stage 09 |
| E18 | Website customer flow (B2C) not designed in detail | Website users (existing user model) book and pay by PayU; same engine; bookings shown in their existing website dashboard | Stages 08, 09 |
| E19 | Live availability on screens | Change streams → **Ably** (already used in the codebase) push "availability changed" to open pages; cache invalidation *(superseded by §6.5: self-hosted Socket.IO)* | `05-inventory…` §8 |
| E20 | Your backend has no tests (`"test": "exit 1"`) | Stage 00 adds a test harness (Vitest/Jest + `mongodb-memory-server` replica set + supertest) for all new code | Stage 00, `07-testing-strategy.md` |

### 3.4 Things to verify in your codebase first (Stage 00 spike)

Already confirmed from the codebase (12 Nov 2026):
- MongoDB is on **Atlas** (a replica set) → transactions and change streams are available. Still confirm the **tier** (continuous backup/PITR needs a dedicated M10+ cluster) and that the region is Mumbai.
- Mongoose 8.17, Express 5, Node 22, plain JavaScript (ESM) run directly by `node src/server.js` in one Docker container — no build step, no tests, no DB transactions used anywhere yet.
- **No Redis** exists → it is new infrastructure (decision D22).
- Payments run on **PayU**; Razorpay code exists but is unused.
- Realtime uses **Ably**.
- One Next.js app serves the website and `/admin`; admins log in through the `Staff` model; website customers through `User`.

Still to check in Stage 00:
1. Atlas tier and region (D23).
2. PayU integration details (hash, callbacks, verify and refund APIs) and whether server-to-server webhooks are enabled on the account.
3. The existing website bookings page (`(user)/bookings`) — where website customers' hotel bookings will appear.
4. Where Redis will run (D22) and how much memory the Docker host has.

## 4. What stayed from v1 (validated)

- Hold → confirm → capture money flow; signed price tokens; server-side re-pricing.
- Idempotency keys on every write that moves money or rooms.
- A ledger (append-only transactions + balances updated atomically) as the only truth for money.
- GST per room per night, rates as versioned data, place of supply = property state.
- Outbox for events, so side effects are never lost.
- Module boundaries, so any module can become its own service later.

## 5. Revised stage map

| Phase | Stage | Name | Ends with |
| --- | --- | --- | --- |
| A | 00 | Foundations in the existing backend | Module structure, tests, Redis, replica set, conventions |
| A | 01 | Organisations, users, roles & permissions | Clients/hotels have orgs; sub-users; custom roles; admin control |
| A | 02 | Onboarding & KYC (clients and hotels) | Admin-verified accounts |
| A | 03 | Hotel listings | Approved hotels with rooms and photos |
| A | 04 | Inventory & rates calendar | Atomic inventory, holds, rate calendar |
| A | 05 | Pricing & GST | B2B and website prices, signed tokens |
| A | 06 | Search, availability, usage counting & basic API keys | Same search on website, dashboard, API; usage counted; pilot API keys |
| A | 07 | Wallet, credit & payments | Ledger, wallet, credit line, PayU payments with server-side verification |
| A | 08 | Booking engine (all channels) | No double booking; website + dashboard bookings |
| A | 09 | After booking | My Bookings, cancellations, vouchers, invoices, hotel inbox, offline bookings |
| — | — | **Pilot with real clients and hotels** | |
| B | 10 | Subscriptions & usage billing | Plans, quotas, overage from wallet |
| B | 11 | API key hardening & webhooks | Rotation, IP lists, test keys, webhooks, docs |
| B | 12 | Hotel payouts, finance & reports | Settlements, GST registers, reports |
| B | 13 | Hardening & public launch | Load test, pen test, DR, go-live |
| C | 14 | Roadmap | Channel manager, bedbank, more products |

## 6. v2.1 updates (12 Nov 2026)

Your decisions, plus fixes from the review of v2.

### 6.1 Decisions applied

| Decision | Change | Where |
| --- | --- | --- |
| PayU stays the payment gateway | Razorpay manual capture removed. Flow: hold rooms → pay on PayU (window shorter than hold) → verify server-to-server → confirm → automatic refund only if rooms were lost. PayU "pending" payments resolved by a poller | `05-…` §6–7, Stages 07, 08, `03-…` §7 |
| Business area inside the existing Next.js app | Route group with `/client` and `/hotel`, served on `business.musafirbaba.com` via `proxy.ts`, own login cookie | `01-…` §3, Stage 01 |
| Business users and dashboards are new and separate | Business users in new `id_users`; website customers keep the existing `User` and see hotel bookings in their existing website dashboard | `01-…` §14, Stage 09 |
| Vehicle-partner module (MBGO/MBConnect) is unrelated | All "reuse partner patterns" notes removed; rule added never to import it | Stage 00, 02, 07, playbook, AGENTS |
| Dashboard and API usage both count | Unchanged (D3). Safeguards: automatic live refreshes are free; admin can set booking weight to 0 | Stages 06, 10 |
| Basic API keys in the pilot (**assumed — revert if not wanted**, D19) | Key create/revoke + usage per key moved into Stage 06; Stage 11 keeps rotation, IP lists, test keys, webhooks, docs | Stages 06, 11 |

### 6.2 Fixes

| # | Issue in v2 | Fix | Where |
| --- | --- | --- | --- |
| F1 | Global `sanitizeFilter` wraps operator filters (`held: { $gte: n }`, `$expr`) in `$eq` → inventory and wallet queries would silently stop matching; it would also change ~400 legacy files | Not enabled globally. zod `.strict()`, reject `$`/`.` keys, operators only in repository code, test with production settings | `02-…` §5, `03-…`, `05-…` §5, AGENTS |
| F2 | Platform revenue/tax/clearing account documents updated in every booking transaction → every booking write-conflicts on the same documents | Only client wallet balances are updated inside transactions; platform and hotel account balances derived from the journal by the worker | `01-…` §8, `04-…` §5, Stage 07 |
| F3 | `unique sparse {gstin, type}` rejects every second org without a GSTIN and blocks the "flag duplicate GSTIN" flow; idempotency indexes cover null fields | Partial (non-unique) GSTIN index + reviewer flag; partial unique idempotency indexes | `04-…` §1, §5, `02-…` §5 |
| F4 | Hotel's own GST on the net rate missing from pricing and ledger | `hotelGstPaise` recorded per night; payable and margin defaults depend on CA decision D4 | `04-…` §8, Stage 05 |
| F5 | Gateway path could leave a confirmed booking with no money | Booking confirmed only after verified successful payment; invariant + tests | `04-…` §7.3, §9, Stage 08 |
| F6 | Socket.IO + Redis adapter duplicates the existing Ably *(superseded by §6.5 — new system now uses self-hosted Socket.IO, Ably stays only for the existing apps)* | Change-stream listener runs once, in the worker | `01-…` §9, `05-…` §8 |
| F7 | Change-stream listener per backend instance would send duplicate webhooks | Webhooks only from the outbox in the worker | `05-…` §8 |
| F8 | Live refreshes billed to the client | Refresh calls from the business area marked and not counted (rate-limited; ignored for API keys) | Stage 06, `06-…` §1 |
| F9 | "Same token within 2 min → silently return existing order" swallows real repeat bookings | `409 DUPLICATE_ORDER_SUSPECTED`; user confirms to create another | Stage 08, `05-…` §7 |
| F10 | Org and KYC states mixed; three names for the first order state | One status list per entity | `04-…` §1, §2, §7 |
| F11 | Timeline assumed both tracks start together | Critical path 19.5 weeks → pilot ~week 20–26 | README |
| F12 | No plain-language questions for a CA/lawyer | Added | `09-…` §3 |

### 6.3 Progress tracking (added 12 Nov 2026)

| Need | Answer | Where |
| --- | --- | --- |
| Which stage is running now, what is done, what is in progress | `docs/progress/STATUS.md` (current stage/task, % per stage generated by `npm run progress`, blockers, milestones) + one progress file per stage with every task's status, owner, PR and tests | `templates/progress/`, Stage 00 §3.9 |
| What we left out on purpose | `docs/progress/DEFERRED.md` — pre-filled with the 17 deferrals already in the plan; every new one needs why / who / revisit-when | `templates/progress/DEFERRED.md` |
| Continuity between sessions (people and AI) | `docs/progress/SESSION-LOG.md` — one entry per session | `templates/progress/SESSION-LOG.md` |
| Keeping it honest | Rules in `AGENTS.md`, PR template checklist, playbook §7, and a CI check (`npm run progress -- --check`) | templates, playbook |

### 6.4 Coding standards and notifications (added 12 Nov 2026)

| Need | Answer | Where |
| --- | --- | --- |
| Coding standards everyone (and every AI session) follows | New `10-coding-standards.md`: TypeScript, backend file roles, validation (zod 4 `strictObject`), services/transactions, Mongoose patterns, errors, async, logging, frontend (Next.js 16, React Query, RHF + zod, zustand, Tailwind 4 + shadcn), tests, git, and the exact lint/tsconfig/Prettier setup. Enforced by CI and the PR template; legacy code not reformatted | `10-…`, Stage 00, AGENTS, PR template, D24 |
| Notifications that can't be missed | New `11-notifications-and-realtime.md`: outbox → stored inbox → live push via existing `transport.js` (Ably) → catch-up after reconnect → email/WhatsApp/SMS for critical events → escalation if not acted on. In-app bell with private `user:`/`org:` channels, preferences (critical locked), monitoring and tests | `11-…`, Stages 02, 08, D21 |

### 6.5 Self-hosted notifications, existing system untouched (added 12 Nov 2026)

| Decision | Change | Where |
| --- | --- | --- |
| No third-party service for new notification features (D26) | Realtime for the new system = **self-hosted Socket.IO** in a new `realtime` container + Redis adapter/emitter. WhatsApp/SMS removed from v1 (DEF-016); email OTP instead of SMS OTP; phone numbers not OTP-verified (DEF-019); browser push deferred (DEF-018) | `11-…`, `01-…` §3/§9, Stages 00, 01, 02, 08 |
| Don't touch working code | Existing MBConnect/MBGO notifications (`services/notification/*`, Ably, Expo, `Notification` model, realtime-token routes, mobile apps) are not modified or imported — enforced by a lint rule; the existing Express server isn't changed for realtime (separate process) | `11-…` §2, `10-…` §13, AGENTS |
| Hotels must not miss bookings without WhatsApp/SMS | Escalation inside our system: repeat alert + email at 15 min, owner at 30 min, ops calls the hotel at 60 min (risk K16) | `11-…` §8, Stage 08 |
| Email (D25) | **Decided: option A** — reuse the existing Resend account through a new `EmailPort` adapter (no new service; existing email code untouched; separate sender identity) | `11-…` §7, `09-…` |

### 6.6 Stage order changed: hotels first, then B2B, API at the end (added 12 Nov 2026)

Your decision (D27): first a **working system** on the hotel side (hotels onboard and list, website customers book), then **B2B clients**, and **API access at the end** (D19: needed, built last).

> **Note:** sections §1–§6.5 above use the **old** stage numbers. Use this table to translate.

| Old stage (v2.x) | New stage |
| --- | --- |
| 00 Foundations | **00** Foundations (unchanged) |
| 01 Orgs, users, roles | **01** (unchanged) |
| 02 Onboarding & KYC (clients and hotels) | **02** Hotel onboarding & KYC (generic engine + notifications) and **10** B2B client onboarding & KYC |
| 03 Hotel listings | **03** (unchanged) |
| 04 Inventory & rates | **04** (unchanged) |
| 05 Pricing & GST | **05** (client markup screens move to 12) |
| 06 Search, usage counting & basic API keys | **06** Search & availability (website) · usage counting → **12** · API keys → **14** |
| 07 Wallet, credit & payments | **07** Payments (PayU) & ledger core · wallet & credit → **11** |
| 08 Booking engine (all channels) | **08** Booking engine (website first, built for all channels) · wallet/credit checkout & branded voucher → **12** |
| 09 After booking | **09** After booking & hotel operations (+ basic hotel settlements) · client My Bookings, wallet refunds, offline bookings → **12** |
| — | **Pilot 1** (hotels + website) after 09 |
| 10 Subscriptions & billing | **13** |
| — | **Pilot 2** (B2B clients) after 12/13 |
| 11 API key hardening & webhooks | **14** API access & webhooks (all API work together) |
| 12 Payouts, finance & reports | **15** |
| 13 Hardening & launch | **16** |
| 14 Roadmap | **17** |

Timeline (2–3 developers): Pilot 1 ≈ week 21–26 · Pilot 2 ≈ week 29–35 · launch ≈ week 34–42 (README).
