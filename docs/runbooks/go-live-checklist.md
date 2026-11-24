# Go-live checklist — B2B + hotel system (plan Stage 16 §3)

Tick each line with the date and who checked it. Launch only when every line is ticked and the four owners approve.

| # | Check | How to check | Done (date / who) |
| --- | --- | --- | --- |
| 1 | All automated tests green; race tests pass at scale | CI; `race-at-scale.test.js` locally; `scripts/b2b/race-at-scale.js` on staging exits 0 | |
| 2 | No open critical / high findings from the external penetration test | Vendor report + retest letter | |
| 3 | Performance budgets met at 2× peak; 4-hour soak stable | `scripts/b2b/load-test.js` on staging (`LOAD_REPORT` file attached) | |
| 4 | Disaster-recovery drill done within RPO / RTO ≤ 1 h | `docs/runbooks/disaster-recovery.md` drill log | |
| 5 | Safety checks running in production, 0 problems for 7 days | Admin → Finance → System health: "Days without a problem" ≥ 7 | |
| 6 | Alerts reach a person; runbooks and on-call verified | Test email to `B2B_OPS_ALERT_EMAIL`; on-call rota published; `docs/runbooks/alerts.md` reviewed | |
| 7 | CERT-In contact registered; incident runbook rehearsed; logs kept ≥ 180 days in India | `docs/runbooks/incidents.md` "Who" filled; tabletop done; log retention set on the server | |
| 8 | DPDP notices, consent and data requests live | Privacy notice linked on registration and checkout; consent recorded; data request queue answered within 30 days | |
| 9 | Finance sign-off: ledger, reconciliation, invoices, payouts, GST | CA review of invoice layout, SAC, GST register, TDS deductions; a test month reconciled | |
| 10 | Ops trained; status page live | `docs/runbooks/support-and-training.md` sessions done; status page URL | |
| 11 | Owners approve (Tech, Finance, Ops, Business) | Signed note | |

## Opening the switches (gradual)

1. Server settings ready: `B2B_API_KEY_PEPPER`, `B2B_OPS_ALERT_EMAIL`, GSTIN in pricing settings, bank details for top-ups.
2. `B2B_PILOT_ORGS=<pilot client ids>` — then switch on in this order, one at a time, watching System health for a day each: `B2B_ORDERS_ENABLED`, `B2B_WALLET_ENABLED`, `B2B_BILLING_ENABLED`, `B2B_API_ENABLED`.
3. Remove `B2B_PILOT_ORGS` → every verified client.
4. Website hotel booking: `NEXT_PUBLIC_FEATURE_HOTEL_BOOKING=true` (website traffic) — last.
5. War room for 2 weeks: System health, Payments mismatches, Operations queues, error logs — checked morning and evening.
