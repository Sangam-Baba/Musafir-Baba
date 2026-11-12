# AGENTS.md — Rules for AI Coding Agents (and Humans)

> Put in `backend/src/b2b/AGENTS.md` and the new frontend folders (applies to the new B2B + hotel code only). Also copy as `CLAUDE.md` and your editor's rules file. Keep under ~300 lines.

## Project

MusafirBaba: Next.js frontend, **Node.js/Express** backend, **MongoDB (self-hosted, standalone — no multi-document transactions, no change streams)**. We are adding a **B2B platform** (clients, KYC, wallet, plans billed by usage, dashboard + API) and **hotel listing & booking** (sold on website + B2B) as new modules **isolated in `backend/src/b2b/`** inside the existing backend (`/api/v1`, switched on by `B2B_ENABLED`; worker and realtime run as separate processes). Payments: **PayU** (existing). Realtime for the new system: **self-hosted Socket.IO**, fed by the capped `rt_signals` collection through a tailable cursor (no third-party services, **no Redis**, no change streams — D22); the existing app notifications (Ably/Expo) are not touched. The business area (client + hotel workspaces) is a route group inside the existing Next.js app.
Read before any task: `docs/plan/10-coding-standards.md` (how code must look), `docs/plan/01-architecture.md`, `docs/plan/02-engineering-standards.md`, `docs/plan/03-security-baseline.md`, `docs/plan/05-inventory-and-no-double-booking.md` (for anything touching rooms or bookings), the current stage file, and the module `README.md`.

## Commands

All commands run in `backend/`. DB = your own Atlas M0 dev cluster via `MONGO_URI` — never production data.

```
npm ci
B2B_ENABLED=true npm run dev   # existing backend with /api/v1 switched on
npm run b2b:worker             # jobs, reconciler, invariants, event relay
npm run b2b:realtime           # Socket.IO (needs B2B_REALTIME_SECRET)
npm run b2b:migrate            # indexes, validators, capped collections (new prefixes only)
npm run lint:b2b               # ESLint + Prettier check (format:b2b fixes formatting)
npm run typecheck:b2b          # JSDoc type check of src/b2b, tests/b2b, scripts/b2b
npm run test:b2b               # unit + integration (standalone in-memory MongoDB 8.0)
npm run b2b:guards             # zero-impact checks against origin/main
npm run b2b:progress           # regenerate docs/progress/STATUS.md counts (-- --check in CI)
```

Done = `lint:b2b`, `typecheck:b2b`, `test:b2b`, `b2b:guards` and `b2b:progress -- --check` all pass.

## How to work

1. Restate the task; list files, collections, endpoints and tests you will touch. Wait for approval if asked.
2. Write failing tests first, then implement.
3. Touch only the modules named in the task. If something else must change, stop and ask.
4. Never invent requirements; list open questions.
5. End with: summary, files changed, migrations, assumptions, open questions, risks.

## Words

- B2B buyer company = **client**. Hotel supplier = **hotel** / **hotel org**. Property = one hotel listing.
- **Never use "partner" in new code** — it already means vehicle/driver partner in this codebase.
- Channels: `WEBSITE`, `B2B_PORTAL`, `B2B_API`, `ADMIN`, `SYSTEM`.
- Business users (client/hotel members) = new `id_users`. Website customers = existing `User` (their hotel bookings show in the existing website dashboard). Admins = existing `Staff`.
- The vehicle-partner module (MBGO/MBConnect, `models/partner/*`) is unrelated — never import, extend or reuse it.

## Architecture (hard rules)

- **Zero impact on the existing system** (`docs/plan/12-protecting-the-existing-system.md`): new backend code only in `backend/src/b2b/` (tests in `backend/tests/b2b/`); new frontend code only in new folders. **Never edit other files in `backend/`, `mobile/`, `mobile_user/` or existing frontend files** — the only exceptions are the approved edits B1–B5 and E1–E4. CI blocks anything else.
- Use the **new code's own Mongoose instance** (`core/db/connection.js`) — never the default `mongoose` import (it carries the existing global audit plugin). Write only new prefixed collections. Existing data (`users`, `staffs`, `sessions`) only through `legacy-read/` (read-only). Indexes only via the migration runner.
- Never import anything from the rest of `backend/src/`.
- Never change the database server, PayU dashboard settings, existing env files or existing Cloudflare routes.
- Import another module **only via its `index.js`**. Never its models, repository, domain or controllers.
- A module only touches **its own collections** (prefix table in `01-architecture.md` §4.2).
- `domain/` = pure logic: no Express, Mongoose, fetch.
- Cross-module side effects via **events pushed into the business document in the same single-document update** (relayed to the outbox).
- Shared modules (orders, wallet, payments, pricing, documents, metering…) never import hotel modules.
- **No multi-document transactions or change streams** — never `startSession`, `withTransaction`, `.watch()`. Multi-step flows use P1–P5 (`01-architecture.md` §8): conditional single-document steps, owner ids recorded in the same document, a state document, idempotent steps with undo, and a reconciler rule for every middle status.
- **No HTTP/PayU/email/network calls between the database steps of a flow** — drive them by events.

## Tenancy & security (hard rules)

