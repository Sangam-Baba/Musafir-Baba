# Stage 00 — Foundations in the Existing Backend

| | |
| --- | --- |
| **Phase** | A — hotels + website (working system) |
| **Duration** | ~2 weeks |
| **Depends on** | — |
| **Builds** | `src/core`, module generator, test harness, worker, Redis, outbox, idempotency, tenant plugin |
| **Closes** | D2 (TypeScript), D21 (self-hosted Socket.IO realtime), D26 (no third-party notification services), D22 (Redis hosting), D23 (Atlas tier), D24 (coding standards tooling) |

## 1. Goal

New code can be written to a senior standard inside the existing Express backend **without touching or breaking existing features**, and every later stage has the building blocks it needs.

## 2. Scope

**In:** existing-system map, replica-set check, TypeScript setup, folder structure, core kernel, Mongo transaction helper, tenant plugin, idempotency, outbox + worker, error handling, validation, logging, config, Redis, test harness, CI, module generator, ADRs.
**Out:** any business feature.

## 3. Work breakdown

### 3.1 Map the existing system (day 1–2, no code changes)
AI editor produces `docs/existing-system-map.md` (prompt in `08-ai-editor-playbook.md` §2).

Already known (12 Nov 2026): MongoDB on **Atlas** (replica set), Mongoose 8.17, Express 5, plain JS (ESM) run by `node src/server.js` in one Docker container; **no Redis**, no tests, no DB transactions yet; payments on **PayU** (the Razorpay util is unused); realtime on **Ably**; one Next.js app serves the website and `/admin`; admins log in via `Staff`, website customers via `User`.

The map must still answer:
- Atlas **tier and region** (D23) and the current Mongoose connection settings.
- PayU integration details: hash generation/verification, callback URLs, whether server-to-server webhooks are enabled, verify and refund API usage.
- How the website `User` and admin `Staff` logins issue tokens (so `/api/v1` can accept them).
- Storage (R2/Cloudinary/S3) and email (Resend) usage; the existing app notification code (Ably, Expo, `services/notification/*`) — documented as **do-not-touch**.
- Existing `AuditLog` schema and audit plugin.
- The existing website bookings page (`(user)/bookings`) and its API — hotel bookings will be added there.
- Deployment: Dockerfile, how the container is built/started, host memory (for Redis, worker, ClamAV, Chromium).

The vehicle-partner module (MBGO/MBConnect) is **out of scope** — don't map or reuse it.

**Blocker rule:** if the Atlas tier can't run transactions/change streams or lacks continuous backup, upgrading it is task #1.

### 3.2 TypeScript + structure
- `tsconfig.json` with `allowJs`, `strict`, path alias `@core/*`, `@modules/*`; build to `dist/`; dev with `tsx`.
- Create `src/core`, `src/modules`, `src/routes/v1.ts` mounted at `/api/v1` in the existing app (one line in the app entry).
- Build/deploy change: the backend has no build step today — update the Dockerfile and start script (build to `dist/` or run with `tsx`), then smoke-test existing routes.
- ESLint boundary rules (`no-restricted-imports`/`dependency-cruiser`), Prettier, husky, lint-staged, gitleaks — configured exactly as `10-coding-standards.md` §13 (new folders only; legacy code untouched).

### 3.3 Core kernel (`src/core`)
- `money.ts` (Money in paise), `dates.ts` (`StayDate` strings, nights list, hotel-time-zone deadlines), `ids.ts` (public reference generator with check char), `clock.ts`, `errors.ts` (typed errors + RFC 9457 mapper), `context.ts` (`RequestContext`), `logger.ts` (pino + redaction), `config.ts` (zod-validated env).
- `db/transaction.ts`: `withTransaction(fn)` wrapping `session.withTransaction` with snapshot read concern and majority write concern, logging retries.
- `db/tenant-plugin.ts`: Mongoose plugin for tenant models — throws on unscoped queries unless `tenantScope: 'SYSTEM'` with `reason` (logged).
- `db/idempotency.ts`: `withIdempotency(ctx, key, fn)` — `core_idempotency_keys` with unique `{scope, key}`, request hash, stored response, TTL 24 h.
- `db/outbox.ts`: `outbox.add(session, event)` → `core_outbox`; relay in worker (poll every 500 ms or change stream), publish to BullMQ, mark published; `core_inbox` for consumer dedupe.
- `http/`: request id, context builder, `requirePermission()`, zod `validate()`, idempotency-key header parser, error middleware, `helmet`, body limits.
- Query safety **without** global `sanitizeFilter` (it would break operator filters in new and legacy code): `http/validate()` rejects `$`/`.` keys, zod `.strict()`, `strictQuery: true` on new schemas; a test runs inventory-style operator updates with the production connection settings.

