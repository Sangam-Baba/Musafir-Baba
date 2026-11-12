# Session Log

> Append-only. One entry per working session (human or AI), **newest at the top**. The next session reads the last 3 entries before starting, so nobody starts cold.

<!-- Copy this block for each session -->

## 2026-11-12 — AI (Claude) — S00-T12, T16, T17, T19, T20, T21

- **Goal:** finish Stage 00's support tasks.
- **Done:** S00-T21 → DONE (`core/health.js`: ok/degraded/down, job lag, reconciler last run; 503 when the database is down). S00-T12 → DONE (`npm run b2b:progress` + `-- --check`, now in CI; counts in STATUS.md are generated from here on). S00-T19 → DONE (`docs/adr/0001`–`0014`). S00-T20 → DONE (`backend/src/b2b/AGENTS.md` + `CLAUDE.md`; template's realtime line and command list corrected). S00-T16 and S00-T17 marked DONE (harness and B2B CI already in place; staging deploy + existing-system smoke checks wait for a staging server). `docs/adr/` allowed in the guards. README: `DONE` = committed on the stage branch.
- **Not done / why:** S00-T18 module generator and S00-T06 lint tooling — next.
- **Files / PR:** `backend/src/b2b/core/health.js`, `routes/v1.js`, `backend/scripts/b2b/progress*.js`, `backend/src/b2b/{AGENTS,CLAUDE}.md`, `docs/adr/*`, `.github/workflows/b2b-guards.yml`, tests.
- **Tests run:** `npm run test:b2b` ✅ 202/202; `tsc` ✅; guards ✅; `b2b:progress -- --check` ✅.
- **Decisions / deferrals:** —
- **Next step:** S00-T18 — `npm run b2b:gen-module <name>` + sample module; S00-T06 — style tooling (check ESLint for lockfile drift first).


## 2026-11-12 — AI (Claude) — S00-T15 self-hosted realtime

- **Goal:** live notifications and availability updates without third-party services, Redis or change streams.
- **Done:** S00-T15 → DONE. `core/realtime/rooms.js` (personal rooms from the token; browsers may only join `availability:property:*`), `token.js` (HS256 on node:crypto, ≤ 15 min, audience `b2b-realtime`, timing-safe check), `signals.js` (`publish`, `publishCacheEvict` → capped `rt_signals`; `createSignalReader` with a tailable cursor, resumes from last id, skips signals older than 2 min after restart), `server.js` (Socket.IO: handshake token, ≤ 20 connections per IP, ≤ 20 public rooms per socket, 4 KB messages, `cache:evict` never sent to browsers), `realtime.js` process, `GET /api/v1/realtime/token`, config `B2B_REALTIME_SECRET` / `B2B_REALTIME_ORIGINS`, migration `0005-rt-signals`.
- **Not done / why:** new Cloudflare hostname for the realtime container — at first deploy; API-process cache eviction listener — when the first cache is used (Stage 06).
- **Files / PR:** `backend/src/b2b/core/realtime/*`, `routes/realtime.js`, `routes/v1.js`, `realtime.js`, `core/config.js`, `migrations/index.js`, `tests/b2b/realtime.test.js`; `package.json`: `socket.io` 4.8.1 (runtime, 18 packages added, none changed), `socket.io-client` 4.8.1 (dev).
- **Tests run:** `npm run test:b2b` ✅ 197/197 (real Socket.IO server + client: member receives org event via MongoDB; anonymous can follow availability, not personal rooms; other org receives nothing; forged token refused); `tsc` ✅; guards ✅; migration `0005` applied on dev; realtime process live on dev: health `database: up`, SIGTERM exit 0.
- **Decisions / deferrals:** realtime tokens signed with node:crypto (no `@types/jsonwebtoken`).
- **Next step:** S00-T21 health details, then Stage 00 tooling/docs tasks (module generator, ADRs, AGENTS.md, `npm run progress`).


## 2026-11-12 — AI (Claude) — S00-T14b rate limiter + cache

- **Goal:** request limits that work across processes and restarts, and a short-lived cache — without Redis or new packages.
- **Done:** S00-T14b → DONE. `core/rate-limit.js`: fixed-window counters in `core_rate_limits` (one upsert per call, duplicate-key retry), over-limit keys remembered in memory until the window ends (no further DB writes), `rateLimit(limiter, keyOf)` middleware (RateLimit-* headers, 429 `RATE_LIMITED` + Retry-After), `clientIp` (CF-Connecting-IP; existing app's `trust proxy` not changed). `core/cache.js`: LRU + TTL + `deletePrefix`. Migration `0004-core-rate-limits`.
- **Not done / why:** wiring limits onto real routes happens with those routes (login in Stage 01, booking in Stage 08).
- **Files / PR:** `backend/src/b2b/core/{rate-limit,cache}.js`, `migrations/index.js`, `tests/b2b/rate-limit-cache.test.js`; plan: rate limiter/cache now in-house (no `rate-limiter-flexible`, no `lru-cache`).
- **Tests run:** `npm run test:b2b` ✅ 190/190 (20 parallel calls across two limiters → exactly 10 allowed); `tsc` ✅; guards ✅; migration `0004` applied on dev.
- **Decisions / deferrals:** in-house instead of packages — no new runtime dependency in the existing app.
- **Next step:** S00-T15 — self-hosted realtime (Socket.IO reading `rt_signals`).


## 2026-11-12 — AI (Claude) — S00-T11 event relay

- **Goal:** deliver stored events (booking confirmed, KYC approved …) to their consumers exactly once, without transactions.
- **Done:** S00-T11 → DONE. `core/db/events-relay.js`: `relayOnce` (event → `core_outbox` with `_id = eventId` → `enqueue` per consumer with `dedupeKey` → `$pull` from the document → clear the flag only if no new event arrived), `createEventBus` (`subscribe`), `consumerJobHandlers` (`core_inbox` dedupe), `createEventRelay` (500 ms loop, skips overlapping passes). Worker runs it; registry `background.js` gains `eventBus` and `eventSources`. Scheduler also skips overlapping ticks. Routine background reads (`systemScope(reason, { routine: true })`) log at debug. Migration `0003-core-outbox-inbox` (90-day TTL).
- **Not done / why:** —
- **Files / PR:** `backend/src/b2b/core/db/events-relay.js`, `tenant-plugin.js`, `model.js`, `jobs/{reconciler,scheduler}.js`, `background.js`, `worker.js`, `migrations/index.js`, `tests/b2b/events-relay.test.js`.
- **Tests run:** `npm run test:b2b` ✅ 183/183 (repeat relay / crash before clearing → no duplicates; 3 relays at once → each event once; late event not lost; end-to-end state change → relay → jobs → each handler once; job run twice → handler once); `tsc` ✅; guards ✅; migration `0003` applied on dev; live worker start/stop ✅.
- **Decisions / deferrals:** —
- **Next step:** S00-T14b — rate limiter (MongoDB store) + in-process cache.


## 2026-11-12 — AI (Claude) — S00-T03 job queue + scheduler, S00-T14 worker wiring

- **Goal:** background work on MongoDB (no Redis) that is safe with several worker containers.
- **Done:** S00-T03 → DONE: `core/jobs/queue.js` (`enqueue` with dedupe, `claimNext` = one findOneAndUpdate with lease and crash takeover, `completeJob`/`failJob` only by the current owner, exponential backoff 5 s→1 h, `DEAD` after maxAttempts), `runner.js` (claim/run loop, idle back-off 0.5→5 s, clean stop), `scheduler.js` (lease-locked schedules, once across workers, crash takeover, error recorded); migration `0002-core-jobs-and-schedules`. S00-T14 → DONE: `worker.js` runs the job runner, reconciler every 30 s and invariant checks every 10 min; registry `background.js` for modules.
- **Not done / why:** rate limiter + cache split out as S00-T14b (total tasks now 22).
- **Files / PR:** `backend/src/b2b/core/jobs/{queue,runner,scheduler}.js`, `background.js`, `worker.js`, `migrations/index.js`, `tests/b2b/jobs.test.js`.
- **Tests run:** `npm run test:b2b` ✅ 176/176 (30 jobs × 2 racing workers → each once; 2 schedulers → once per interval; crash takeover; stale owner can't complete); `tsc` ✅; guards ✅; migration `0002` applied on dev; worker started live on dev, both schedules recorded a run, SIGTERM exit 0.
- **Decisions / deferrals:** —
- **Next step:** S00-T11 — events relay (`pendingEvents` → `core_outbox` → jobs per consumer, `core_inbox` dedupe).


## 2026-11-12 — AI (Claude) — S00-T08 consistency kit (no transactions)

- **Goal:** the building blocks that make "no double booking" work on the standalone production MongoDB.
- **Done:** S00-T08 → DONE. `core/db/transition.js` (one conditional update: status check + `statusChangedAt` + events; only options allowed are `systemScope` — no sessions), `core/db/events.js` (`newEvent` with `module.entity.pastVerb` types, `pendingEvents` fields), `core/db/owned-counter.js` (`applyOwned` with capacity check, `undoOwned`, `transferOwned` — owner recorded in the same document, pipeline updates, repeat-safe), `core/jobs/reconciler.js` (rules for stuck statuses, attempt counter, alert after 3), `core/db/invariants.js`.
- **Not done / why:** scheduling the reconciler every 30 s comes with the scheduler (S00-T03); the relay of `pendingEvents` to the outbox is S00-T11.
- **Files / PR:** `backend/src/b2b/core/{db,jobs}/*`, tests `consistency-kit.test.js` + test-only `helpers/sample-hold-flow.js` (miniature of the Stage 04 inventory flow with the real validator).
- **Tests run:** `npm run test:b2b` ✅ 166/166 — hold flow crashed after each of 5 steps and confirm flow after each of 5 steps → reconciler always restores a consistent state; 20 buyers / 3 rooms → exactly 3; overlapping stays → no night oversold; validator refuses impossible writes; 10 concurrent transitions → 1 winner. `tsc` ✅; guards ✅.
- **Decisions / deferrals:** Mongoose quirk recorded in code — a subdocument field named `type` must be declared as `{ type: String }`.
- **Next step:** S00-T03 — MongoDB job queue + lease-locked scheduler (then run the reconciler from the worker).


## 2026-11-12 — AI (Claude) — S00-T09 tenant guard, S00-T10 idempotency

- **Goal:** no org can reach another org's data; repeated requests never run twice.
- **Done:** S00-T09 → DONE: `tenantPlugin` / `defineTenantModel` — every query/update/delete/count/distinct/aggregate/bulkWrite on a tenant model must be scoped by an ownership field (concrete value, `$eq`, non-empty `$in`, `$and`, or `$or` with all branches scoped); `estimatedDocumentCount` always refused; new documents need an owner (create, insertMany, bulkWrite insert); cross-org work via `systemScope(reason)`, logged. S00-T10 → DONE: `withIdempotency` (claim → run → store response; replay; 422 `IDEMPOTENCY_KEY_REUSED`; 409 `IDEMPOTENCY_IN_PROGRESS`; lease takeover after a crash; record removed on failure so retries work), `hashRequest` (key-order independent), `idempotencyScope` per actor; migration `0001-core-idempotency-keys`.
- **Not done / why:** —
- **Files / PR:** `backend/src/b2b/core/db/{tenant-plugin,idempotency,model}.js`, `migrations/index.js`, tests.
- **Tests run:** `npm run test:b2b` ✅ 148/148 (incl. 15 unscoped-access attempts, 10 parallel double-clicks → 1 run); `tsc` ✅; `npm run b2b:guards` ✅; `npm run b2b:migrate` on dev ✅ (applied once, second run no-op).
- **Decisions / deferrals:** verified Mongoose 8.17.1 supports `bulkWrite` middleware and custom query options.
- **Next step:** S00-T08 — consistency kit (`transition()`, owned counters, reconciler registry).


## 2026-11-12 — AI (Claude) — S00-T13 HTTP layer

- **Goal:** safe request handling for every /api/v1 route.
- **Done:** S00-T13 → DONE. `core/http/validate.js` (forbidden keys `$…`, `a.b`, `__proto__`/`constructor`/`prototype` refused at any depth before zod; parsed input on `res.locals.input`), `context-middleware.js` (RequestContext per request, pluggable `authenticate`, anonymous until Stage 01), `permissions.js` (`publicRoute`, `requireCustomer`, `requirePermission` → 401/403), `protection.js` (API security headers, 15 s request timeout, UUID `Idempotency-Key` reader). Wired into `/api/v1`.
- **Not done / why:** real authenticators (business login, existing token verification, API keys) — Stage 01/14 as planned.
- **Files / PR:** `backend/src/b2b/core/http/*`, `routes/v1.js`, `tests/b2b/http-layer.test.js`, test helper `post()`.
- **Tests run:** `npm run test:b2b` ✅ 118/118 (incl. 5 injection payloads over HTTP); `tsc` ✅; `npm run b2b:guards` ✅.
- **Decisions / deferrals:** own security headers instead of `helmet` (no new runtime package).
- **Next step:** S00-T09 tenant plugin and S00-T10 idempotency helper.


## 2026-11-12 — AI (Claude) — S00-T07 core kernel

- **Goal:** shared building blocks for all B2B modules.
- **Done:** S00-T07 → DONE. `core/money.js` (immutable, integer paise, basis points, half-up, no negatives), `core/dates.js` (`StayDate`, `nightsOf` ≤ 30 nights, `addDays`, `hotelDeadline` in hotel time zone incl. DST, `todayIn`), `core/ids.js` (`MBO`/`MBH`/`MBHT`/`MBC` references, crypto-random Crockford base32 + Luhn mod 32 check char, `parseReference` with look-alikes), `core/errors.js` (typed errors → RFC 9457, unknown errors never leak), `core/logger.js` (JSON lines, redacts secrets/PII by key at any depth), `core/context.js` (frozen RequestContext, `systemContext` needs a reason), `core/http/problem.js` wired into `/api/v1` (404 + error handler).
- **Not done / why:** —
- **Files / PR:** `backend/src/b2b/core/*`, `backend/src/b2b/routes/v1.js`, tests `core-*.test.js`.
- **Tests run:** `npm run test:b2b` ✅ 104/104; `tsc` ✅; `npm run b2b:guards` ✅.
- **Decisions / deferrals:** logger written in-house instead of `pino` — no new runtime package in the existing app (plan updated).
- **Next step:** S00-T13 — HTTP layer (zod `validate()` with `$`/`.` key rejection, `requirePermission`, context builder).


## 2026-11-12 — AI (Claude) — S00-T05 guard checks + CI

- **Goal:** automatic checks so B2B work can never change existing code or dependencies.
- **Done:** S00-T05 → DONE. `npm run b2b:guards`: changed paths (only B2B folders, docs, B1–B3), `app.js` may only gain the mount lines, `package.json` additions only (scripts named `test:b2b`/`typecheck:b2b`/`b2b:*`), lockfile — no existing package changes version or disappears, code rules for `src/b2b` (no transactions/change streams, no default mongoose, `defineModel` only, no imports outside `src/b2b`, Clock for time, `@ts-check`, legacy-read read-only) and existing code must not import B2B code except `app.js → b2b/mount.js`. `.github/workflows/b2b-guards.yml`: b2b/* branches + PRs only, `ubuntu-latest`, read-only permissions.
- **Not done / why:** ESLint style rules (T06) — not added yet; needs a lockfile check because ESLint has many dependencies.
- **Files / PR:** `backend/scripts/b2b/*`, `backend/tests/b2b/guards.test.js`, `.github/workflows/b2b-guards.yml`, `package.json` (+ `b2b:guards`).
- **Tests run:** `npm run test:b2b` ✅ 78/78; `tsc` ✅; `npm run b2b:guards` ✅ against origin/main.
- **Decisions / deferrals:** found that `deploy-musafirbabaserver.yml` redeploys the backend on every push to `main` touching `backend/**` (O3 answered) — merging B2B work deploys it switched off; the deploy workflow is not changed.
- **Next step:** S00-T07 — core kernel (money, dates, ids, errors, logger).


## 2026-11-12 — AI (Claude) — S00-T04 zero-impact guards

- **Goal:** make it impossible for B2B code to write to existing collections.
- **Done:** S00-T04 → DONE. Allowed-prefix list in code (`core/db/prefixes.js`, aligned with plan §4.2: added `id_`, `file_`, `aud_`, `rt_`; audit never uses the existing `AuditLog`); `defineModel()` (B2B instance, explicit prefixed collection, strict) + start-up check in api/worker/realtime; migration runner with restricted context, prefix checks, `core_migrations` records and lease lock, `npm run b2b:migrate`; `legacy-read/` — `findCustomerById`, `findStaffById`, `findSessionById` (native `findOne` with fixed projections, `maxTimeMS` 2 s, no passwords).
- **Not done / why:** —
- **Files / PR:** `backend/src/b2b/core/db/{prefixes,model,migrations}.js`, `backend/src/b2b/legacy-read/index.js`, `backend/src/b2b/{migrate.js,migrations/index.js}`, tests; `package.json` (+ `b2b:migrate` script, dev dep `mongodb-memory-server` 10.1.4).
- **Tests run:** `npm run test:b2b` ✅ 46/46 (on standalone MongoDB 8.0.4 in memory); `tsc` ✅; `npm run b2b:migrate` on dev DB ✅ (only creates `core_migrations`).
- **Decisions / deferrals:** `mongodb-memory-server` pinned to 10.1.4 — newer versions bumped existing `debug`/`semver` (lockfile rule).
- **Next step:** S00-T05 — CI: protected paths, lockfile guard, lint bans for `src/b2b`.


## 2026-11-12 — AI (Claude) — S00-T02 `backend/src/b2b/` skeleton

- **Goal:** isolated B2B code inside the existing backend, switched off by default.
- **Done:** S00-T02 → DONE. `src/b2b/mount.js` (flag `B2B_ENABLED`, guarded dynamic import, never falls through to existing middleware), `routes/v1.js` (`/api/v1/health`, `/meta/version`), own Mongoose instance (`autoIndex`/`autoCreate` off, pool caps), config (zod), clock, request id, `worker.js`, `realtime.js` (health only), `jsconfig.json`. B1: 2 lines in `app.js`. B2: dev deps `vitest`, `typescript`, `@types/express` + scripts.
- **Not done / why:** owner direction changed mid-task — separate `b2b-backend/` app rejected; plan updated (§6.10) to "inside the existing backend, isolated".
- **Files / PR:** `backend/src/b2b/**`, `backend/tests/b2b/**`, `backend/src/app.js` (B1), `backend/package.json` + lockfile (B2/B3).
- **Tests run:** `npm run test:b2b` ✅ 11/11 (flag off = today's behaviour on the real app.js; crash isolation on the real app.js → 503 on /api/v1, existing routes fine; separate Mongoose instance doesn't get the existing audit plugin); `npm run typecheck:b2b` ✅; worker start/stop against dev DB ✅.
- **Decisions / deferrals:** lockfile rule — no existing package may change version (supertest dropped: it bumped `qs`, `form-data` and 5 others).
- **Next step:** S00-T04 — prefix guard, migration runner, read-only `legacy-read`.


## 2026-11-12 — AI (Claude) — S00-T01 Map the existing system

- **Goal:** read-only map of today's system for the new `b2b-backend/` service.
- **Done:** S00-T01 → DONE. `docs/existing-system-map.md` (logins, PayU, frontend entry points, DB names, deployment). Plan moved to `docs/plan/`; progress tracking set up in `docs/progress/`; branch `b2b/stage-00` from `origin/main`.
- **Not done / why:** owner checks O1–O5 need server/dashboard access (blocker B1).
- **Files / PR:** `docs/existing-system-map.md`, `docs/plan/**`, `docs/progress/**` — no existing code touched.
- **Tests run:** none (no code yet).
- **Decisions / deferrals:** PayU txn prefixes → `B2BH/B2BW/B2BS`; legacy-read also reads `sessions`; edit E1 = enable the existing Hotels tab. Plan file 12 updated.
- **Next step:** S00-T02 — create the isolated `backend/src/b2b/` skeleton with the flagged two-line mount.


## YYYY-MM-DD — <name or "AI (editor/model)"> — SNN-Txx <task name>

- **Goal:** what this session set out to do
- **Done:** what was finished (task IDs → new status)
- **Not done / why:** what's left and the reason (blocked? deferred → `DEF-…`?)
- **Files / PR:** main files touched, PR link
- **Tests run:** commands and results (e.g. `npm test` ✅, `npm run test:arch` ✅)
- **Decisions / deferrals:** new ADRs, `DEF-…` rows, plan changes
- **Next step:** the exact next task for the following session
