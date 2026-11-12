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
| S00-T01 | Map the existing system → `docs/existing-system-map.md` (read-only; token handling, PayU dashboard settings, URL clash check, collection names/prefixes) | §3.1 | TODO | | | — | Prompt in playbook §2 |
| S00-T02 | `b2b-backend/` service: package.json, tsconfig, own Dockerfile, entry points api/worker/realtime, own env file | §3.2 | TODO | | | | Existing `backend/` must show zero diff |
| S00-T03 | MongoDB job queue + scheduler (`core_jobs`, `core_schedules`, lease locks) — no Redis (D22) | §3.5 | TODO | | | | |
| S00-T04 | Zero-impact guards: connection (`autoIndex`/`autoCreate` off, pool caps, `maxTimeMS`), prefix guard, migration runner, `legacy-read` (read-only) | §3.2 | TODO | | | | `12-protecting-the-existing-system.md` D1–D5 |
| S00-T05 | Protected-paths CI check + lint bans (`backend/` imports, `startSession`/`withTransaction`/`watch`, existing notification/partner code) | §3.2 | TODO | | | | |
| S00-T06 | ESLint boundary rules, Prettier, husky, lint-staged, gitleaks — per `10-coding-standards.md` §13 | §3.2 | TODO | | | | |
| S00-T07 | Core kernel: money, dates, ids, clock, errors (RFC 9457), context, logger, config | §3.3 | TODO | | | | |
| S00-T08 | Consistency kit: `transition()`, owned-counter helpers, events-in-document relay, reconciler registry, invariant framework (P1–P5) | §3.4 | TODO | | | | Crash-injection tests |
| S00-T09 | Tenant plugin (throws on unscoped queries; SYSTEM scope with reason) | §3.3 | TODO | | | | Cover `insertMany`, `bulkWrite`, `distinct`, `populate` |
| S00-T10 | Idempotency helper (`core_idempotency_keys`) | §3.3 | TODO | | | | |
| S00-T11 | Outbox + inbox: relay from `pendingEvents` → `core_outbox` → `core_jobs` | §3.4 | TODO | | | | |
| S00-T12 | Progress tracking: copy `docs/plan/templates/progress/` → `docs/progress/`; build `npm run progress` (+ `--check` in CI) | §3.10 | TODO | | | | |
| S00-T13 | HTTP layer: request id, context builder, `requirePermission`, zod `validate()` with `$`/`.` key rejection, error middleware, helmet, body limits | §3.3 | TODO | | | | No global `sanitizeFilter` |
| S00-T14 | Rate limiter (Mongo store) + in-process cache with `cache:evict` | §3.5 | TODO | | | | |
| S00-T15 | Self-hosted realtime: `b2b-realtime` (Socket.IO tailing capped `rt_signals`), `/api/v1/realtime/token`, `realtime.publish()`, new Cloudflare hostname | §3.5 | TODO | | | | No third-party service; don't touch existing Ably/Expo code |
| S00-T16 | Test harness: Vitest + **standalone** `MongoMemoryServer` + supertest + fast-check + factories + fixed clock + crash-injection helper | §3.6 | TODO | | | | |
| S00-T17 | CI pipeline: lint → typecheck → boundary → protected paths → tests → audit → build → progress check; existing-system smoke checks after staging deploy | §3.7 | TODO | | | | |
| S00-T18 | Module generator `npm run gen:module` + sample `example` module | §3.8 | TODO | | | | Delete sample after Stage 01 |
| S00-T19 | ADRs 0001–0014 | §3.9 | TODO | | | — | |
| S00-T20 | `AGENTS.md` (+ `CLAUDE.md` / editor rules file) in repo root; plan copied to `docs/plan/` | §3.9 | TODO | | | — | |
| S00-T21 | `/api/v1/health` (Mongo, job lag, relay lag, reconciler last run) + `/api/v1/meta/version` live on staging | §5 | TODO | | | | |

## Definition of Done (from the stage file)

- [ ] `docs/existing-system-map.md` merged (all §3.1 questions answered)
- [ ] `b2b-backend/` image runs as `b2b-api`, `b2b-worker`, `b2b-realtime` on staging; existing `backend/` has zero diff
- [ ] Guards active: prefix guard, migration runner, legacy-read, protected-paths CI, transaction/change-stream lint
- [ ] Consistency kit (P1–P5) with crash-injection tests green on standalone MongoDB
- [ ] Worker runs relay, reconciler, job queue and scheduler; a test event reaches a browser through Socket.IO
- [ ] Existing-system smoke checks pass after deploy; MBConnect/MBGO notifications verified unchanged
- [ ] Lint/Prettier/tsconfig per `10-coding-standards.md` §13 active in CI
- [ ] ADRs 0001–0014 merged; `AGENTS.md` in repo root
- [ ] `docs/progress/` in place; `npm run progress -- --check` runs in CI

## Mandatory tests (from the stage file)

- [ ] Prefix guard refuses a model without a new prefix; migration runner refuses an existing collection
- [ ] `legacy-read` cannot write
- [ ] `transition()`: two concurrent callers → exactly one wins; event exists iff status changed
- [ ] Relay publishes an event once with two relays running
- [ ] Reconciler restores a consistent state after a crash at every step (sample flow)
- [ ] Job queue: two workers never run the same job; schedule ticks once with two workers
- [ ] Idempotency replay returns stored response; same key + different body → `IDEMPOTENCY_KEY_REUSED`
- [ ] Tenant plugin blocks unscoped queries (incl. `insertMany`/`bulkWrite`/`distinct`/`populate`)
- [ ] Money and public-reference property tests
- [ ] Lint catches `withTransaction` and an import from `backend/`
- [ ] Inventory-style operator updates work with the production Mongoose connection settings
