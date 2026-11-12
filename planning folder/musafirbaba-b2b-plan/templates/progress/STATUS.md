# Project Status — MusafirBaba B2B Platform + Hotel Booking

> The one page that says where the build is. Rules: `docs/progress/README.md`.
> Numbers inside the generated block come from `npm run progress` — don't edit them by hand.

**Last updated:** YYYY-MM-DD by <name or AI session> · **Plan version:** v2.1

## Now

| | |
| --- | --- |
| **Phase** | A — hotels + website (working system) |
| **Current stage(s)** | Stage 00 — Foundations in the existing backend |
| **Current task(s)** | S00-T01 — Map the existing system (`DOING`, owner: …) |
| **Next up** | S00-T02 Atlas tier/region check (D23) · S00-T03 Redis hosting (D22) |
| **Blockers** | None |
| **Decisions needed soon** | D22 Redis hosting, D23 Atlas tier (Stage 00) · CA engaged before Stage 05 (Q1–Q7) |

## Stages

<!-- progress:start -->
| # | Stage | Phase | Status | Done / Total | Deferred | Progress | Started | Finished | Details |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 00 | Foundations in the existing backend | A | NOT_STARTED | 0 / 21 | 0 | 0 % | — | — | [stage-00](stages/stage-00.md) |
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

**Overall (stages with task lists):** 0 of 21 tasks done (0 %) · deferred on purpose: 0 (see `DEFERRED.md`, which also lists the plan-level deferrals)
<!-- progress:end -->

Task totals are 0 until a stage starts and its task list is written (rule 2).

## Blockers

| ID | Blocker | Blocks (tasks/stages) | Owner | Since | Next action |
| --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | — |

## Open decisions affecting the next two stages

| Decision | What | Needed by | Owner | Status |
| --- | --- | --- | --- | --- |
| D22 | Where Redis runs | Stage 00 | Tech lead | Open |
| D23 | Atlas tier (M10+) and region | Stage 00 | Tech lead | Open |
| D2 | TypeScript for new modules | Stage 00 | Tech lead | Recommended: yes |
| D19 | API keys for clients | Stage 14 | Business | Decided: yes, at the end |
| D4 / D10 / D20 | CA questions Q1–Q3 | Stage 05 / 02 | Finance + CA | CA not engaged yet |

## Milestones

| Milestone | Planned (week) | Forecast | Actual date |
| --- | --- | --- | --- |
| Stage 00 done | 2 | | |
| Stage 02 done (hotels can register) | 7 | | |
| Stage 04 done (hotels manage rooms & rates) | 12 | | |
| Stage 08 done (first website booking end to end) | 18.5 | | |
| Pilot 1 starts (working system: hotels + website) | 21–26 | | |
| Stage 12 done (B2B clients book from the dashboard) | 27–32 | | |
| Pilot 2 starts (B2B clients) | 29–35 | | |
| Stage 14 done (API access live) | 32–38 | | |
| Public launch | 34–42 | | |
