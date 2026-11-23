# Project Status — MusafirBaba B2B Platform + Hotel Booking

> The one page that says where the build is. Rules: `docs/progress/README.md`.
> Numbers inside the generated block come from `npm run progress` — don't edit them by hand.

**Last updated:** 2026-11-21 by AI (Claude) · **Plan version:** v2.4 (zero-impact, no transactions) · **Branch:** `b2b/stage-00`

## Now

| | |
| --- | --- |
| **Phase** | A — hotels + website (working system) |
| **Current stage(s)** | Stages 00–12 + booking requests awaiting owner sign-off (00–07 live with hidden demo data; online booking and wallets switched off) · Phases A and B core built → **Pilot 1**, then Stage 13 |
| **Current task(s)** | — (Stage 12 part B B2B booking built: S12-T12 … T22) |
| **Next up** | **Build order (D36):** Pilot 1 → 13 → Pilot 2 → 14–16 · owner: push Stages 08–12B + migrations 0054–0069, GSTIN in pricing settings, bank details for wallet top-ups (`B2B_TOPUP_BANK_DETAILS`), switches for a ₹1 test, sign off Stages 00–12, CA review (D4 / D5 / D10 / D20, chart of accounts, invoice and credit note layout), lawyer on the closed wallet (D6) |
| **Blockers** | B1 — owner checks O1, O2, O4, O5 from the system map (don't block coding; block Stage 00 DoD / first deploy) |
| **Decisions needed soon** | Owner sign-off of Stages 00–03 · email delivery log / template editor before launch (DEF-025) · CAPTCHA provider (DEF-023) · CA engaged before Stage 05 (Q1–Q7, incl. unregistered-hotel tax treatment) |

## Stages

<!-- progress:start -->
| # | Stage | Phase | Status | Done / Total | Deferred | Progress | Started | Finished | Details |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 00 | Foundations (isolated `backend/src/b2b/`, existing behaviour untouched) | A | AWAITING_SIGN_OFF | 22 / 22 | 0 | 100 % | 2026-11-12 | — | [stage-00](stages/stage-00.md) |
| 01 | Organisations, users, roles & permissions | A | AWAITING_SIGN_OFF | 19 / 20 | 1 | 100 % | 2026-11-13 | — | [stage-01](stages/stage-01.md) |
| 02 | Hotel onboarding & KYC (+ notifications) | A | AWAITING_SIGN_OFF | 15 / 15 | 0 | 100 % | 2026-11-15 | — | [stage-02](stages/stage-02.md) |
| 03 | Hotel listings | A | AWAITING_SIGN_OFF | 14 / 14 | 0 | 100 % | 2026-11-15 | — | [stage-03](stages/stage-03.md) |
| 04 | Inventory & rates calendar | A | AWAITING_SIGN_OFF | 14 / 14 | 0 | 100 % | 2026-11-17 | — | [stage-04](stages/stage-04.md) |
| 05 | Pricing & GST | A | AWAITING_SIGN_OFF | 11 / 11 | 0 | 100 % | 2026-11-18 | — | [stage-05](stages/stage-05.md) |
| 06 | Search & availability (website first) | A | AWAITING_SIGN_OFF | 11 / 12 | 1 | 100 % | 2026-11-18 | — | [stage-06](stages/stage-06.md) |
| 07 | Payments (PayU) & ledger core | A | AWAITING_SIGN_OFF | 11 / 11 | 0 | 100 % | 2026-11-19 | — | [stage-07](stages/stage-07.md) |
| 08 | Booking engine (website first) | A | AWAITING_SIGN_OFF | 12 / 12 | 0 | 100 % | 2026-11-19 | — | [stage-08](stages/stage-08.md) |
| 09 | After booking & hotel operations | A | AWAITING_SIGN_OFF | 13 / 13 | 0 | 100 % | 2026-11-21 | — | [stage-09](stages/stage-09.md) |
| — | **Pilot 1 — hotels + website** (2–3 weeks) | A | NOT_STARTED | — | — | — | — | — | Stage 09 §10 checklist |
| 10 | B2B client onboarding & KYC | B | AWAITING_SIGN_OFF | 8 / 8 | 0 | 100 % | 2026-11-19 | — | [stage-10](stages/stage-10.md) |
| 11 | Client wallet & credit | B | AWAITING_SIGN_OFF | 11 / 11 | 0 | 100 % | 2026-11-21 | — | [stage-11](stages/stage-11.md) |
| 12 | B2B dashboard: search, booking & bookings | B | AWAITING_SIGN_OFF | 22 / 22 | 0 | 100 % | 2026-11-19 | — | [stage-12](stages/stage-12.md) |
| 13 | Subscriptions & usage billing | B | IN_PROGRESS | 9 / 10 | 0 | 90 % | 2026-11-23 | — | [stage-13](stages/stage-13.md) |
| — | **Pilot 2 — B2B clients** (2–3 weeks) | B | NOT_STARTED | — | — | — | — | — | Stage 12 §10 checklist |
| 14 | API access & webhooks | C | NOT_STARTED | 0 / 0 | 0 | 0 % | — | — | — |
| 15 | Hotel payouts, finance & reports | C | NOT_STARTED | 0 / 0 | 0 | 0 % | — | — | — |
| 16 | Hardening & public launch | C | NOT_STARTED | 0 / 0 | 0 | 0 % | — | — | — |

**Overall (stages with task lists):** 192 of 193 tasks done (99 %) · deferred on purpose: 2 (see `DEFERRED.md`, which also lists the plan-level deferrals)
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