- Every service method gets `ctx: RequestContext`; every repository method takes `ctx`.
- Tenant id **only from `ctx`** — never from `req.body`/`req.query`.
- Tenant models use the tenant plugin; bypass only with `tenantScope: 'SYSTEM'` + `reason`, inside booking/ledger services.
- Every route: `requirePermission('...')` (or reviewed `public()`), and object-level `authz.assert()` after loading.
- Other orgs' documents → 404.
- zod `.strict()` on every input; reject `$`/`.` keys; never pass raw request objects into Mongo filters/updates. **Never enable global `sanitizeFilter`** — it breaks operator filters (`$gte`, `$expr`) used by inventory and wallet code.
- Never log secrets, tokens, OTPs, passwords, PAN, bank numbers, full phone/email.
- Never trust client amounts/prices. Never store card data.

## Inventory & money (hard rules)

- Take rooms only via `hotel-inventory` service methods using the conditional `$expr` update; record the hold/booking id in the same update (`$ne`-guarded); check `modifiedCount === 1`; give back taken nights if a later night fails.
- Never use TTL indexes for holds. Holds are released by the sweeper/reconciler, guarded by status and by hold id.
- Money = integer paise via `Money`; never floats. Rates in basis points.
- Wallet changes only through `wallet.post` / holds with conditional balance updates that record the op id in `ops[]`. Never "fix" balances directly.
- Money/booking POSTs require `Idempotency-Key` → `withIdempotency`.
- PayU payments: verify the hash **and** call PayU's verify API before confirming anything; never trust the browser redirect; if rooms were lost, issue an idempotent refund. Own callback URLs and txn prefixes (`B2BH`, `B2BW`, `B2BS`).
- Only client wallet balances are LIVE. Never write platform/hotel account documents (revenue, tax, clearing, payable) from booking flows — append journal entries; the worker derives those balances.
- Unique indexes on optional fields: `partialFilterExpression`, never compound `sparse`.

## Code

- Backend: JavaScript ESM with JSDoc types and `// @ts-check` (checked by `npm run typecheck:b2b`). Frontend: TypeScript strict. No `any`, no `@ts-ignore`, no default exports, no enums (use `as const`).
- Inject `Clock`; no `new Date()`/`Date.now()` outside it. Stay dates are `'YYYY-MM-DD'` strings; deadlines in hotel time zone.
- Public references via `newReference('MBH')`; no sequential ids except GST invoice series (≤ 16 chars).
- Typed errors from `core/errors.js`; never swallow errors.
- Controllers: parse → service → map. No business logic.
- Mongoose schemas: `strict: 'throw'`, timestamps, indexes declared; created via migrations in prod.
- Events: `module.entity.pastVerb` + `version`; payload types in `events.js`.
- No new dependency without justification.

## Tests

- Unit for domain; randomised property checks (many generated cases in a loop) for money, GST, pricing, availability, ledger.
- Integration on **standalone** `MongoMemoryServer` (same as production) for flows, tenant guard, inventory races; **crash-injection tests** for every multi-step flow.
- Always test failure paths, permissions and tenant isolation. No tests that only assert mocks were called.

## Progress tracking (hard rules)

- Start every session by reading `docs/progress/STATUS.md`, the current `docs/progress/stages/stage-NN.md` and the last 3 entries of `docs/progress/SESSION-LOG.md`.
- Work on one task ID (`SNN-Txx`) at a time; set it `DOING` when you start.
- In the same PR as the code: update the task status, then run `npm run b2b:progress`.
- Never skip something the plan asks for silently: add a `DEF-…` row to `DEFERRED.md` and mark the task `DEFERRED`.
- End every session with a `SESSION-LOG.md` entry (goal, done, not done and why, PR, tests run, next step).
- Never mark a stage `DONE` yourself — a human confirms it.

## Notifications & realtime (hard rules)

- In-app notifications and emails only via the new `notifications` module (`notify(...)`), triggered by outbox events.
- Live pushes only via `realtime.publish()` (writes `rt_signals`; the self-hosted `realtime` server emits it). No Redis/BullMQ (D22): background work goes through `core/jobs`, limits through `core/rate-limit`, caches through `core/cache`. Store the `ntf_inbox` row **before** pushing; pushes carry ids/titles only, never sensitive data.
- **Never import or modify** the existing app notification code (`services/notification/*`, `utils/notifications.js`, `models/Notification.js`, `config/ably.js`) or the mobile apps. Never add a third-party messaging service or SDK (Ably, Expo, Firebase, WhatsApp/SMS providers) to new code.
- Frontend uses the `useRealtime` hook only (socket.io-client; handles tokens, reconnect, catch-up). Contract: `docs/plan/11-notifications-and-realtime.md`.

## Coding standards (hard rule)

- Every line of new code follows `docs/plan/10-coding-standards.md`. Don't reformat legacy code. If a rule blocks the task, stop and ask — never disable the lint rule.

## Humans must review

wallet · payments · orders · hotel-inventory · hotel-booking · access · tenant plugin · pricing/GST · auth · webhooks/SSRF.

## Do not

- Do not silently change ADR decisions — propose a new ADR.
- Do not change `src/core` inside a feature PR.
- Do not disable lint rules/tests to pass CI.
- Do not add TODOs without a ticket.

## Known mistakes (append as they happen)

- (example) Using `InventoryDay.findOne()` then `save()` to change counts — race condition. Always conditional `updateOne` with `$expr`.
- (example) Turning on `mongoose.set('sanitizeFilter', true)` — `held: { $gte: qty }` gets wrapped in `$eq` and hold release silently matches nothing.
