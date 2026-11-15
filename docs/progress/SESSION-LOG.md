# Session Log

> Append-only. One entry per working session (human or AI), **newest at the top**. The next session reads the last 3 entries before starting, so nobody starts cold.

<!-- Copy this block for each session -->

## 2026-11-13 — AI (Claude) — Stage 01 started: task list, S01-T01 setup

- **Goal:** start Stage 01 (organisations, users, roles & permissions).
- **Done:** `stages/stage-01.md` with 20 tasks and the stage's choices (existing `bcrypt`/`jsonwebtoken` packages, new `B2B_AUTH_SECRET`, rotating refresh tokens, existing customer/staff tokens verified read-only with preview tokens refused, TOTP on node:crypto, Resend through an `EmailPort` job, admin MFA/roles in new collections, `aud_events`). S01-T01 → DONE: modules `identity`, `organizations`, `access`, `audit` (README, permissions, events, index), `core/permissions.js`, `permission-catalogue.js`, generator template updated, sample `example` module deleted.
- **Not done / why:** S01-T20 CAPTCHA waits for an owner decision (it needs an outside service).
- **Files / PR:** `backend/src/b2b/{core/permissions.js,permission-catalogue.js,modules/{identity,organizations,access,audit}/*}`, `backend/scripts/b2b/gen-module*.js`, `tests/b2b/permissions-catalogue.test.js`, `docs/progress/*`.
- **Tests run:** `test:b2b` ✅ 23 files / 217 tests; `typecheck:b2b` ✅; `lint:b2b` ✅; `b2b:guards` ✅; `b2b:progress -- --check` ✅.
- **Decisions / deferrals:** migrations are added per task together with each collection's indexes.
- **Later in the session:** S01-T02 → DONE (system roles as patterns; wildcards never grant sensitive permissions — found by the matrix test: Hotel Manager would otherwise get payout bank details; `acl_permissions` synced at background start). Tests ✅ 24 files / 257.
- **Later:** S01-T03 → DONE (`id_users`, password policy, lockout; dev deps `@types/bcrypt`, `@types/jsonwebtoken`). Tests ✅ 25 files / 267.
- **Later:** S01-T04 → DONE (sessions, rotating refresh tokens with reuse detection, refresh/logout/logout-all endpoints). Tests ✅ 26 files / 279.
- **Later:** S01-T05 → DONE (`POST /auth/login`, limits per IP/account, growing delay, lock event). Tests ✅ 27 files / 290.
- **Later:** S01-T06 → DONE (email codes, forgot/reset, sealed email jobs, Resend/log senders). Tests ✅ 28 files / 304.

## 2026-11-14 — AI (Claude) — S01-T07 two-step login

