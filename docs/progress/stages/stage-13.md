# Stage 13 — Subscriptions & usage billing · Progress

> Task list from `docs/plan/stages/stage-13-subscriptions-billing.md` §3, split so each task fits one reviewable change. Rules and status values: `docs/progress/README.md`.

| | |
| --- | --- |
| **Status** | IN_PROGRESS |
| **Phase · Track** | B · clients |
| **Owner(s)** | |
| **Started** | 2026-11-23 |
| **Finished** | — |
| **Plan file** | `docs/plan/stages/stage-13-subscriptions-billing.md` |
| **Depends on** | Stage 12 part B (usage counting), Stage 11 (wallet) |
| **Modules** | `subscriptions` (plans, subscriptions, overrides, entitlements), `billing` (rating, invoices, collection, dunning), `metering` (quota checks) |

## Defaults used for this stage (owner can change any of them — **placeholders until D7 is signed off with real clients**)

| Topic | Default |
| --- | --- |
| Plans (D7) | **Placeholder numbers**, all editable by MusafirBaba admin: Starter (trial) 1,000 queries / ₹0 for the first 30 days then moves to Plan A · Plan A 4,000 / ₹2,999 a month, BLOCK at the limit · Plan B 5,000 / ₹3,499, OVERAGE ₹1.00 a query · Plan C 10,000 / ₹5,999, OVERAGE ₹0.75 a query. Prices exclude GST (18 %) |
| What counts (D3) | Search, offers, price check = 1 each; **booking = 0** (a booking is never blocked); autocomplete, content and live refreshes free; website traffic never counts — admin can change the weights |
| Start | A verified client starts on the Starter trial; at its end it moves to Plan A (or the plan the owner picked) |
| Changes | Upgrade now (fee and included queries prorated by days); downgrade and cancel at period end; overrides and query top-ups need two people |
| Paying (D8) | Plan fee taken from the wallet at renewal; overage at month close; not enough money → `PAST_DUE` with a PayU payment link |
| Dunning | Reminders on day 0, 3, 7; day 10 `SUSPENDED` (search and booking off — existing bookings, documents, cancellations still work); reactivated as soon as it is paid |
| Invoices | SaaS GST invoices in their own series (`S2627DL000001`), SAC 998314 (placeholder — CA to confirm) |
| Simulation | No real clients yet: flows are exercised with test data and a demo script (no production switches changed) |

## Tasks

| ID | Task | Plan ref | Status | Owner | PR | Tests | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S13-T01 | Setup: task list, placeholder defaults (D3, D7, D8) | §2, §3 | DONE | AI (Claude) | | — | |
| S13-T02 | Plan catalogue `sub_plans` (versions, draft → publish by a second person, retire) + seeded placeholder plans + query weights table | §2, §3.1 | DONE | AI (Claude) | | subscriptions.test.js | module `subscriptions`; migration 0070 `sub_plan_versions` (one draft / one published per plan) + `sub_settings`; placeholder plans and weights seeded at start-up (only if missing); propose → a different person publishes (old version superseded; claim → supersede → publish, repeat-safe) or rejects; retire; query weights (booking 0) |
| S13-T03 | Subscriptions `sub_subscriptions`: start on client activation (trial), renew, upgrade now (prorated), downgrade / cancel at period end, overrides and query top-ups (two people) | §3.2 | DONE | AI (Claude) | | subscriptions.test.js | migration 0071 `sub_subscriptions` (one per client) + `sub_overrides`; start on client activation (+ every-10-minute catch-up for clients verified earlier); upgrade now prorated by days (fee difference and included queries), downgrade / cancel at period end, version-checked (two at once → one wins); renew (pending applied, current version, fee charge, queries reset); trial end mid-month; overrides / top-ups by two people; fees are `charges` for billing (T06) |
| S13-T04 | Entitlements + limit enforcement in the gateway: weighted count, 80 % / 100 % alerts, BLOCK → 429 QUOTA_EXCEEDED, OVERAGE continues | §3.3, §3.4 | DOING | AI (Claude) | |  |  |
| S13-T05 | Rating engine (pure): plan version + usage + top-ups + overrides + prorations → invoice lines (property tests) | §3.6 | TODO | | | | |
| S13-T06 | SaaS invoices `bil_invoices` (own GST series) + collection from the wallet (renewal fee, overage at month close), PayU link when short | §3.5, §3.7, §3.8 | TODO | | | | |
| S13-T07 | Dunning: PAST_DUE → reminders → SUSPENDED (paid features off) → reactivated on payment | §3.9 | TODO | | | | |
| S13-T08 | Client API + screens: plans, change preview / change, usage vs limit (forecast), invoices | §3.10, §5 | TODO | | | | |
| S13-T09 | Admin API + screens: plan editor, query weights, subscriptions, overrides / top-ups, usage % for all clients, dunning board, revenue (MRR, overage) | §3.11, §5 | TODO | | | | |
| S13-T10 | Mandatory tests + month simulation script (demo client through a billing month) | §8, §9 | TODO | | | | |
