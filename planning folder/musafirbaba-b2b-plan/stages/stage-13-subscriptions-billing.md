# Stage 13 — Subscriptions & Usage Billing

| | |
| --- | --- |
| **Phase** | B — B2B clients |
| **Duration** | ~2.5 weeks |
| **Depends on** | Stage 12 (usage counted since then), Stage 11 (wallet) |
| **Modules** | `subscriptions`, `metering`, `billing` |
| **Apps** | Business area `/client` (plan, usage, invoices), `admin` (plans, overrides, dunning) |
| **Closes** | D3 (confirm), D7 (plan structure), D8 (plan payment) |

## 1. Goal

Clients pick a plan, see usage live, and are billed for what they use — monthly fee plus API/query usage beyond the included amount — automatically from their wallet, with GST invoices, warnings before limits, and fair handling of non-payment.

## 2. How plans work (decided: D3, D7)

**4,000 / 5,000 / 10,000 = monthly query-hit limits.** Admin sets both the **limit** and the **price** of every plan from the admin panel. Queries are counted from **both the B2B dashboard and the API** into one monthly pool per client.

Example (admin can change every number):

| Plan | Monthly query limit | Monthly price (admin sets) | At the limit (admin sets) | Features (admin sets) |
| --- | --- | --- | --- | --- |
| Plan A | 4,000 | ₹ set by admin | Block, or charge ₹X per extra query from wallet | Dashboard + API, N users |
| Plan B | 5,000 | ₹ set by admin | Block, or charge ₹X per extra query | … |
| Plan C | 10,000 | ₹ set by admin | Block, or charge ₹X per extra query | … |
| Custom (per client) | any | any | any | any — via client override |

**What counts as one query** (admin-configurable table, defaults below): each call of hotel search, hotel offers (rooms & rates), price check and create booking = 1 query. Admin can change weights (e.g. booking = 0 so booking is never blocked) or exclude an endpoint. Autocomplete and hotel content are free but rate-limited. Automatic live refreshes (Stage 12 §3.2) are free. Website (B2C) traffic never counts.

Each plan record holds: `name`, `monthlyQueryLimit`, `pricePaise` (monthly; optional annual), `limitBehaviour: BLOCK | OVERAGE`, `overagePricePerQueryPaise`, `features` (users, branches, API access, webhooks, white-label…), `status`. Published versions are immutable; edits create a new version that applies from the next renewal (or immediately, if admin chooses).

**Who sees usage:**

| Viewer | Sees |
| --- | --- |
| Client owner/admin/accountant | Used vs limit this month, % bar, daily chart, split by **dashboard vs API**, by user and by API key, by endpoint, forecast to month end, past months |
| Client agents | Optional (owner decides) |
| MusafirBaba admin | All of the above for **any client**, plus a table of all clients sorted by usage %, clients near/over limit, overage revenue, export |

## 3. Work breakdown

1. **Plan catalogue** (admin): create draft → preview → publish version (maker–checker); retire.
2. **Subscriptions**: start on KYC approval (trial or default plan); upgrade now (prorated credit/debit); downgrade at period end; add-ons (extra users, extra quota pack); cancel at period end; per-client **overrides** (custom price/quota, expiry, maker–checker).
3. **Entitlements**: materialised `(orgId, key, value)` = plan version + add-ons + overrides; refreshed on change → Redis cache for the gateway (features, rate limits, quotas).
4. **Limit enforcement** (gateway, from Stage 12 counters): alerts to client and admin at 80% and 100% (email, in-app, webhook from Stage 14); `BLOCK` → `429 QUOTA_EXCEEDED` on counted endpoints after 100% (bookings, cancellations, documents still work unless admin weighted booking > 0); `OVERAGE` → continue and charge per extra query from wallet. Admin can grant a one-time top-up of queries (maker–checker).
5. **Usage close**: daily rollups; month closes 24 h after month end (late events land in the right month until then).
6. **Rating engine** (pure): plan version + usage + add-ons + overrides + prorations → invoice lines (fee, overage by tier, add-ons, credits).
7. **Collection (D8)**: on renewal, debit plan fee from wallet; overage billed at month close from wallet; insufficient balance → PayU payment link; optional mid-month overage debit when overage > threshold.
8. **SaaS GST invoices**: separate series (e.g. `S2627DL000012`), SAC per CA, client GSTIN, PDF + email.
9. **Dunning**: `PAST_DUE` → reminders day 0/3/7 → day 10 `SUSPENDED` (search/booking off; existing bookings, documents and cancellations still allowed) → reactivated instantly on payment.
10. **Client UI**: plan comparison & change preview, usage dashboard (used vs limit, dashboard vs API split, per user/API key/endpoint, daily chart, forecast, history), invoices list.
11. **Admin UI**: plan editor (limit, price, limit behaviour, overage price, features), "what counts as a query" table, subscriptions list, per-client overrides and query top-ups, **usage overview for all clients** (sortable by % used, filters, drill into any client's dashboard), dunning board, revenue summary (MRR, overage).

## 4. Collections

`sub_plans` (versions embedded or `sub_plan_versions`), `sub_subscriptions`, `sub_overrides`, `sub_entitlements`, `mtr_usage_daily` (from Stage 12), `bil_invoices`, `bil_invoice_lines`, `bil_dunning_attempts`.

## 5. API

Client: `GET /plans`, `GET /subscription`, `POST /subscription/change-preview`, `POST /subscription/change`, `GET /usage?month=`, `GET /billing/invoices`.
Admin: `/admin/plans`, `/admin/subscriptions`, `/admin/overrides`, `/admin/dunning`.

## 6. Rules & edge cases

- Website (B2C) traffic is never billed (platform org).
- Failed/invalid requests are not billable; only those defined in D3.
- BLOCK limits may overshoot by a few queries under heavy parallel traffic (counters are near-real-time) — cap documented (≤ 1% or 100 queries); never billed.
- Plan changes mid-month: included quantities prorated by days.
- Plan fee debit and booking spending share the same wallet — show both clearly in statements.

## 7. Security

| Threat | Control | Test |
| --- | --- | --- |
| Under-billing via counter loss | Redis counters reconciled nightly with stored events | Recon test |
| Override abuse | Maker–checker, audit, expiry | Tests |
| Plan change race | Version check on subscription | Concurrency test |

## 8. Mandatory tests

Rating engine property tests (query limit, BLOCK vs OVERAGE, query weights, prorations, totals = Σ lines, never negative); entitlement precedence (override > add-on > plan); quota thresholds; dunning state machine; invoice numbering.

## 9. Definition of Done

- [ ] Test client on the 4,000-query plan: dashboard + API queries both counted; warnings at 3,200 and 4,000; BLOCK plan returns `QUOTA_EXCEEDED`; OVERAGE plan charges extra queries from wallet on a GST invoice
- [ ] Admin changes a plan's limit and price from the admin panel; client and admin usage screens show the same numbers
- [ ] Upgrade with proration and downgrade at period end correct
- [ ] Unpaid client suspended for paid features only; reactivated within a minute of payment
- [ ] Business signed off plan numbers (D7) after talking to real clients

## 10. AI editor prompt

```
Read: AGENTS.md, this stage, docs/modules/billing.md.
Task: §3.6 rating engine (planVersion with monthlyQueryLimit + limitBehaviour, weighted query count, addOns, overrides, period, prorations) → invoice lines.
Constraints: pure domain in modules/billing/domain; Money only.
Tests first: within limit = fee only; OVERAGE plan charges extra queries; BLOCK plan charges no overage; query weights applied; mid-month upgrade proration; zero usage; override precedence; total = Σ lines.
```