- **Goal:** authenticator-app two-step login, recovery codes, step-up — without affecting anything existing (owner's instruction).
- **Done:** S01-T07 → DONE (see stage file). Business-token authenticator brought forward from T12. Two fixes found on the way: the test GET helper silently dropped headers (one check had passed vacuously); SSE reconnect could deliver a replayed signal twice when the live feed lagged (now skipped per stream, with a test).
- **Not done / why:** —
- **Files / PR:** `backend/src/b2b/modules/identity/{domain/totp.js,models/mfa.model.js,mfa.service.js,mfa-challenge.js,mfa-routes.js,sign-in.js,business-auth.js}`, `routes/identity.js` (identity wiring moved out of `v1.js`), `core/{context,http/permissions,realtime/rooms,realtime/stream,db/idempotency}.js`, tests.
- **Tests run:** `test:b2b` ✅ 29 files / 318 (full suite twice); `typecheck:b2b` ✅; `lint:b2b` ✅; `b2b:guards` ✅ (existing backend diff vs `origin/main` still only `app.js` +5).
- **Decisions / deferrals:** event-free (two-step changes will be audited in T13 from session methods).
- **Later:** S01-T08 → DONE (organisations, members, branches, `/me`, org switcher, member permissions from system roles). Test helper gained `patch`. Tests ✅ 30 files / 325.
- **Later:** urgent live-site change on its own branch from `main` (rentals admin: vehicle page preview + author dropdown, frontend only, 4 files) → owner merged it as PR #219; merged `main` back into `b2b/stage-00` so the guards compare like with like.
- **Later:** S01-T09 → DONE (invitations, accept as new/existing user, remove member, Owner-only rule, last-Owner rule). Test helper gained `del`. Tests ✅ 31 files / 331.
- **Later:** S01-T10 → DONE (custom roles, role assignment with limits). Tests ✅ 32 files / 337.
- **Later:** S01-T11 → DONE (authorizer, list scoping, 60 s member-permission cache cleared on changes). Tests ✅ 33 files / 360.
- **Later:** S01-T12 → DONE (existing logins read-only, blocked orgs on /me, every route guarded — checked by a test). Tests ✅ 35 files / 383.
- **Fix:** live-updates catch-up could still repeat a signal when the live feed delivered it *during* the catch-up read (seen once in a full run: 3, 2, 3). Live signals are now held while a stream catches up and released in order without repeats (deterministic test added). The S01-T12 commit had been made while that flaky test failed — my command chain didn't stop on it; fixed in the next commit and the suite was then run 4× green.
- **Later:** S01-T13 → DONE (activity log from events, sign-in event, org and admin reads). Tests ✅ 36 files / 388.
- **Open:** one full-suite run (of ~12 today) had 1 failing test that could not be captured (no repeat in the next 7 runs). Every suite run now saves its full output so the next occurrence is identified and fixed at the cause.
- **Later:** S01-T14 → DONE (B2B admin pass with two-step login and a 7-day setup window, platform roles, admin orgs/users/staff API, suspend ends org sessions, grant-admin command). Tests ✅ 37 files / 397 (3× green).
- **Order changed (owner):** nothing was visible yet (server only), so the screens come first: T16 → T17 → T18, then T15.
- **Later:** S01-T16 → DONE (business sign-in pages, home, security; refresh cookie policy matched to the existing logins for production). Backend tests ✅ 398 (2× green); 6 new pages load on the dev server.
- **Later:** S01-T17 → DONE (Team page with four tabs, Activity page; member names and current permissions from the API). Note: the long-running local dev server once missed a new folder (404) — re-saving the file fixed it.
- **Later:** S01-T18 → DONE (admin gate, organisations, users, activity, organisation page with suspend/reactivate). Backend ✅ 398 (2× green); admin pages load on the dev server.
- **Later (owner):** couldn't open /admin/b2b — B2B roles are separate from the existing admin role by design; ran `b2b:migrate` + `b2b:grant-admin` for admin1@musafirbaba.com on **dev Atlas only**; added the Staff access tab; restyled the B2B admin pages with the existing admin UI kit (owner: "ui is not aligned"); local `.env` files given the B2B settings at the owner's request.

## 2026-11-15 — AI (Claude) — S01-T15 view-as, S01-T19 test suite, S01-T20 deferred

- **Goal:** finish Stage 01.
- **Done:** S01-T15 → DONE (view as client/hotel, read-only by default, 30 min, reason, owners emailed, banner + End view). S01-T19 → DONE (tenant isolation sweep over every Stage 01 collection; the other mandatory tests already existed). S01-T20 → DEFERRED (DEF-023, CAPTCHA needs an outside service — owner decision).
- **Not done / why:** Stage 01 sign-off is the owner's (fill in Finished).
- **Files / PR:** `backend/src/b2b/modules/identity/{view-as.service.js,models/view-as.model.js}`, `routes/{view-as,account,v1}.js`, migration `0017` (also applied on dev Atlas), `tests/b2b/{view-as,stage-01-tenant-isolation}.test.js`, frontend admin org page + business shell.
- **Tests run:** backend ✅ 39 files / 423 (2× green); typecheck ✅; lint ✅; guards ✅; pages load on the dev server.
- **Decisions / deferrals:** DEF-023.
- **Next step:** owner signs off Stages 00 and 01; Stage 02 after 3 decisions (KYC document storage, upload scanning without an extra container, unregistered hotels).
- **Later:** owner decided D29 (existing R2 bucket, private folder — so every file is encrypted before upload), D30 (strict checks, no scanner), D31 (unregistered hotels allowed with PAN + declaration). Stage 02 task list written. S02-T01 → DONE, S02-T02 → DONE. Tests ✅ 447 (2× green).
- **Later:** S02-T03 → DONE (signed 60-second links, downloads, access log).
- **Later:** S02-T04 → DONE (KYC rules, document sets as configuration, risk flags). Tests ✅ 2× green.
- **Later:** S02-T05 → DONE (hotel self-registration: owner + hotel org ONBOARDING + draft KYC application with risk flags + 48h email verification link + signed in; migration 0020). Tests ✅ 43 files / 469, 2× green.
- **Later:** S02-T06 → DONE (KYC application: edit details, attach/remove documents, submit/resubmit — repeat-safe, revision-checked; state machine table; resend verification link). Tests ✅ 44 files / 477, 2× green.
- **Later:** S02-T07 → DONE (PAN and bank account number sealed per field, bound to the org; last 4 shown; reviewer reveal recorded as an event; bank details required to submit). Tests ✅ 45 files / 480, 2× green.
- **Later:** S02-T08 → DONE (admin KYC review: queue, 30-minute lock, verdicts per document file, approve/reject, second approver for high risk, never your own org, full PAN/bank view recorded). Tests ✅ 46 files / 487, 2× green.
- **Later:** S02-T09 → DONE (approval activates the hotel in the background with the verified legal name; the hotel sees rejection reasons per document, marked resolved when replaced; owner emails/bell move to S02-T10). Tests ✅ 46 files / 490, 2× green.
- **Later:** S02-T10 → DONE (notifications: bell inbox from events — once per event and recipient, live push with ids/titles only, emails from versioned templates, catch-up, permission filter, preferences with critical lock, admin queue pushes; migration 0021). Escalations → DEF-024, delivery log + template editor → DEF-025. Tests ✅ 47 files / 497, 2× green.
- **Next step:** S02-T05 — hotel self-registration (`POST /registrations/hotel`: user + org ONBOARDING + KYC application, email verification, duplicate GSTIN flag).

## 2026-11-13 — AI (Claude) — S00-T15 revised: everything inside the one backend (ADR-0015)

- **Goal:** owner decision — exactly one backend app and one frontend app (musafirbaba.com; new pages as routes under it). No extra containers, hostnames or previews.
- **Done:** S00-T15 reworked (still DONE):
  - `worker.js`, `realtime.js`, the Socket.IO server, realtime tokens and `core/lifecycle.js` were removed.
  - `background.js` `startBackground()` now runs jobs, the scheduler (reconciler, invariants), the event relay and the signal reader **inside the backend process**, started by `routes/v1.js` after the B2B database connects. Every loop catches its own errors, all timers are unref'd, and no signal handlers are installed.
  - Live updates are **Server-Sent Events** at `GET /api/v1/realtime/stream` (`core/realtime/stream.js`): personal rooms from the login, ≤ 20 public availability rooms, 20 streams/IP, 5,000 in total, slow readers dropped, 25 s heartbeat, `Last-Event-ID` replay, `resync`.
  - `cache:evict` now clears shared caches (`createCache({ shared: true })`).
  - Config: `B2B_BACKGROUND` added; `B2B_REALTIME_PORT/SECRET/ORIGINS` removed. DB roles are now `api`/`cli`/`test`.
- **Not done / why:** —
- **Files / PR:**
  - Code: `backend/src/b2b/{background.js,routes/v1.js,routes/realtime.js,core/realtime/{stream,signals}.js,core/{cache,config}.js,core/db/connection.js,core/jobs/{runner,scheduler}.js,core/db/events-relay.js,migrate.js}`; `tests/b2b/realtime.test.js` rewritten.
  - Crash-isolation test now uses `B2B_BACKGROUND=maybe`. The old `B2B_REALTIME_PORT` trigger was no longer invalid, so that test had been passing for the wrong reason.
  - `package.json`: scripts `b2b:worker` and `b2b:realtime` removed; `socket.io` and `socket.io-client` uninstalled, so B2B now adds 0 runtime packages.
  - Docs: ADR-0015 (supersedes 0010, amends 0001); plan 01, 02, 03, 05, 06, 07, 08, 09 (D21, D28, K14), 10, 11, 12 (B2, B4, B5, D5, kill switches), stage 00/02/06 files, PR template, AGENTS template + copy, existing-system map (E4 drops `NEXT_PUBLIC_B2B_REALTIME_URL`).
- **Tests run:** `npm run test:b2b` ✅ 23 files / 214 tests; `typecheck:b2b` ✅; `lint:b2b` ✅; `b2b:guards` ✅ (lockfile: 237 dev packages added, 0 runtime, none changed).
- **Decisions / deferrals:** ADR-0015. If background load ever shows in `/api` response times, `startBackground()` can move to its own process with owner approval (no module changes).
- **Next step:** owner signs off Stage 00; then write the Stage 01 task list (organisations, users, roles & permissions).

## 2026-11-12 — AI (Claude) — S00-T06 lint/format, S00-T18 module generator

- **Goal:** finish Stage 00.
- **Done:** S00-T06 → DONE: `npm run lint:b2b` (ESLint 9 + `eslint-plugin-jsdoc` + Prettier check; config in `scripts/b2b/`; B2B folders only), `npm run format:b2b`; CI runs lint; secret scan added to `b2b:guards` (MongoDB URIs with passwords, AWS keys, private keys, Resend keys, secrets in env-style lines); all B2B files formatted; scheduler split into smaller functions. S00-T18 → DONE: `npm run b2b:gen-module` with templates (index, permissions, events, domain, tenant model, repository, service, validators, routes, README with migration, integration test); sample `example` module generated and tested (not mounted). Progress counter now shows `AWAITING_SIGN_OFF` when all tasks are done — only a human sets a stage `DONE` (by filling in Finished).
- **Not done / why:** git pre-commit hooks deferred (DEF-022) — they would change every developer's commit flow repo-wide.
- **Files / PR:** `backend/scripts/b2b/{eslint.config.js,prettier.json,gen-module*.js,guards*.js,progress-lib.js}`, `backend/src/b2b/modules/example/*`, `tests/b2b/{gen-module,modules/example}.test.js`, `.github/workflows/b2b-guards.yml`, `docs/progress/*`, AGENTS template + copy; `package.json`: dev deps `eslint` 9.39.1, `@eslint/js`, `eslint-plugin-jsdoc` 50.6.17, `prettier` 3.6.2 (dev only; no existing package changed) and scripts `lint:b2b`, `format:b2b`, `b2b:gen-module`.
- **Tests run:** `npm run test:b2b` ✅ 213/213; `lint:b2b` ✅; `tsc` ✅; `b2b:guards` ✅; `b2b:progress -- --check` ✅.
- **Decisions / deferrals:** DEF-022 (git hooks).
- **Next step:** owner reviews Stage 00 Definition of Done and fills in the Finished date; then Stage 01.


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
