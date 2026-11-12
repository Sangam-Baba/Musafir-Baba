# AGENTS.md — Rules for AI Coding Agents (and Humans)

> Put in the backend repo root. Also copy as `CLAUDE.md` and your editor's rules file. Keep under ~300 lines.

## Project

MusafirBaba: Next.js frontend, **Node.js/Express** backend, **MongoDB (replica set)**. We are adding a **B2B platform** (clients, KYC, wallet, plans billed by usage, dashboard + API) and **hotel listing & booking** (sold on website + B2B) as new modules inside the existing backend. Payments: **PayU** (existing). Realtime for the new system: **self-hosted Socket.IO + Redis** (no third-party services); the existing app notifications (Ably/Expo) are not touched. The business area (client + hotel workspaces) is a route group inside the existing Next.js app.
Read before any task: `docs/plan/10-coding-standards.md` (how code must look), `docs/plan/01-architecture.md`, `docs/plan/02-engineering-standards.md`, `docs/plan/03-security-baseline.md`, `docs/plan/05-inventory-and-no-double-booking.md` (for anything touching rooms or bookings), the current stage file, and the module `README.md`.

## Commands

```
npm ci
npm run dev            # backend + worker (+ docker compose: mongo replset, redis)
npm run lint && npm run typecheck
npm test               # unit + integration for new code (MongoMemoryReplSet)
npm run test:arch      # module boundary rules
npm run migrate        # indexes, validators, data migrations
npm run gen:module <name>
npm run openapi
```

Done = lint, typecheck, test, test:arch all pass.

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

- New code only under `src/core` and `src/modules/<name>`. Don't modify existing code unless the task says so.
- Import another module **only via its `index.ts`**. Never its models, repository, domain or controllers.
- A module only touches **its own collections** (prefix table in `01-architecture.md` §4.2).
- `domain/` = pure logic: no Express, Mongoose, Redis, fetch.
- Cross-module side effects via **outbox events in the same transaction**.
- Shared modules (orders, wallet, payments, pricing, documents, metering…) never import hotel modules.
- **No HTTP/PayU/email/network calls inside a Mongo transaction.**

## Tenancy & security (hard rules)

- Every service method gets `ctx: RequestContext`; every repository method takes `ctx` (and `session` in transactions).
- Tenant id **only from `ctx`** — never from `req.body`/`req.query`.
- Tenant models use the tenant plugin; bypass only with `tenantScope: 'SYSTEM'` + `reason`, inside booking/ledger services.
- Every route: `requirePermission('...')` (or reviewed `public()`), and object-level `authz.assert()` after loading.
- Other orgs' documents → 404.
- zod `.strict()` on every input; reject `$`/`.` keys; never pass raw request objects into Mongo filters/updates. **Never enable global `sanitizeFilter`** — it breaks operator filters (`$gte`, `$expr`) used by inventory and wallet code.
- Never log secrets, tokens, OTPs, passwords, PAN, bank numbers, full phone/email.
- Never trust client amounts/prices. Never store card data.

## Inventory & money (hard rules)

- Take rooms only via `hotel-inventory` service methods using the conditional `$expr` update; check `modifiedCount === 1`; inside `withTransaction`.
- Never use TTL indexes for holds. Holds are released by the sweeper, guarded by `status: 'ACTIVE'`.
- Money = integer paise via `Money`; never floats. Rates in basis points.
- Wallet changes only through `wallet.post` / holds with conditional balance updates. Never "fix" balances directly.
- Money/booking POSTs require `Idempotency-Key` → `withIdempotency`.
- PayU payments: verify the hash **and** call PayU's verify API before confirming anything; never trust the browser redirect; if rooms were lost, issue an idempotent refund. No PayU calls inside a transaction.
- Only client wallet balances are updated inside transactions. Never write platform/hotel account documents (revenue, tax, clearing, payable) inside a booking transaction — append journal lines; the worker derives those balances.
- Unique indexes on optional fields: `partialFilterExpression`, never compound `sparse`.

## Code

- TypeScript strict (new code). No `any`, no `!`, no `@ts-ignore`, no default exports, no `enum` (use `as const`).
- Inject `Clock`; no `new Date()`/`Date.now()` outside it. Stay dates are `'YYYY-MM-DD'` strings; deadlines in hotel time zone.
- Public references via `newReference('MBH')`; no sequential ids except GST invoice series (≤ 16 chars).
- Typed errors from `@core/errors`; never swallow errors.
- Controllers: parse → service → map. No business logic.
- Mongoose schemas: `strict: 'throw'`, timestamps, indexes declared; created via migrations in prod.
- Events: `module.entity.pastVerb` + `version`; payload types in `events.ts`.
- No new dependency without justification.

## Tests

- Unit for domain; property tests (fast-check) for money, GST, pricing, availability, ledger.
- Integration with `MongoMemoryReplSet` for transactions, tenant guard, inventory races.
- Always test failure paths, permissions and tenant isolation. No tests that only assert mocks were called.

## Progress tracking (hard rules)

- Start every session by reading `docs/progress/STATUS.md`, the current `docs/progress/stages/stage-NN.md` and the last 3 entries of `docs/progress/SESSION-LOG.md`.
- Work on one task ID (`SNN-Txx`) at a time; set it `DOING` when you start.
- In the same PR as the code: update the task status, then run `npm run progress`.
- Never skip something the plan asks for silently: add a `DEF-…` row to `DEFERRED.md` and mark the task `DEFERRED`.
- End every session with a `SESSION-LOG.md` entry (goal, done, not done and why, PR, tests run, next step).
- Never mark a stage `DONE` yourself — a human confirms it.

## Notifications & realtime (hard rules)

- In-app notifications and emails only via the new `notifications` module (`notify(...)`), triggered by outbox events.
- Live pushes only via the notifications module's Socket.IO Redis emitter (self-hosted `realtime` server). Store the `ntf_inbox` row **before** pushing; pushes carry ids/titles only, never sensitive data.
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
