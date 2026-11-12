# Stage 16 — Hardening & Public Launch

| | |
| --- | --- |
| **Phase** | C — API, finance, launch |
| **Duration** | ~2 weeks (pen-test vendor booked 4 weeks ahead) |
| **Depends on** | Stages 00–15 + learnings from Pilot 1 and Pilot 2 |

## 1. Goal

Prove the platform is fast, secure and recoverable under real load, fix what the pilot taught, and launch publicly.

## 2. Work breakdown

1. **Pilot review**: issues and metrics from Pilot 1 (after Stage 09) and Pilot 2 (after Stage 12/13) triaged; must-fix list done.
2. **Load & concurrency**: k6 at 2× expected peak for search, offers, booking; soak 4 h; **last-room race at scale** (500 concurrent buyers); verify autoscaling, Mongo connection pool sizing, Redis limits.
3. **Security**: external penetration test (web, API, tenancy, payments, uploads, webhooks) — fix critical/high before launch; dependency and secret scans clean; rate limits tuned; WAF/CDN rules on.
4. **Invariant checker in production**: nightly job verifies `booked + held ≤ total` everywhere, ledger balances = lines, no stuck holds/orders; alerts on any failure.
5. **Disaster recovery drill**: restore Mongo from PITR into a new cluster, run smoke tests, measure RPO (target ≤ 5 min) and RTO (≤ 1 h); restore files.
6. **Incident readiness**: tabletop (leaked API key + data exposure); CERT-In 6-hour reporting path and point of contact; DPDP breach process; status page.
7. **Operations**: on-call rotation, alerts → runbooks for top 20 alerts, support macros, ops training (KYC, listings, amendments, refunds, payouts, offline bookings).
8. **Compliance check**: log retention ≥ 180 days in India; DPDP notices + consent on website checkout and registrations; data request workflow.
9. **Launch**: feature flags opened gradually (pilot orgs → all clients → website traffic); war-room dashboard for 2 weeks.

## 3. Go-live checklist

- [ ] All mandatory test suites green; race tests pass at scale
- [ ] No open critical/high pen-test findings
- [ ] Performance budgets met at 2× peak; soak stable
- [ ] DR drill done within RPO/RTO
- [ ] Production invariant checker running, 0 violations for 7 days
- [ ] Alerts, runbooks and on-call verified
- [ ] CERT-In contact + incident runbook rehearsed; log retention set
- [ ] DPDP notices, consent, data requests live
- [ ] Finance sign-off: ledger, reconciliation, invoices, payouts, GST
- [ ] Ops trained; status page live
- [ ] Owners (Tech, Finance, Ops, Business) approve launch

## 4. AI editor prompt

```
Read: AGENTS.md, 07-testing-strategy.md §5, 05-inventory-and-no-double-booking.md §12.
Task: k6 scripts — search, offers, order+wallet pay, my bookings, and a last-room race with 500 virtual users; thresholds = budgets; HTML report artifact in CI.
Constraints: tests/perf only.
```
