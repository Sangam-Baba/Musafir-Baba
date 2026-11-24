# Stage 16 — Hardening & public launch · Progress

> Task list from `docs/plan/stages/stage-16-hardening-launch.md` §2–3, split so each task fits one reviewable change. Rules and status values: `docs/progress/README.md`. Tasks marked **owner** need people, servers or vendors — the AI prepares what it can (scripts, runbooks, checklists) and they stay TODO until a person has done them.

| | |
| --- | --- |
| **Status** | IN_PROGRESS |
| **Phase · Track** | C · launch |
| **Owner(s)** | |
| **Started** | 2026-11-24 |
| **Finished** | — |
| **Plan file** | `docs/plan/stages/stage-16-hardening-launch.md` |
| **Depends on** | Stages 00–15 + Pilot 1 and Pilot 2 learnings |

## Defaults used for this stage

| Topic | Default |
| --- | --- |
| Safety checks | The existing checks (rooms booked + held ≤ total, ledger balanced, nothing stuck…) keep running every 10 minutes; each run is now **saved** (`rpt_invariant_runs`, kept 90 days) so admins see the last result and the "days without a problem" count (go-live needs 7). A problem → error log as before, plus an email to `B2B_OPS_ALERT_EMAIL` when set (once per check per day) |
| Load tests | Run only against **staging**, never production; budgets from `07-testing-strategy.md` §5; no package (built-in `fetch`) |
| Gradual launch | Every new part already has its own switch (orders, wallet, billing, API, website hotel booking). Opening them per pilot company first is optional (`B2B_PILOT_ORGS`) and changes nothing while unset |
| Data protection (DPDP) | Consent recorded on business registration and website hotel checkout (new pages only); people can ask for their data or its deletion — requests go to an admin queue, handled by a person |

## Tasks

| ID | Task | Plan ref | Status | Owner | PR | Tests | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S16-T01 | Setup: task list, defaults | §2 | DONE | AI (Claude) | | — | |
| S16-T02 | Safety checks in production: every run saved, admin "System health" view (last run, problems, days clean), alert email | §2.4 | DONE | AI (Claude) | | system-health.test.js | migration 0081 `rpt_invariant_runs` (kept 90 days); every 10-minute run of the safety checks saved; a failing check → error log (as before) + email to `B2B_OPS_ALERT_EMAIL` once per check per Indian day; `GET /admin/system-health` (`reporting.health.read`): last run, failing now, problems in 7 days, days clean, "stale" when no run for 30 min; Admin → B2B → Finance → System health. No change to `src/b2b/core` (saving happens in background.js) |
| S16-T03 | Load tests: order + wallet pay and My Bookings added to the load script; budgets; report file | §2.2 | DONE | AI (Claude) | | lint / typecheck (runs against staging only) | `scripts/b2b/load-test.js`: + "create order + wallet pay" (20 / s, < 2 s; offers → order → pay with an API key) and "My Bookings list" (50 / s, < 300 ms); `LOAD_ONLY` picks scenarios, `LOAD_REPORT` writes a JSON report; exits 1 if a budget or an error fails. Running it at 2× peak and a 4 h soak on staging = S16-T11 (owner) |
| S16-T04 | Last-room race at scale: 500 buyers at once → never more bookings than rooms (script for staging + a local check) | §2.2 | DOING | AI (Claude) | |  |  |
| S16-T05 | Gradual launch: per-company pilot list for the B2B switches (orders, wallet, billing, API) | §2.9 | TODO | | | | |
| S16-T06 | DPDP: consent on business registration and website hotel checkout; data access / deletion requests → admin queue | §2.8 | TODO | | | | |
| S16-T07 | Disaster recovery: backup and restore scripts for the new collections, smoke check, drill runbook (RPO / RTO ≤ 1 h) | §2.5 | TODO | | | | |
| S16-T08 | Operations and incidents: runbooks for the top alerts, incident runbook (leaked key, data exposure, CERT-In 6 h, DPDP), support macros, ops training guide, go-live checklist | §2.6, §2.7, §3 | TODO | | | | |
| S16-T09 | **owner** — Pilot 1 and Pilot 2 run; issues triaged; must-fix list done | §2.1 | TODO | | | | |
| S16-T10 | **owner** — External penetration test; critical / high fixed; WAF / CDN rules on Cloudflare | §2.3 | TODO | | | | |
| S16-T11 | **owner** — Load and soak on staging at 2× peak (scripts from T03 / T04); DR drill on a fresh container (T07) | §2.2, §2.5 | TODO | | | | |
| S16-T12 | **owner** — On-call rota, status page, CERT-In contact, log retention ≥ 180 days in India, ops trained, finance / ops / business sign-off, launch | §2.6–2.9, §3 | TODO | | | | |
