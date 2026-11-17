# Stage 00 — Foundations (isolated `backend/src/b2b/`, existing behaviour untouched)

| | |
| --- | --- |
| **Phase** | A — hotels + website (working system) |
| **Duration** | ~2.5 weeks |
| **Depends on** | — |
| **Builds** | `backend/src/b2b/` (mount, worker and realtime entry points), `src/core`, safety guards, state-transition + reconciler kit, events-in-document relay, MongoDB job queue + scheduler, rate limiter, idempotency, tenant plugin, test harness on **standalone** MongoDB, protected-paths CI check, module generator |
| **Closes** | D2 (TypeScript), D21 (self-hosted realtime — SSE in the existing backend, ADR-0015), D22 (no Redis), D23 (database: unchanged until after launch), D24 (coding standards tooling), D26 (no third-party notification services), D28 (zero impact on the existing system) |

## 1. Goal

New code in the isolated folder `backend/src/b2b/` can be built to a senior standard **on the existing database as it is**, with **no change to existing backend logic, database settings, apps or working behaviour** (only the reviewed edits B1–B5) (`12-protecting-the-existing-system.md`). Every later stage has the building blocks it needs.

## 2. Scope

**In:** existing-system map (read-only), `backend/src/b2b/` setup with the two-line mount, zero-impact guards, core kernel, transaction-free consistency kit (state transitions, idempotent steps, reconciler, events-in-document relay), tenant plugin, idempotency, job queue + scheduler + rate limiter (no Redis), realtime base, test harness (standalone MongoDB + crash injection), CI with protected-paths check, module generator, ADRs, progress tracking.
**Out:** any business feature; any change to the production database server (D23 — after launch, optional).

## 3. Work breakdown

### 3.1 Map the existing system (day 1–2, read-only, no code changes)
AI editor produces `docs/existing-system-map.md` (prompt in `08-ai-editor-playbook.md` §2).

Already known (12 Nov 2026): production MongoDB is **self-hosted MongoDB 8.0** in Docker (`musafirbaba-mongo`), standalone; it **stays as it is until after launch** (D23). Local dev on **Atlas M0**. Mongoose 8.17, Express 5, plain JS (ESM) run by `node src/server.js` in one Docker container; no Redis, no tests, no DB transactions; payments on **PayU** (txn prefixes like `MBGO…`, surl/furl callbacks); realtime on **Ably**; one Next.js app serves the website and `/admin` (`proxy.ts` is fully commented out; catch-all route `(user)/[...slug]`); admins log in via `Staff`, website customers via `User`.

The map must still answer (all **read-only** checks):
- Production MongoDB: confirm standalone, disk/RAM/CPU headroom, current connection count and load; exact names of the `users`/`staffs` collections; **no existing collection uses any new prefix** (`12-…` D1).
- How the website `User` and admin `Staff` logins issue and carry tokens (header, localStorage or cookie; secret; expiry) so `/api/v1` can **verify** them without changing existing auth.
- PayU: existing txn-ID prefixes, callback URLs, whether a merchant-level webhook URL is set in the PayU dashboard (it must **not** be changed), verify/refund API usage.
- Frontend: exact files for edits E1–E3 (header nav, `(user)/bookings/page.tsx`, admin sidebar); **no CMS page, slug or sitemap URL starts with `/hotels`, `/business` or `/admin/b2b`**; where the frontend is deployed and how env vars are set.
- Storage (R2/Cloudinary/S3) and email (Resend) usage; existing app notification code — documented as **do-not-touch**.
- Deployment: how containers run on the server, host memory (for two new containers, ClamAV, Chromium), Cloudflare tunnel and how new hostnames are added without editing existing routes.

The vehicle-partner module (MBGO/MBConnect) is **out of scope** — don't map or reuse it.

### 3.2 `backend/src/b2b/` inside the existing backend + zero-impact guards
- New folder `backend/src/b2b/` (JavaScript ESM + JSDoc + `// @ts-check`, `jsconfig.json` for `tsc --noEmit`); tests in `backend/tests/b2b/`.
- **B1 — mount** (`12-…` §2): `b2b/mount.js` exports `mountB2B(app)`. If `B2B_ENABLED !== 'true'` it returns at once. Otherwise it registers `app.use('/api/v1', …)` right after the existing CORS block (so before the existing body parsers, cookie parser and audit interceptor) and loads `routes/v1.js` with a guarded dynamic `import()` — on failure it logs and answers `503` for `/api/v1` only. The `/api/v1` router has its own body parser (1 MB limit), request id, error handler and 404, and never calls `next()` back into the existing stack.
- **B2/B3 — package.json**: dev tools (`typescript` for checking, `vitest`, `supertest`, `mongodb-memory-server`) and scripts `test:b2b`, `typecheck:b2b`, `lint:b2b`, `format:b2b`, `b2b:migrate`, `b2b:guards`, `b2b:progress`, `b2b:gen-module`; exact versions; no runtime packages; existing scripts unchanged.
- **Own Mongoose instance**: `core/db/connection.js` creates `new mongoose.Mongoose()` (so the existing global audit plugin and default connection are not shared) and connects with the existing `MONGO_URI`; `autoIndex: false`, `autoCreate: false`, capped pool, default `maxTimeMS`, `strictQuery: true`.
- **Prefix guard**: every model registered on the new instance must carry an allowed prefix → otherwise start-up of the new code fails (and is contained by the guarded load). **Migration runner** (`npm run b2b:migrate`) creates indexes/validators/capped collections for new prefixes only.
- **`legacy-read/`**: read-only access to `users`/`staffs`/`sessions` with minimal schemas (`find` methods only); test proves writes are impossible.
- **Protected-paths CI check** (`12-…` §6) and lint for `src/b2b/**` only: no imports from the rest of `backend/src/`, existing notification/partner code, or `startSession`/`withTransaction`/`.watch(`; boundary rules; gitleaks.
- **Crash-isolation test**: start the existing app with a broken `src/b2b` file → existing routes still answer, `/api/v1` → `503`.
- No new containers, hostnames or Cloudflare routes: background work and live updates run inside the existing backend process (ADR-0015).

