# Session Log

> Append-only. One entry per working session (human or AI), **newest at the top**. The next session reads the last 3 entries before starting, so nobody starts cold.

<!-- Copy this block for each session -->

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
