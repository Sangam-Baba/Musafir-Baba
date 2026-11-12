# 09 — Decisions and Risks

## 1. Open decisions

| ID | Decision | Recommendation | Owner | Needed by |
| --- | --- | --- | --- | --- |
| D1 | Admin login: reuse existing admin auth or move admins to new identity module | **Reuse existing admin login**, add the new permission layer + mandatory MFA | Tech lead | Stage 01 |
| D2 | TypeScript for new modules or stay JavaScript | **TypeScript with `allowJs`**; fallback JS + JSDoc `@ts-check` + zod | Tech lead | Stage 00 |
| D3 | What counts as a billable query, and on which channels | **DECIDED:** every use of a paid service (today: hotel search, offers, price check, booking) = 1 query each (admin can change weights); counted on **both dashboard and API**; usage visible to client and admin. Safeguards: automatic live refreshes free; admin may set booking weight to 0 | Business | Stage 12 |
| D4 | Do we **resell** rooms (principal) or earn a **commission** (agent)? | Ask a CA (Q1 in §3) — changes GST amount, who issues invoices, and real margin | Finance + CA | Stage 05 |
| D5 | Who keeps cancellation charges when our deadline is earlier than the hotel's, and GST on cancellation charges | Ask a CA (Q4 in §3); engine supports both | Finance + CA | Stage 09 |
| D6 | Wallet design | Closed, non-transferable, usable only for MusafirBaba services, refunds only to source; a lawyer to confirm no RBI licence is needed (L1 in §3) | Lawyer | Stage 11 |
| D7 | Plan structure | **DECIDED:** 4,000 / 5,000 / 10,000 = monthly query-hit limits; admin sets limit, price, behaviour at limit (block or per-query overage) and features per plan; per-client overrides allowed | Business | Stage 13 |
| D8 | Payment of plan fees | Auto-debit from wallet on renewal; if insufficient → PayU payment link; then dunning | Business | Stage 13 |
| D9 | Credit line for clients in pilot | Yes, admin-approved per client, with limit + due days | Finance | Stage 11 |
| D10 | Is our one **Delhi** GST registration enough for hotels in other states? | Ask a CA (Q2 in §3); engine supports multiple issuing GSTINs | Finance + CA | Stage 05 |
| D11 | Hotel payout cycle and tax deductions (TDS/TCS) on hotel payments | Weekly after check-out by default; deductions per CA (Q5 in §3) | Finance + CA | Stage 15 |
| D12 | Inventory model with hotels | **Allotment** (committed rooms per night) in v1; channel manager later | Business | Stage 04 |
| D13 | Instant confirmation vs on-request hotels | Instant by default (inventory is ours); on-request flag per property later | Business | Stage 08 |
| D14 | Where the business portal lives | **DECIDED:** inside the **existing Next.js app** as a route group (`/client`, `/hotel`), served on `business.musafirbaba.com` via `proxy.ts`, own login cookie | Tech lead | Stage 01 |
| D16 | How MusafirBaba earns on hotels and who sees which price | **DECIDED:** listing is free; admin-managed margin rules per channel (website vs B2B) — fixed ₹ per night, % of base (optional min/max) or per booking — with overrides by city/hotel/dates/client; e.g. base ₹700 → website +₹250, B2B +₹150 (see Stage 05 §2a). Still open: default amounts (business) and default "at limit" behaviour per plan | Business | Stage 05 |
| D15 | KYC / booking data retention periods | Lawyer (L2 in §3); implement configurable retention jobs | Legal | Stage 02 |
| D17 | Payment gateway | **DECIDED:** **PayU** (existing). No manual capture: hold → pay → verify server-to-server → confirm → automatic refund only if rooms were lost | Business | Stage 07 |
| D18 | Users and dashboards | **DECIDED:** business users/dashboards are new and separate; website customers keep their existing account and see hotel bookings in the existing website dashboard; the vehicle-partner module is unrelated and not reused | Business | Stage 01 |
| D19 | API keys for clients | **DECIDED:** yes, needed — built **at the end** (Stage 14) after the working system and the B2B dashboard; keys, webhooks and docs together | Business | Stage 14 |
| D27 | Build order | **DECIDED:** foundations → hotel side + website (working system, Pilot 1) → B2B clients (Pilot 2) → API access, finance, launch | Business | — |
| D20 | Can hotels without a GST number list? | Ask a CA (Q3 in §3). Until answered: may register, flagged high-risk, not sellable | Finance + CA | Stage 02 |
| D21 | Realtime for the new system | **DECIDED:** self-hosted **Socket.IO** in a new `realtime` process with the Redis adapter; reliability from stored inbox + catch-up + escalation (`11-…`) | Business + Tech lead | Stage 00 |
| D25 | Email for the new system | **DECIDED (12 Nov 2026): option A** — reuse the **existing** Resend account through a new `EmailPort` adapter in the `notifications` module (not a new service; existing Resend code and calls untouched; separate sending identity, e.g. `business@` / `notifications@`). Used for invitations, password reset, email OTP, KYC results and critical alerts | Business | Stage 02 |
| D26 | Third-party services for new notification features | **DECIDED:** none. No WhatsApp/SMS providers, no Ably/Expo for the new system; existing app notifications are not touched. Phone numbers are collected but not OTP-verified in v1 | Business | Stage 00 |
| D24 | Coding standards | **DECIDED:** `10-coding-standards.md` is mandatory for all new code; enforced by lint/types/CI and the PR checklist; legacy code not reformatted | Tech lead | Stage 00 |
| D22 | Where Redis runs (new infrastructure) | Pilot: Redis container on the existing Docker host with persistence (AOF) and `noeviction`; later a managed Redis in Mumbai | Tech lead | Stage 00 |
| D23 | Atlas tier and region | Confirm `ap-south-1` and a dedicated tier (M10+) for continuous backup/PITR before the pilot | Tech lead | Stage 00 |

