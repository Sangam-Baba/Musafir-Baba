# Project Status — MusafirBaba B2B Platform + Hotel Booking

> The one page that says where the build is. Rules: `docs/progress/README.md`.
> Numbers inside the generated block come from `npm run progress` — don't edit them by hand.

**Last updated:** 2026-11-12 by AI (Claude) · **Plan version:** v2.4 (zero-impact, no transactions) · **Branch:** `b2b/stage-00`

## Now

| | |
| --- | --- |
| **Phase** | A — hotels + website (working system) |
| **Current stage(s)** | Stage 00 — Foundations (isolated `backend/src/b2b/`, existing behaviour untouched) |
| **Current task(s)** | Stage 00 complete — waiting for owner sign-off (Definition of Done review) |
| **Next up** | S00-T02 `backend/src/b2b/` skeleton + flagged mount · S00-T04 zero-impact guards · S00-T03 MongoDB job queue + scheduler (D22: no Redis) |
| **Blockers** | B1 — owner checks O1–O5 from the system map (don't block coding; block Stage 00 DoD / first deploy) |
| **Decisions needed soon** | CA engaged before Stage 05 (Q1–Q7) |

## Stages

<!-- progress:start -->
| # | Stage | Phase | Status | Done / Total | Deferred | Progress | Started | Finished | Details |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 00 | Foundations (isolated `backend/src/b2b/`, existing behaviour untouched) | A | AWAITING_SIGN_OFF | 22 / 22 | 0 | 100 % | 2026-11-12 | — | [stage-00](stages/stage-00.md) |
| 01 | Organisations, users, roles & permissions | A | NOT_STARTED | 0 / 0 | 0 | 0 % | — | — | — |
| 02 | Hotel onboarding & KYC (+ notifications) | A | NOT_STARTED | 0 / 0 | 0 | 0 % | — | — | — |
| 03 | Hotel listings | A | NOT_STARTED | 0 / 0 | 0 | 0 % | — | — | — |
| 04 | Inventory & rates calendar | A | NOT_STARTED | 0 / 0 | 0 | 0 % | — | — | — |
| 05 | Pricing & GST | A | NOT_STARTED | 0 / 0 | 0 | 0 % | — | — | — |
| 06 | Search & availability (website first) | A | NOT_STARTED | 0 / 0 | 0 | 0 % | — | — | — |
| 07 | Payments (PayU) & ledger core | A | NOT_STARTED | 0 / 0 | 0 | 0 % | — | — | — |
| 08 | Booking engine (website first) | A | NOT_STARTED | 0 / 0 | 0 | 0 % | — | — | — |
| 09 | After booking & hotel operations | A | NOT_STARTED | 0 / 0 | 0 | 0 % | — | — | — |
| — | **Pilot 1 — hotels + website** (2–3 weeks) | A | NOT_STARTED | — | — | — | — | — | Stage 09 §10 checklist |
| 10 | B2B client onboarding & KYC | B | NOT_STARTED | 0 / 0 | 0 | 0 % | — | — | — |
| 11 | Client wallet & credit | B | NOT_STARTED | 0 / 0 | 0 | 0 % | — | — | — |
| 12 | B2B dashboard: search, booking & bookings | B | NOT_STARTED | 0 / 0 | 0 | 0 % | — | — | — |
| 13 | Subscriptions & usage billing | B | NOT_STARTED | 0 / 0 | 0 | 0 % | — | — | — |
| — | **Pilot 2 — B2B clients** (2–3 weeks) | B | NOT_STARTED | — | — | — | — | — | Stage 12 §10 checklist |
| 14 | API access & webhooks | C | NOT_STARTED | 0 / 0 | 0 | 0 % | — | — | — |
| 15 | Hotel payouts, finance & reports | C | NOT_STARTED | 0 / 0 | 0 | 0 % | — | — | — |
| 16 | Hardening & public launch | C | NOT_STARTED | 0 / 0 | 0 | 0 % | — | — | — |

**Overall (stages with task lists):** 22 of 22 tasks done (100 %) · deferred on purpose: 0 (see `DEFERRED.md`, which also lists the plan-level deferrals)
<!-- progress:end -->

Task totals are 0 until a stage starts and its task list is written (rule 2).

## Blockers

| ID | Blocker | Blocks (tasks/stages) | Owner | Since | Next action |
| --- | --- | --- | --- | --- | --- |
| B1 | Owner checks O1, O2, O4, O5 (`docs/existing-system-map.md` §9): production DB read-only checks, PayU webhook setting, frontend hosting, live bookings page (O3 answered) | Stage 00 DoD, first deploy, edits E2/E4 | Owner | 2026-11-12 | Owner runs the read-only commands and answers |

## Open decisions affecting the next two stages

| Decision | What | Needed by | Owner | Status |
| --- | --- | --- | --- | --- |
| D22 | Redis | Stage 00 | Tech lead | Decided: no Redis for now (MongoDB-based) |
| D23 / D28 | Database unchanged until after launch; zero impact on existing system | — | Owner | Decided |
| D2 | TypeScript for new modules | Stage 00 | Tech lead | Recommended: yes |
| D19 | API keys for clients | Stage 14 | Business | Decided: yes, at the end |
| D4 / D10 / D20 | CA questions Q1–Q3 | Stage 05 / 02 | Finance + CA | CA not engaged yet |

## Milestones

| Milestone | Planned (week) | Forecast | Actual date |
| --- | --- | --- | --- |
| Stage 00 done | 2.5 | | |
| Stage 02 done (hotels can register) | 7.5 | | |
| Stage 04 done (hotels manage rooms & rates) | 13 | | |
| Stage 08 done (first website booking end to end) | 20 | | |
| Pilot 1 starts (working system: hotels + website) | 23–28 | | |
| Stage 12 done (B2B clients book from the dashboard) | 29–34 | | |
| Pilot 2 starts (B2B clients) | 31–37 | | |
| Stage 14 done (API access live) | 34–40 | | |
| Public launch | 36–44 | | |