### 3.3 Core kernel (`src/core`)
- `money.js` (Money in paise), `dates.js` (`StayDate` strings, nights list, hotel-time-zone deadlines), `ids.js` (public reference generator with check char), `clock.js`, `errors.js` (typed errors + RFC 9457 mapper), `context.js` (`RequestContext`), `logger.js` (own JSON-lines logger with redaction — no package), `config.js` (zod-validated env).
- `db/tenant-plugin.js`: Mongoose plugin for tenant models — throws on unscoped queries unless `tenantScope: 'SYSTEM'` with `reason` (logged).
- `db/idempotency.js`: `withIdempotency(ctx, key, fn)` — `core_idempotency_keys` with unique `{scope, key}`, request hash, stored response, TTL 24 h.
- `http/`: request id, context builder, `requirePermission()`, zod `validate()`, idempotency-key header parser, error middleware, `helmet`, body limits.
- Query safety **without** global `sanitizeFilter`: `http/validate()` rejects `$`/`.` keys, zod `.strict()`; a test runs inventory-style operator updates with the production connection settings.

### 3.4 Transaction-free consistency kit (`01-architecture.md` §8 — P1–P5)
- `db/transition.js`: `transition(model, id, from, to, extra?, events?)` — one conditional single-document update (`{ _id, status: from }`) that also pushes `pendingEvents` (P1, P5); returns whether this caller won.
- `db/owned-counter.js`: helpers for "change a counter and record the owner id in the same update" and the exact undo (P2) — used by inventory and wallet.
- `db/events-relay.js`: the worker relay — documents with `hasPendingEvents: true` → `core_outbox` (unique `eventId`) → `core_jobs` per consumer → pull from source; `core_inbox` for consumer dedupe.
- `jobs/reconciler.js`: registry where modules register "stuck in status X for > N s → call `resume()`" rules (P3, P4); runs every 30 s under a lease lock; metrics + alert when an item is resumed more than 3 times.
- `db/invariants.js`: framework for scheduled invariant checks with alerting (modules register checks).

### 3.5 Background work, jobs and realtime base (no Redis — D22, `01-architecture.md` §8.2)
- `core/jobs`: MongoDB job queue (`core_jobs`, lease claim via `findOneAndUpdate`, backoff, `DEAD` + alert, `dedupeKey`) and scheduler (`core_schedules`, lease lock so each tick runs once); job registry.
- `core/rate-limit`: the in-house MongoDB rate limiter (`core_rate_limits`, TTL); `core/cache`: in-process LRU cache (`core/cache.js`), cleared by `cache:evict` signals.
- `core/realtime`: `realtime.publish(room, event, data)` → `rt_signals` (**capped** collection, 64 MB).
- **Self-hosted realtime** (`11-notifications-and-realtime.md`, ADR-0015): **Server-Sent Events** at `GET /api/v1/realtime/stream` in the existing backend; one **tailable cursor** on `rt_signals` per process; personal rooms from the login, public availability rooms on request; `Last-Event-ID` replay; limits per IP. Background loops (`background.js`) start in-process once the B2B database connects.

### 3.6 Test harness
- Vitest + **`MongoMemoryServer` in standalone mode** (same as production) + supertest + fast-check; factories; fixed clock.
- **Crash-injection helper**: run a flow, stop it after step *n* (for every *n*), run the reconciler, assert the invariants.
- `npm run test:b2b` runs the new tests; the existing `test` script is not changed.

### 3.7 CI/CD
- Install → lint → typecheck → boundary rules → protected-paths check → tests → audit → build image. Staging deploy on merge.
- **Existing-system smoke checks** after each staging deploy: `/api/app-home` 200, key website pages, admin login page, MBGO/MBConnect health calls.

### 3.8 Module generator & sample module
`npm run gen:module <name>` creates the anatomy from `01-architecture.md` §4.1 with sample route, service, domain, model (tenant plugin, prefix), repository, transitions, reconciler rule, events, tests and README. A sample `example` module proves everything end-to-end, including a crash-injection test; delete after Stage 01.

