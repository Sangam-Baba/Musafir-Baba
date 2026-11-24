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
| S16-T04 | Last-room race at scale: 500 buyers at once → never more bookings than rooms (script for staging + a local check) | §2.2 | DONE | AI (Claude) | | race-at-scale.test.js | local: 500 buyers at once for 5 rooms over 3 nights (1–3 nights, 1–2 rooms each, overlapping) → every night booked + held ≤ total, held = Σ holds, winners hold exactly what the nights say, losers keep nothing (all-or-nothing); then 200 more at once while half the winners confirm and half release → still never oversold (~8 s). Staging: `scripts/b2b/race-at-scale.js` — N buyers (default 500) through the real API with a `mb_test_` key (refuses live keys), exit 1 if more orders got rooms than were free; unpaid holds expire by themselves. Running it on staging = S16-T11 (owner) |
| S16-T05 | Gradual launch: per-company pilot list for the B2B switches (orders, wallet, billing, API) | §2.9 | DONE | AI (Claude) | | pilot.test.js | `routes/pilot.js` — `B2B_PILOT_ORGS` (client company ids, comma separated; unset = everyone, nothing changes): while set, client orders / bookings, wallet / credit, plans / billing pages and API keys / webhooks answer the same "not enabled" for other client companies; a key of another company → 401 API_NOT_ENABLED; billing starts trials only for pilot companies; webhooks queued only for them. Staff, hotels and the website never affected |
| S16-T06 | DPDP: consent on business registration and website hotel checkout; data access / deletion requests → admin queue | §2.8 | DOING | AI (Claude) | |  |  |
| S16-T07 | Disaster recovery: backup and restore scripts for the new collections, smoke check, drill runbook (RPO / RTO ≤ 1 h) | §2.5 | DONE | AI (Claude) | | check-invariants.js run on a fresh database (all clean, exit 0); backup script syntax-checked | `scripts/b2b/backup-b2b.sh` (B2B collections only, from the Mac over the existing `3mongoose` SSH + backup key; for hourly runs next to the daily full backup that already includes them); `scripts/b2b/check-invariants.js` (the safety checks once against any database, read-only, exit 1 on a problem — for after a restore); `docs/go-live/runbooks/disaster-recovery.md` (drill on a fresh container: restore full + B2B, migrate, checks, reconciler + PayU for the gap, smoke, RPO / RTO log; real failure steps). The drill itself = S16-T11 (owner) |
| S16-T08 | Operations and incidents: runbooks for the top alerts, incident runbook (leaked key, data exposure, CERT-In 6 h, DPDP), support macros, ops training guide, go-live checklist | §2.6, §2.7, §3 | DONE | AI (Claude) | | — | `docs/go-live/runbooks/`: `alerts.md` (top 20 alerts — meaning and action), `incidents.md` (contacts to fill, first 30 minutes, CERT-In within 6 h, DPDP Board + people without delay / 72 h report, playbooks: leaked API key, data exposure, webhook abuse, money wrong, rooms oversold, tabletop scenario — to be confirmed by a lawyer), `support-and-training.md` (support replies, ops training plan), `go-live-checklist.md` (the 11 checks with how to check, and the order to open the switches). Filling names, the tabletop, training and sign-off = S16-T12 (owner) |
| S16-T09 | **owner** — Pilot 1 and Pilot 2 run; issues triaged; must-fix list done | §2.1 | TODO | | | | |
| S16-T10 | **owner** — External penetration test; critical / high fixed; WAF / CDN rules on Cloudflare | §2.3 | TODO | | | | |
| S16-T11 | **owner** — Load and soak on staging at 2× peak (scripts from T03 / T04); DR drill on a fresh container (T07) | §2.2, §2.5 | TODO | | | | |
| S16-T12 | **owner** — On-call rota, status page, CERT-In contact, log retention ≥ 180 days in India, ops trained, finance / ops / business sign-off, launch | §2.6–2.9, §3 | TODO | | | | |