## 2. Risks

| ID | Risk | L | I | Mitigation |
| --- | --- | --- | --- | --- |
| K1 | Atlas tier lacks continuous backup/PITR (replica set itself is confirmed — Atlas) | M | H | Confirm tier in Stage 00 (D23); upgrade before the pilot |
| K2 | Double booking via race | L | H | `05-…` rules, race test suite, invariant checker in production |
| K3 | Hotels sell same rooms elsewhere | H | H | Allotment contracts, stop-sell, "cannot honour" flow, channel manager in Phase C |
| K4 | Thin inventory at launch | H | H | Start hotel contracting from Stage 03; bedbank adapter early in the roadmap (Stage 17) or earlier if needed |
| K5 | Cross-tenant data leak | L | Critical | Tenant guard + plugin + isolation tests |
| K6 | New code tangled with old code | M | M | Separate `src/modules`, boundary lint, `legacy/` adapters only |
| K7 | Wallet/ledger drift | M | H | Ledger invariants, daily reconciliation with PayU |
| K8 | Per-query pricing rejected by clients (dashboard use counts too — one booking ≈ 4 queries) | M | M | Validate with Pilot 2 clients before billing goes live (Stage 13); plans, weights and limits are configurable |
| K9 | AI-generated code drifting from rules | M | M | `AGENTS.md`, CI rules, human review hotspots |
| K10 | GST rules change | M | M | Tax rules as dated data |
| K11 | Team learning curve (transactions, TypeScript) | M | M | Stage 00 examples + pairing; module generator |
| K12 | DPDP obligations from 12 May 2027 | M | H | Consent, retention, breach process built in |
| K13 | PayU payment succeeds after rooms were lost, or stays pending | L | M | Payment window < hold, one extension, poller, automatic idempotent refunds, clear customer message |
| K14 | New infrastructure (Redis, worker, realtime, ClamAV, Chromium) on one Docker host runs out of memory | M | M | Size the host in Stage 00; add a second host if needed |
| K16 | Without WhatsApp/SMS, a hotel not watching the dashboard misses a new booking | M | H | In-app alert with sound, email (D25), owner escalation at 30 min, ops calls the hotel at 60 min (`11-…` §8); revisit DEF-016 after the pilot |
| K15 | No CA engaged yet — GST answers arrive late | H | H | Engage a CA before Stage 05 (about week 8–10); questions ready in §3 |

## 3. Questions for a CA and a lawyer (plain language)

A **CA (Chartered Accountant)** — ideally one who works with travel or e-commerce companies — should answer these before **Stage 05** (pricing & GST, about week 8–10). Stages 00–04 don't depend on the answers.

| # | Question for the CA | Why it matters | Decision |
| --- | --- | --- | --- |
| Q1 | Do we **buy rooms from hotels and resell them** (principal), or **sell on the hotel's behalf for a commission** (agent)? Example: hotel rate ₹700, we sell at ₹950 | Decides how much GST is charged, who issues the invoice to the customer, and whether the hotel's GST on ₹700 becomes our cost | D4 |
| Q2 | Our GST registration is in **Delhi** (`07…`). Can we bill stays at hotels in Goa, Jaipur, etc. with it, or do we need registrations in those states? | GST on hotel rooms follows the hotel's location; decides CGST+SGST vs IGST on invoices | D10 |
| Q3 | Can we list hotels/homestays **without a GST number**? If they sell through our platform, do **we** have to pay the GST on those rooms? | Many small properties are unregistered; the platform may be liable | D20 |
| Q4 | If a customer cancels inside our stricter deadline (when the hotel would not charge), who keeps the charge, and is GST due on cancellation charges? | Ledger postings and invoices for cancellations | D5 |
| Q5 | What tax do we deduct when paying hotels (TDS/TCS), and at what rates? | Payout calculations | D11 |
| Q6 | What GST rate, SAC code and invoice format apply to our **plan fees and per-query charges** to B2B clients? | Subscription invoices (Stage 13) | — |
| Q7 | Please approve our chart of accounts (client wallet, hotel payable, revenue, tax accounts) | Ledger design (Stage 07) | — |

| # | Question for a lawyer | Why it matters | Decision |
| --- | --- | --- | --- |
| L1 | Our B2B wallet is closed (usable only for MusafirBaba services, no transfers, refunds only to source). Do we need an RBI licence? | Wallet design (Stage 11) | D6 |
| L2 | How long must we keep KYC documents and booking data? | Retention jobs | D15 |
| L3 | What must our notices and consent screens say under the DPDP Act (duties from 12 May 2027)? | Website checkout and registrations | — |
| L4 | What should the hotel contract say about allotment (rooms reserved for us), stop-sell and overbooking penalties? | Double booking outside our platform | D12 |