### 3.9 ADRs
0001 isolated `src/b2b/` folder inside the existing backend (flagged mount, guarded load, own Mongoose instance) · 0002 JavaScript + JSDoc + checkJs · 0003 **no multi-document transactions or change streams — patterns P1–P5** · 0004 tenant guard (repository + plugin) · 0005 events in document + outbox relay + MongoDB job queue (no Redis) · 0006 money in paise, stay dates as strings · 0007 public references · 0008 one booking engine for all channels · 0009 PayU payment flow (own callbacks and txn prefixes, verify before confirm, refund if rooms lost) · 0010 self-hosted realtime via capped `rt_signals` + stored inbox and catch-up (superseded by 0015: SSE inside the existing backend, no extra containers) · 0011 business area as `/business` path in the existing Next.js app, flagged edits E1–E4 only · 0012 derived balances for platform/hotel accounts · 0013 no global `sanitizeFilter` · 0014 zero-impact guards (prefix guard, legacy-read, protected paths).

### 3.10 Progress tracking
- Copy `docs/plan/templates/progress/` to `docs/progress/` (`STATUS.md`, `DEFERRED.md`, `SESSION-LOG.md`, `stage-progress-template.md`, `stages/stage-00.md` — pre-filled with this stage's tasks).
- Build `npm run progress`: reads task tables in `docs/progress/stages/*.md`, rewrites the generated block in `STATUS.md`; `--check` mode fails CI if the block is stale or a `DEFERRED` task has no `DEF-…` row.

## 4. Collections

`core_idempotency_keys` (`scope`, `key`, `requestHash`, `response`, `statusCode`, `expiresAt` TTL), `core_outbox` (`eventId` unique, `type`, `version`, `payload`, `occurredAt`), `core_inbox` (`eventId`, `consumer`, `processedAt`), `core_jobs`, `core_schedules`, `core_rate_limits`, `rt_signals` (capped), `core_migrations`.

## 5. API

`GET /api/v1/health` (Mongo reachable, job-queue lag, relay lag, reconciler last run), `GET /api/v1/meta/version`.

## 6. Security

| Threat | Control | Test |
| --- | --- | --- |
| Breaking the existing system | Flagged mount before existing middleware; guarded load; own Mongoose instance; prefix guard; legacy-read is read-only; `autoIndex`/`autoCreate` off; protected-paths CI; pool caps + timeouts | Guard tests; existing-system smoke checks; before/after collection checksums in the rehearsal (`12-…` §6) |
| NoSQL injection | zod strict + `$`/`.` key rejection | Injection payload test |
| Secrets in repo | gitleaks | CI |
| Unscoped tenant queries | Plugin throws | Unit test |

## 7. Mandatory tests

Prefix guard refuses a model without a new prefix; legacy-read cannot write; migration runner refuses an existing collection; `transition()` — two concurrent callers, exactly one wins; events relay — event published once even with two relays, never without its status change; reconciler resumes a flow stopped after every step (crash injection); job queue — two workers never run the same job; schedule ticks once with two workers; idempotency replay & key reuse; tenant plugin blocks unscoped queries; Money & reference property tests; lint catches `withTransaction` and a `backend/` import.

## 8. Definition of Done

- [ ] `docs/existing-system-map.md` merged (all §3.1 questions answered, incl. token handling, PayU dashboard settings, URL clash check)
- [ ] `/api/v1` live on staging behind `B2B_ENABLED`; no new containers; **existing files changed only by B1–B5**; crash-isolation test green
- [ ] Guards active: prefix guard, migration runner, legacy-read, protected-paths CI, transaction/change-stream lint
- [ ] Consistency kit (P1–P5) with crash-injection tests green on standalone MongoDB
- [ ] Background work (in the backend process) runs relay, reconciler, job queue and scheduler; a test event reaches a browser over SSE
- [ ] Existing-system smoke checks pass after deploy; MBConnect/MBGO notifications verified unchanged
- [ ] Lint/Prettier/jsconfig per `10-coding-standards.md` §13 active in CI
- [ ] ADRs 0001–0014 merged; `AGENTS.md` in repo root
- [ ] `docs/progress/` in place and current; `npm run progress -- --check` runs in CI

## 9. AI editor prompt

```
Read: AGENTS.md, docs/plan/12-protecting-the-existing-system.md, docs/plan/01-architecture.md §4 and §8, this stage §3.2–3.4.
Task: implement backend/src/b2b/core/db/transition.js, events-relay.js and jobs/reconciler.js, plus the prefix guard.
Constraints: work only inside backend/src/b2b/ and backend/tests/b2b/. Never edit other existing files (B1–B5 only in their own reviewed PR). No startSession/withTransaction/watch.
TypeScript strict.
Tests first (standalone MongoMemoryServer): two concurrent transition() calls → exactly one wins; event exists iff status changed;
two relays publish an event once; crash after each step → reconciler restores a consistent state; model without prefix → start-up fails.
Output: plan, code, tests, assumptions.
```
