# Stage 00 — Foundations in the Existing Backend · Progress

> Pre-filled from `docs/plan/stages/stage-00-foundations.md` so the first session can start straight away. Rules and status values: `docs/progress/README.md`.

| | |
| --- | --- |
| **Status** | NOT_STARTED |
| **Phase · Track** | A · shared |
| **Owner(s)** | |
| **Started** | — |
| **Finished** | — |
| **Plan file** | `docs/plan/stages/stage-00-foundations.md` |
| **Depends on** | — |

## Tasks

| ID | Task | Plan ref | Status | Owner | PR | Tests | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S00-T01 | Map the existing system → `docs/existing-system-map.md` (no code changes) | §3.1 | TODO | | | — | Prompt in playbook §2 |
| S00-T02 | Confirm Atlas tier and region; upgrade if needed (D23) | §3.1 | TODO | | | — | Blocker rule if tier too small |
| S00-T03 | Decide and provision Redis (D22): persistence on, `noeviction` | §3.4 | TODO | | | — | |
| S00-T04 | TypeScript setup (`allowJs`, strict, path aliases) + folders `src/core`, `src/modules`, `/api/v1` mount | §3.2 | TODO | | | | |
| S00-T05 | Build/deploy change: Dockerfile + start script; smoke-test existing routes | §3.2 | TODO | | | | Touches the whole backend — review carefully |
| S00-T06 | ESLint boundary rules, Prettier, husky, lint-staged, gitleaks — per `10-coding-standards.md` §13 (new folders only) | §3.2 | TODO | | | | |
| S00-T07 | Core kernel: money, dates, ids, clock, errors (RFC 9457), context, logger, config | §3.3 | TODO | | | | |
| S00-T08 | `withTransaction` helper (snapshot / majority, retries logged) | §3.3 | TODO | | | | |
| S00-T09 | Tenant plugin (throws on unscoped queries; SYSTEM scope with reason) | §3.3 | TODO | | | | Cover `insertMany`, `bulkWrite`, `distinct`, `populate` |
| S00-T10 | Idempotency helper (`core_idempotency_keys`) | §3.3 | TODO | | | | |
| S00-T11 | Outbox + inbox + worker relay to BullMQ | §3.3 | TODO | | | | |
| S00-T12 | Progress tracking: copy `docs/plan/templates/progress/` → `docs/progress/`; build `npm run progress` (+ `--check` in CI) | §3.9 | TODO | | | | |
| S00-T13 | HTTP layer: request id, context builder, `requirePermission`, zod `validate()` with `$`/`.` key rejection, error middleware, helmet, body limits | §3.3 | TODO | | | | No global `sanitizeFilter` |
| S00-T14 | Worker entry point (graceful shutdown, job registry, locked scheduled jobs) | §3.4 | TODO | | | | |
| S00-T15 | Self-hosted realtime: `realtime` container (Socket.IO + Redis streams adapter), `/api/v1/realtime/token`, Redis emitter helper, Cloudflare hostname | §3.4 | TODO | | | | No third-party service; don't touch existing Ably/Expo code |
| S00-T16 | Test harness: Vitest + `MongoMemoryReplSet` + supertest + fast-check + factories + fixed clock | §3.5 | TODO | | | | |
| S00-T17 | CI pipeline: install → lint → typecheck → boundary rules → tests → audit → build → progress check | §3.6 | TODO | | | | |
| S00-T18 | Module generator `npm run gen:module` + sample `example` module | §3.7 | TODO | | | | Delete sample after Stage 01 |
| S00-T19 | ADRs 0001–0013 | §3.8 | TODO | | | — | |
| S00-T20 | `AGENTS.md` (+ `CLAUDE.md` / editor rules file) in repo root; plan copied to `docs/plan/` | §3.8 | TODO | | | — | |
| S00-T21 | `/api/v1/health` (Mongo + Redis) + `/api/v1/meta/version` live on staging | §5 | TODO | | | | |

## Definition of Done (from the stage file)

- [ ] `docs/existing-system-map.md` merged; Atlas tier/region confirmed (D23)
- [ ] `/api/v1/health` live on staging; existing site unaffected
- [ ] Sample module passes CI end to end; generator documented
- [ ] Worker runs outbox relay; Redis provisioned; `realtime` container live — a test event reaches a browser through Socket.IO
- [ ] Existing app notifications (MBConnect/MBGO) verified unchanged after deploy
- [ ] Lint/Prettier/tsconfig per `10-coding-standards.md` §13 active in CI for new folders
- [ ] ADRs 0001–0013 merged; `AGENTS.md` in repo root
- [ ] `docs/progress/` in place; `npm run progress -- --check` runs in CI

## Mandatory tests (from the stage file)

- [ ] Transaction helper retries on write conflict
- [ ] Idempotency replay returns stored response; same key + different body → `IDEMPOTENCY_KEY_REUSED`
- [ ] Outbox publishes exactly once with two relays running
- [ ] Tenant plugin blocks unscoped queries (incl. `insertMany`/`bulkWrite`/`distinct`/`populate`)
- [ ] Money and public-reference property tests
- [ ] Boundary lint catches a forbidden import
- [ ] Inventory-style operator updates work with the production Mongoose connection settings
- [ ] Realtime: invalid token refused; server-side room joins only; emit via Redis reaches the right room

## Left out on purpose in this stage

| Deferred ID | What | Moved to / revisit |
| --- | --- | --- |
| — | — | — |

## Changes from the plan

| Date | What differs from the stage file | Why | ADR |
| --- | --- | --- | --- |
| — | — | — | — |

## Notes and learnings

- …
