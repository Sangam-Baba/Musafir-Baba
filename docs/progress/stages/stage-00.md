# Stage 00 — Foundations (isolated `backend/src/b2b/`, existing behaviour untouched) · Progress

> Pre-filled from `docs/plan/stages/stage-00-foundations.md` so the first session can start straight away. Rules and status values: `docs/progress/README.md`.

| | |
| --- | --- |
| **Status** | IN_PROGRESS |
| **Phase · Track** | A · shared |
| **Owner(s)** | |
| **Started** | 2026-11-12 |
| **Finished** | — |
| **Plan file** | `docs/plan/stages/stage-00-foundations.md` |
| **Depends on** | — |

## Tasks

| ID | Task | Plan ref | Status | Owner | PR | Tests | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S00-T01 | Map the existing system → `docs/existing-system-map.md` (read-only; token handling, PayU dashboard settings, URL clash check, collection names/prefixes) | §3.1 | DONE | AI (Claude) | — | — | Map in `docs/existing-system-map.md`. Owner checks O1–O5 (§9) still open — tracked as blocker B1 |
| S00-T02 | `backend/src/b2b/` skeleton: `mount.js` (flag + guarded load), `/api/v1` router with health, own Mongoose instance, worker/realtime entry points, jsconfig; B1 two-line mount in `app.js`; B2 dev tools + scripts | §3.2 | DONE | AI (Claude) | | 11 ✅ | `src/b2b/` skeleton (mount, v1 router + health, own Mongoose instance, config, worker, realtime, jsconfig); B1 in `app.js`; B2 dev deps + scripts (lockfile: additions only) |
| S00-T03 | MongoDB job queue + scheduler (`core_jobs`, `core_schedules`, lease locks) — no Redis (D22) | §3.5 | DONE | AI (Claude) | | 176 ✅ | `core/jobs/queue.js` (claim with lease, backoff, DEAD, dedupe, stale owner can't complete), `runner.js` (idle backoff 0.5→5 s), `scheduler.js` (lease-locked, runs once across workers, crash takeover, errors recorded); migration `0002` applied on dev |
| S00-T04 | Zero-impact guards: connection (`autoIndex`/`autoCreate` off, pool caps, `maxTimeMS`), prefix guard, migration runner, `legacy-read` (read-only) | §3.2 | DONE | AI (Claude) | | 46 ✅ | `core/db/prefixes.js` + `defineModel` + start-up check; `core/db/migrations.js` + `npm run b2b:migrate` (prefix-checked, lease lock); `legacy-read/` (users/staffs/sessions, findOne only, no secrets). Pool caps/`autoIndex` off done in T02; default `maxTimeMS` per query comes with repositories |
| S00-T05 | Protected-paths CI check + lint bans (`backend/` imports, `startSession`/`withTransaction`/`watch`, existing notification/partner code) | §3.2 | DONE | AI (Claude) | | 78 ✅ | `npm run b2b:guards` (paths, app.js B1 lines only, package.json additions only, lockfile no version changes, code rules) + `.github/workflows/b2b-guards.yml` (b2b/* only, GitHub-hosted, read-only). Code rules done without ESLint (no new packages) |
| S00-T06 | ESLint boundary rules, Prettier, husky, lint-staged, gitleaks — per `10-coding-standards.md` §13 | §3.2 | TODO | | | | |
| S00-T07 | Core kernel: money, dates, ids, clock, errors (RFC 9457), context, logger, config | §3.3 | DONE | AI (Claude) | | 104 ✅ | `core/`: money (paise, bps, half-up), dates (StayDate, nightsOf, hotelDeadline with DST, todayIn), ids (Crockford + Luhn mod 32 check char), errors (RFC 9457), logger (own, redaction, no package), context; `/api/v1` 404 + problem handler |
| S00-T08 | Consistency kit: `transition()`, owned-counter helpers, events-in-document relay, reconciler registry, invariant framework (P1–P5) | §3.4 | DONE | AI (Claude) | | 166 ✅ | `transition()` + `stateFields`, `events.js` (`newEvent`, events stored in the document), `owned-counter.js` (`applyOwned`/`undoOwned`/`transferOwned` as single-document updates), `jobs/reconciler.js` (rules, attempts, alert > 3), `db/invariants.js`. Proven with a sample hold/confirm flow: crash after every step + 20-buyer and overlapping races on standalone MongoDB |
| S00-T09 | Tenant plugin (throws on unscoped queries; SYSTEM scope with reason) | §3.3 | DONE | AI (Claude) | | 148 ✅ | `core/db/tenant-plugin.js` + `defineTenantModel`: find/count/distinct/update/delete/findOneAnd*/aggregate/bulkWrite must be scoped by an ownership field (multi-party `$or` supported), `estimatedDocumentCount` blocked, new docs need an owner; `systemScope(reason)` logged |
| S00-T10 | Idempotency helper (`core_idempotency_keys`) | §3.3 | DONE | AI (Claude) | | 148 ✅ | `core/db/idempotency.js` (`withIdempotency`, `hashRequest`, `idempotencyScope`): replay, 422 reuse, 409 in progress, lease takeover, retry after failure; migration `0001-core-idempotency-keys` (unique + 24 h TTL) applied on dev |
| S00-T11 | Outbox + inbox: relay from `pendingEvents` → `core_outbox` → `core_jobs` | §3.4 | DONE | AI (Claude) | | 183 ✅ | `core/db/events-relay.js`: relay (pendingEvents → `core_outbox` → one job per consumer → pull; repeat-safe, several relays OK), event bus (`subscribe`), consumer jobs with `core_inbox` dedupe; worker runs relay every 500 ms (skips overlapping passes); routine system reads log at debug; migration `0003` applied on dev |
| S00-T12 | Progress tracking: copy `docs/plan/templates/progress/` → `docs/progress/`; build `npm run progress` (+ `--check` in CI) | §3.10 | TODO | | | | |
| S00-T13 | HTTP layer: request id, context builder, `requirePermission`, zod `validate()` with `$`/`.` key rejection, error middleware, helmet, body limits | §3.3 | DONE | AI (Claude) | | 118 ✅ | `validate()` (zod + forbidden `$`/`.`/prototype keys at any depth → `res.locals.input`), `contextMiddleware` (pluggable authenticator, anonymous until Stage 01), `requirePermission`/`requireCustomer`/`publicRoute`, own security headers + 15 s request timeout (no `helmet`), `readIdempotencyKey`. No global `sanitizeFilter` |
| S00-T14 | Rate limiter (Mongo store) + in-process cache with `cache:evict` | §3.5 | DONE | AI (Claude) | | live ✅ | `worker.js` runs job runner + schedules (reconciler 30 s, invariants 10 min) with graceful shutdown; registry `background.js`; verified live on dev (both schedules ran). Rate limiter + cache part moved to S00-T14b |
| S00-T14b | Rate limiter (MongoDB store) + in-process cache with `cache:evict` | §3.5 | DONE | AI (Claude) | | 190 ✅ | `core/rate-limit.js` (fixed windows in `core_rate_limits`, one upsert per call, in-memory block when over, `rateLimit()` middleware with RateLimit-*/Retry-After, `clientIp` via CF-Connecting-IP — existing `trust proxy` untouched), `core/cache.js` (LRU + TTL + `deletePrefix`); no packages; migration `0004` applied on dev |
| S00-T15 | Self-hosted realtime: realtime container `node src/b2b/realtime.js` (Socket.IO tailing capped `rt_signals`), `/api/v1/realtime/token`, `realtime.publish()`, new Cloudflare hostname | §3.5 | TODO | | | | No third-party service; don't touch existing Ably/Expo code |
| S00-T16 | Test harness: Vitest + **standalone** `MongoMemoryServer` + supertest + fast-check + factories + fixed clock + crash-injection helper | §3.6 | TODO | | | | |
| S00-T17 | CI pipeline: lint → typecheck → boundary → protected paths → tests → audit → build → progress check; existing-system smoke checks after staging deploy | §3.7 | TODO | | | | |
| S00-T18 | Module generator `npm run gen:module` + sample `example` module | §3.8 | TODO | | | | Delete sample after Stage 01 |
| S00-T19 | ADRs 0001–0014 | §3.9 | TODO | | | — | |
| S00-T20 | `AGENTS.md` (+ `CLAUDE.md` / editor rules file) in repo root; plan copied to `docs/plan/` | §3.9 | TODO | | | — | |
| S00-T21 | `/api/v1/health` (Mongo, job lag, relay lag, reconciler last run) + `/api/v1/meta/version` live on staging | §5 | TODO | | | | |

## Definition of Done (from the stage file)

- [ ] `docs/existing-system-map.md` merged (all §3.1 questions answered)
- [ ] `/api/v1` live on staging behind `B2B_ENABLED`; worker/realtime containers from the same image; existing files changed only by B1–B5; crash-isolation test green
- [ ] Guards active: prefix guard, migration runner, legacy-read, protected-paths CI, transaction/change-stream lint
- [ ] Consistency kit (P1–P5) with crash-injection tests green on standalone MongoDB
- [ ] Worker runs relay, reconciler, job queue and scheduler; a test event reaches a browser through Socket.IO
- [ ] Existing-system smoke checks pass after deploy; MBConnect/MBGO notifications verified unchanged
- [ ] Lint/Prettier/jsconfig per `10-coding-standards.md` §13 active in CI
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