### 3.4 Redis + worker + realtime base
- Redis client (TLS in prod); BullMQ queues; `worker.ts` entry with graceful shutdown and job registry; scheduled jobs with a lock.
- Redis provisioned per D22 (persistence on, `maxmemory-policy noeviction` for BullMQ).
- **Self-hosted realtime** (`11-notifications-and-realtime.md`): new `realtime.ts` entry point and container running **Socket.IO** with `@socket.io/redis-streams-adapter`; handshake verifies a short-lived realtime JWT from `GET /api/v1/realtime/token`; server-side room joins; Redis **emitter** helper for the worker/API; health endpoint; hostname via the Cloudflare tunnel. The existing Express server and the existing Ably/Expo notification code are **not changed** (lint rule blocks imports).

### 3.5 Test harness
- Vitest + `MongoMemoryReplSet` + supertest + fast-check; factories package; fixed clock; `npm test` runs **new** tests only (old `"test": "exit 1"` replaced).

### 3.6 CI/CD
- GitHub Actions (or current CI): install → lint → typecheck → boundary rules → tests → audit → build. Staging deploy on merge.

### 3.7 Module generator & sample module
`npm run gen:module <name>` creates the anatomy from `01-architecture.md` §4.1 with sample route, service, domain, model (with tenant plugin), repository, events, tests and README. A sample `example` module proves everything end-to-end; delete after Stage 01.

### 3.8 ADRs
0001 modules inside existing backend · 0002 TypeScript with allowJs · 0003 Mongo replica set + transactions · 0004 tenant guard (repository + plugin) · 0005 outbox + BullMQ · 0006 money in paise, stay dates as strings · 0007 public references · 0008 one booking engine for all channels · 0009 PayU payment flow (verify before confirm, refund if rooms lost) · 0010 self-hosted Socket.IO realtime + stored inbox and catch-up, no third-party notification services · 0011 business area inside the existing Next.js app · 0012 derived balances for platform/hotel accounts · 0013 no global `sanitizeFilter`.

### 3.9 Progress tracking
- Copy `docs/plan/templates/progress/` to `docs/progress/` (`STATUS.md`, `DEFERRED.md`, `SESSION-LOG.md`, `stage-progress-template.md`, `stages/stage-00.md` — already pre-filled with this stage's tasks).
- Build `npm run progress`: reads task tables in `docs/progress/stages/*.md`, rewrites the generated block in `STATUS.md` (per-stage done/total, deferred, %, overall %); `--check` mode fails CI if the block is stale or a `DEFERRED` task has no `DEF-…` row.
- Add the progress checklist to the PR template and the rules to `AGENTS.md` (already in the templates).

## 4. Collections

`core_idempotency_keys` (`scope`, `key`, `requestHash`, `response`, `statusCode`, `expiresAt` TTL), `core_outbox` (`type`, `version`, `payload`, `occurredAt`, `publishedAt`), `core_inbox` (`eventId`, `consumer`, `processedAt`).

## 5. API

`GET /api/v1/health` (Mongo + Redis status), `GET /api/v1/meta/version`.

## 6. Security

| Threat | Control | Test |
| --- | --- | --- |
| Breaking existing app | New code isolated under `/api/v1`; existing middleware untouched | Smoke tests of existing key routes |
| NoSQL injection | zod strict + `$`/`.` key rejection | Injection payload test |
| Secrets in repo | gitleaks | CI |
| Unscoped tenant queries | Plugin throws | Unit test |

## 7. Mandatory tests

Transaction helper retries on write conflict; idempotency replay & key reuse; outbox exactly-once publish with two relays; tenant plugin blocks unscoped queries; Money & reference property tests; boundary lint catches a forbidden import.

## 8. Definition of Done

- [ ] `docs/existing-system-map.md` merged; Atlas tier/region confirmed (D23)
- [ ] `/api/v1/health` live on staging; existing site unaffected
- [ ] Sample module passes CI end to end; generator documented
- [ ] Worker runs outbox relay; Redis provisioned; `realtime` container live — a test event reaches a browser through Socket.IO
- [ ] Existing app notifications (MBConnect/MBGO) verified unchanged after deploy
- [ ] Lint/Prettier/tsconfig per `10-coding-standards.md` §13 active in CI for new folders
- [ ] ADRs 0001–0013 merged; `AGENTS.md` in repo root
- [ ] `docs/progress/` in place and current; `npm run progress -- --check` runs in CI

## 9. AI editor prompt

```
Read: AGENTS.md, docs/plan/01-architecture.md, docs/plan/02-engineering-standards.md §4–5, this stage §3.3.
Task: implement src/core/db/transaction.ts, idempotency.ts and tenant-plugin.ts.
Constraints: no changes to existing code except mounting /api/v1. TypeScript strict.
Tests first (MongoMemoryReplSet): withTransaction retries a write conflict; idempotent replay returns stored response;
same key + different body → IDEMPOTENCY_KEY_REUSED; tenant plugin throws on find() without orgId, allows SYSTEM scope with reason (logged).
Output: plan, code, tests, assumptions.
```
