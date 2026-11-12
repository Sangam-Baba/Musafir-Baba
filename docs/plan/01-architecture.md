# 01 — Architecture

> If code disagrees with this file, either the code is wrong or an ADR changes this file first.

---

## 1. Decisions that shape everything

| Decision | Why |
| --- | --- |
| **Inside the existing backend, isolated** — new folder `backend/src/b2b/`, API mounted at `/api/v1` behind `B2B_ENABLED` (two-line edit in `app.js`), own Mongoose instance, worker and realtime as two extra containers from the same image (D28, `12-protecting-the-existing-system.md`) | One app, one database, one PayU account; existing routes, models, middleware, crons and Dockerfile are not changed, and a failure in the new code can't stop the existing app (guarded load) |
| **The existing MongoDB, as it is** — production: self-hosted MongoDB 8.0 (`musafirbaba-mongo`), **standalone, not reconfigured until after launch** (D23, D28); local dev: Atlas M0 | No multi-document transactions and no change streams → the new code uses single-document atomic steps, state documents, idempotent undo and a reconciler (§8); signals via a capped collection. Correct on standalone, and still correct if a replica set is enabled later (DEF-021) |
| **Modular monolith** — each module owns its collections, exposes a service interface, emits events | Fast to build; any module can become a separate service later |
| **One booking engine, one API for every channel** | Website, B2B dashboard and B2B API all call the same code → one source of truth for inventory |
| **No Redis for now** (D22) — MongoDB does the work | Background jobs, schedules, rate limits, usage counters, short caches and realtime signals all run on the existing MongoDB plus in-process memory (§8.2). Redis can be added later behind the same interfaces if load requires it (DEF-020) |
| **PayU** (existing gateway, D17) | Website payments, wallet top-ups, plan payments — no second gateway |
| **Self-hosted realtime: Socket.IO** in a new realtime process (`node src/b2b/realtime.js`), fed by a capped MongoDB collection (`rt_signals`, tailable cursor) (D21, D26) | Live notifications (bell) and "availability changed" signals with **no third-party service**. The existing app notifications (Ably/Expo, `services/notification/*`) are **not touched or reused**. Contract: `11-notifications-and-realtime.md` |
| **JavaScript (ESM) + JSDoc types + `// @ts-check`** for new backend code, like the existing backend — checked by `tsc --noEmit` in dev/CI (D2); frontend code in TypeScript | No build step added, so the existing deployment stays exactly as it is |
| **No new search cluster** — MongoDB indexes (2dsphere, text/collation) (production is self-hosted, so no Atlas Search) | One less system to run at your scale |

## 2. System context

```
   Website (Next.js)        Business area (same Next.js)     Client's own system        Admin panel (same Next.js)
   end customers            /client  and  /hotel areas       (API key)                  MusafirBaba staff
        │                          │                               │                          │
        └──────────────┬───────────┴───────────────┬───────────────┘                          │
                       ▼                           ▼                                          ▼
              ┌──────────────────── Existing backend (backend/, same process & image) ─────────────────────┐
              │  /api/...  existing routes, middleware, crons — NOT CHANGED                                 │
              │  /api/v1   NEW: src/b2b (mounted only if B2B_ENABLED, before existing middleware;          │
              │            own Mongoose instance) → modules (identity, orgs, kyc, hotel-*, orders, wallet…) │
              └──────────────────────────────────────┬──────────────────────────────────────────────────────┘
              extra containers, same image:          │        node src/b2b/worker.js   (jobs, reconciler, relay, sweeper)
                                                     │        node src/b2b/realtime.js (Socket.IO)
                                                     ▼
              ┌──────────── Existing MongoDB (standalone, unchanged settings) ──────────────┐   External: PayU (own
              │  existing collections (new code: read-only users/staffs/sessions only)      │   callbacks + B2B* txn
              │  NEW prefixed collections: org_ … hbk_ wal_ … core_jobs, rt_signals (capped)│   prefixes), Resend, R2
              └──────────────────────────────────────────────────────────────────────────────┘
                      rt_signals ──(tailable cursor)──► realtime process (Socket.IO, self-hosted) ──► open pages
```

## 3. Deployables

| Deployable | What | Notes |
| --- | --- | --- |
| `backend` (existing Express app) | Existing routes **plus** the new `/api/v1` from `src/b2b/` (only when `B2B_ENABLED=true`) | Same container, command and Dockerfile; the only edit is the two-line mount in `app.js` (B1) |
| (no separate API container) | The `/api/v1` API runs inside the existing backend process | Pool capped, timeouts, rate limits; heavy work goes to the worker (`12-…` D5) |
| `b2b-worker` (new container, same image, `node src/b2b/worker.js`) | Job runner on `core_jobs` + lease-locked schedules: event relay, **reconciler** (§8), hold sweeper, PayU status poller, derived account balances, notifications (inbox, email, escalations), PDFs, usage persistence, billing runs, webhooks | Lease locks make two instances safe; the existing container's crons are untouched |
| `b2b-realtime` (new container, same image, `node src/b2b/realtime.js`) | Self-hosted **Socket.IO** server: verifies realtime tokens, joins users to their rooms, reads `rt_signals` with a tailable cursor and emits | Own hostname via a **new** Cloudflare route (WebSockets); existing routes unchanged |
| `website` (existing Next.js) | **New** hotel search/detail/checkout pages calling `/api/v1` on the existing backend host; a flagged "Hotels" tab on the existing customer bookings page (edit E2 in `12-…` §5) | Website customers keep their existing account and dashboard |
| Business area (new route group in the **existing** Next.js app) | `/business/client/*` workspace for B2B clients, `/business/hotel/*` workspace for hotels; shared login and UI kit | Served as a **path** (`/business`) — no subdomain, so `proxy.ts` is untouched; its **own login**, separate from website customers and admin; split into its own app later only if needed (D14) |
| `admin` (existing `/admin` in the same Next.js app) | **New** pages under `/admin/b2b/*`: clients, hotels, KYC, bookings, finance, plans, usage | Existing `Staff` login token verified read-only (D1); sidebar links via flagged edit E3 |

## 4. Folder layout — one isolated folder inside the existing backend

```
backend/src/b2b/              # nothing outside this folder imports from it except app.js → mount.js
  mount.js                    # mountB2B(app): flag check + guarded dynamic import
  jsconfig.json               # type checking for the new JavaScript
  core/                       # shared kernel
      money.js  dates.js  ids.js  errors.js  context.js  clock.js
      db/ (connection with autoIndex/autoCreate off, prefix guard, tenant plugin, idempotency,
          events-in-document relay, state-transition helper, migration runner)
      jobs/ (job queue, scheduler, reconciler registry)  realtime/ (publish to rt_signals)
      http/ (error handler, validation, request context, permission guard)
      events/ (event bus, envelope types)
      logger.js  config.js
    modules/
      identity/       organizations/   access/        kyc/          files/
      notifications/  audit/           wallet/        payments/     orders/
      subscriptions/  metering/        billing/       api-access/   webhooks/
      documents/      reporting/
      hotel-catalog/  hotel-inventory/ pricing/       hotel-search/ hotel-booking/
    legacy-read/              # READ-ONLY access to existing users/staffs/sessions (find methods only)
    routes/v1.js              # the /api/v1 router (own body parser, errors, 404)
    worker.js  realtime.js    # entry points for the two extra containers
backend/tests/b2b/            # tests for the new code
  tests/ (shared test utils)
```

### 4.1 Module anatomy

```
modules/hotel-booking/
  index.js                 # PUBLIC: exports the service interface, types, event types — nothing else
  hotel-booking.service.js # use cases (application layer)
  domain/                  # pure business rules: entities, state machine, calculations (no Express, no Mongoose)
  models/                  # Mongoose schemas (collections prefixed `hbk_`)
  repository.js            # all DB access for this module (tenant-guarded)
  routes.js  controller.js # HTTP layer (thin)
  validators.js            # zod schemas for requests
  events.js                # event names + payload types
  permissions.js           # permission codes this module declares
  jobs.js                  # worker jobs owned by the module
  __tests__/
  README.md
```

**Boundary rules (enforced by ESLint `no-restricted-imports` / `dependency-cruiser`):**

1. A module imports another module **only through its `index.js`**.
2. A module **never reads or writes another module's collections**. Need data? Call its service or listen to its events.
3. `domain/` imports only `core/` pure helpers — no Express, no Mongoose, no network.
4. Shared modules (`orders`, `payments`, `wallet`, `pricing`, `documents`, `metering`…) **never import hotel modules**. Hotels plug into orders through a handler interface (§7).
5. Nothing in `src/b2b/` imports from the rest of `backend/src/`, and nothing there imports from `src/b2b/` except `app.js` → `b2b/mount.js`. Existing data is read only through `src/b2b/legacy-read/` (read-only, `12-…` D2).

### 4.2 Collection prefixes (like schemas)

| Module | Prefix | Module | Prefix |
| --- | --- | --- | --- |
| identity | `id_` | orders | `ord_` |
| organizations | `org_` | wallet | `wal_` |
| access | `acl_` | payments | `pay_` |
| kyc | `kyc_` | subscriptions | `sub_` |
| files | `file_` | metering | `mtr_` |
| notifications | `ntf_` | billing | `bil_` |
| audit | `aud_` (never the existing `AuditLog` — `12-…` D1) | api-access | `api_` |
| hotel-catalog | `htl_` | webhooks | `whk_` |
| hotel-inventory | `inv_` | documents | `doc_` |
| pricing | `prc_` | reporting | `rpt_` |
| hotel-booking | `hbk_` | core | `core_` (idempotency keys, outbox, jobs, migrations) |
| realtime | `rt_` (signals) | | |

The list is enforced in code by `backend/src/b2b/core/db/prefixes.js`.

## 5. Request pipeline (every `/api/v1` request)

```
requestId → helmet/CORS → body limits → authenticate (session JWT | API key | website customer token)
 → build RequestContext → org status check (active? KYC approved?) → subscription/entitlement check
 → rate limit (MongoDB store) → permission check (route-level) → validate (zod .strict) → controller → service
 → (after response) usage counter for billable routes → access log
```

```ts
interface RequestContext {
  requestId: string;
  channel: 'WEBSITE' | 'B2B_PORTAL' | 'B2B_API' | 'ADMIN' | 'SYSTEM';
  actor: { type: 'MEMBER' | 'CUSTOMER' | 'API_KEY' | 'ADMIN' | 'SYSTEM'; id: string };
  orgId?: string;          // the tenant (absent for website customers and pure platform calls)
  orgType?: 'PLATFORM' | 'CLIENT' | 'HOTEL';
  branchIds?: string[];    // if member is limited to branches
  permissions: Set<string>;
  viewAsBy?: string;       // admin "view as" (impersonation)
}
```

## 6. Tenancy (MongoDB has no row-level security — so we build the guard)

### 6.1 Ownership fields

| Document kind | Ownership fields | Who can read |
| --- | --- | --- |
| Single-owner (client users, client roles, client wallet, hotel properties, rates) | `orgId` | That org (+ platform admins) |
| **Multi-party** (orders, hotel bookings, invoices, cancellations) | `clientOrgId` (null for website), `customerId` (website), `hotelOrgId`, `propertyId` | Client org, the hotel org (limited view), the customer (own), platform admins |
| Platform data (cities, amenities, plans, tax rules) | none | Everyone (read), platform (write) |

### 6.2 Guard layers

1. **Repository rule:** every repository method takes `ctx` and builds the filter from it (`{ orgId: ctx.orgId }` or the multi-party rule). There is no method without `ctx`.
2. **Mongoose tenant plugin (safety net):** on tenant models, `pre` hooks for `find*`, `count*`, `update*`, `delete*`, `aggregate` **throw** if the query has no ownership filter — unless called with `.setOptions({ tenantScope: 'SYSTEM', reason: '…' })`, which is logged.
3. **System actor:** cross-org writes (booking takes rooms from a hotel's inventory; ledger moves money from client to hotel payable) run as `actor.type = 'SYSTEM'` inside the booking/ledger service only, are audited, and are never reachable directly from an HTTP handler.
4. **Not found, not forbidden:** other orgs' documents return `404`.
5. **Tests:** for every tenant collection/endpoint, an automated test proves org A cannot read/change org B data.
6. **Tenant id only from `ctx`** — never from body or query.

## 7. Orders and products (so flights/packages fit later)

- `orders` owns: order, payment link, invoice link, refunds, totals, status. Product-agnostic.
- Each product registers an **item handler**:

```ts
interface OrderItemHandler {
  productType: 'HOTEL';                                         // later 'FLIGHT', 'TRANSFER'…
  prepare(input, ctx): Promise<PreparedItem>;          // validate price token, re-price, HOLD inventory (idempotent by item id)
  confirm(item, ctx): Promise<ConfirmedItem>;          // hold → booked (idempotent; reconciler may call it again)
  release(item, reason, ctx): Promise<void>;           // release hold (idempotent)
  cancel(item, quote, ctx): Promise<CancelledItem>;    // return rooms, compute charges (idempotent)
  resume(item, ctx): Promise<void>;                    // reconciler entry: finish or undo a step left half-way
}
```

## 8. Consistency without multi-document transactions (D28)

Production MongoDB stays **standalone** until after launch, so there are **no multi-document transactions and no change streams**. The new code is written to be correct on that server, and it stays correct, unchanged, if a replica set is enabled later. Five patterns, used everywhere (helpers in `src/core`):

| # | Pattern | What it means |
| --- | --- | --- |
| P1 | **One document = one atomic step** | Every critical change is a single-document update with a condition (`$expr` capacity check, expected status, balance floor). MongoDB makes each one all-or-nothing, even on standalone |
| P2 | **Record the owner inside the same document** | When a step changes a shared counter (an inventory night, a wallet), the same update records who did it (`holds[]` entry with the hold id; wallet `ops[]` entry with the op id). Repeating the step does nothing (`$ne` on the id), and undoing it is exact (remove the id, reverse its amount) |
| P3 | **State document drives every multi-step flow** | Checkout, confirm, cancel, top-up, payout and billing runs each have one document (hold, order, booking, wallet op, run) whose status records how far the flow got. Steps run in a fixed order; each is idempotent; failure → undo finished steps in reverse |
| P4 | **Reconciler** | Every 30 s the worker finds flows stuck in a middle status for > 30 s (a crashed process) and finishes them — **forward if money was captured, backward otherwise**. Nothing waits for the crashed process to come back |
| P5 | **Events stored in the business document** | The update that changes the status also pushes the event into that document's `pendingEvents[]`. The relay copies it into `core_outbox` (unique `eventId`) and then removes it. An event exists if and only if the change happened |

| Concern | Model |
| --- | --- |
| Inventory | **Never oversold at any moment** — each night is a P1 conditional update + validator; multi-night all-or-nothing by P2/P3 undo within seconds (P4 within ~1 min after a crash) — see `05-…` |
| Client wallet balance | **Strong** — P1 conditional update with floor check + P2 op record |
| Ledger journal | **Complete within seconds** — each journal entry is one balanced document (unique by reference); P4 guarantees every wallet op gets its entry; hourly check: balance = Σ journal + pending ops |
| Platform & hotel account balances (revenue, tax, clearing, payables) | **Derived** — computed from the journal by the worker (no hot documents) |
| Search results | **Advisory** — may be up to ~30 s stale; booking always re-checks |
| Side effects (emails, PDFs, webhooks, reports) | Eventual — via P5 events + worker, retried |
| Usage counters | Buffered in the API process, written to MongoDB every ~2 s; quota checks may lag up to ~10 s; nightly reconciliation (§8.2) |

**Tests run on a standalone MongoDB** (same as production), and lint bans `startSession`, `withTransaction` and `.watch(` in new code. Crash-injection tests kill the process after every step and check the reconciler's result (`07-…`).

### 8.1 Events (P5) and the outbox

The relay reads documents with `hasPendingEvents: true` (partial index per collection) every 500 ms, inserts each event into `core_outbox` (unique `eventId`, so repeats are harmless), creates one `core_jobs` row per subscribed consumer, then pulls the event from the source document. Consumers store processed event ids (`core_inbox`) so a repeat is a no-op.

### 8.2 Without Redis — what MongoDB does instead (D22)

Redis is **not set up and not planned for now**. Everything it would have done runs on the existing MongoDB or in process memory. Each piece sits behind a small interface in `src/core` (`JobQueue`, `Scheduler`, `RateLimiter`, `Cache`, `RealtimePublisher`, `UsageRecorder`), so adding Redis later means writing a new adapter, not changing modules (DEF-020).

| Need | How it works without Redis | Notes |
| --- | --- | --- |
| Background jobs and retries | Own small job queue in `core_jobs`: `queue`, `payload`, `runAt`, `status` (`READY/RUNNING/DONE/DEAD`), `attempts`, `maxAttempts`, `lockedBy`, `lockedUntil`, `lastError`, `dedupeKey` (partial unique). The worker claims a job with one `findOneAndUpdate` (`READY` and `runAt ≤ now`, or `RUNNING` with an expired lock) and sets a 60 s lease, renewed for long jobs. Failure → exponential backoff; after `maxAttempts` → `DEAD` + alert + admin retry button | Index `{queue, status, runAt}`; TTL deletes `DONE` jobs after 7 days (fine here — job rows are not inventory) |
| Scheduled jobs (hold sweeper every 30 s, PayU poller every 2 min, escalation checks, nightly checks) | `core_schedules` with a lease lock taken by `findOneAndUpdate` on `lockedUntil`, so each tick runs **once** even with two worker containers | The legacy `node-cron` usage stays as it is; new jobs don't use it |
| Event relay | Worker reads pending events every 500 ms (§8.1) → `core_outbox` → one `core_jobs` row per consumer | Consumers dedupe with `core_inbox` |
| Live pushes to browsers | `realtime.publish(room, event, data)` inserts into `rt_signals`, a **capped collection** (64 MB). The `b2b-realtime` process reads it with a **tailable cursor** (works on standalone — no change streams) and emits to its own sockets; after a restart it continues from the last `_id` seen. Several realtime instances each read the same collection, so **no adapter is needed** | Signals older than 2 min are skipped on restart; the stored inbox + catch-up cover the gap (`11-…` §6). Fallback if tailable cursors are unavailable (checked in Stage 00 on Atlas M0): poll `_id > last` every 500 ms |
| Rate limits | `rate-limiter-flexible` (an open-source library, not a service) with its MongoDB store (`core_rate_limits`, TTL) for login, OTP, booking and API keys; `inMemoryBlockOnConsumed` so callers who are already blocked cost no database writes | Per-IP search limits can use the in-memory store while there is one API container |
| Short caches (entitlements, API-key lookups, optional search results) | In-process `lru-cache` with a short TTL; each API instance also clears entries when it sees `cache:evict` signals (it tails `rt_signals` for those only) | API-key revoke is effective in < 5 s (Stage 14) |
| Usage counters | The API buffers billable events in memory and flushes every 2 s or 200 events: one `insertMany` into `mtr_usage_events` + `bulkWrite` `$inc` upserts into `mtr_usage_daily` / `mtr_usage_monthly`; flush on graceful shutdown | A crash can lose ≤ 2 s of counts — always in the client's favour; nightly reconciliation. Quota checks read the monthly counter through a 10 s cache, so a quota can be exceeded by a few queries (accepted) |

**Extra load on MongoDB** (risk K17): jobs, rate limits and counters add small, indexed writes. Batching, `inMemoryBlockOnConsumed` and TTL indexes keep it low; MongoDB metrics (`serverStatus`, disk, CPU via the existing uptime monitoring) are watched from Stage 00. The single server must have enough CPU/RAM/disk headroom (D23).

**When to add Redis later (DEF-020):** more than two API containers and rate-limit writes are a visible share of MongoDB load; sustained job throughput above ~50 jobs/second; MongoDB CPU above 60 % caused by these infrastructure collections; or a need for exact (not soft) quotas at high volume.

## 9. Real-time updates

- The new system's live updates run on a **self-hosted Socket.IO** server (`realtime` process) — **no third-party service, no Redis**. The worker and API publish by inserting a row into `rt_signals` (capped collection); the realtime process reads it with a tailable cursor and emits to rooms. Full contract: **`11-notifications-and-realtime.md`**.
- The existing app notifications (`services/notification/*`, Ably, Expo push, `Notification` model) keep working exactly as today and are never imported by new code.
- Inventory-changing steps emit `inventory.changed` events (P5); the worker turns them into `cache:evict` and `availability:changed` signals for room `availability:property:{propertyId}` (debounced per property), so open hotel pages and dashboards show "availability changed — refresh price".
- In-app notifications are stored in `ntf_inbox` first, then emitted to `b2b:user:{id}` / `b2b:org:{id}`; browsers catch up over the API after any reconnect, so a missed push never loses a notification.
- Browsers connect with a short-lived realtime token from `GET /api/v1/realtime/token`; the server (not the browser) decides which rooms a socket joins. `availability:*` messages carry only property id and dates — never prices or guest data.
- Clients integrating via API get **webhooks** (Stage 14), produced from the **outbox** by the worker, once per event.

## 10. Performance approach

- Availability is precomputed per room type per date (`total`, `booked`, `held`); search never counts bookings.
- Search-result cache **off at first**; if the Stage 06 load test misses its budget, add a short in-process cache (30–60 s, `lru-cache`) evicted by `cache:evict` signals.
- Indexes designed with every query (listed in each stage); `explain()` checked for hot queries.
- Heavy work (PDFs, emails, webhooks, reports, usage persistence) runs in the worker.
- Reports read from a secondary (`readPreference: secondaryPreferred`) or from pre-aggregated collections.

## 11. Observability

- Structured JSON logs (pino) with `requestId`, `orgId`, `actorId`, `channel`; secrets/PII redacted.
- OpenTelemetry tracing (HTTP, Mongo, PayU) if feasible; at minimum request timing + Mongo slow-query logs.
- Business metrics: searches/min, booking success rate, payment success rate, holds expired, double-booking attempts blocked (should exist and be > 0 under load — it shows the guard works), wallet low balances.

## 12. Moving a module out later

Because modules talk through `index.js` services and events and own their collections, extracting one (e.g. `hotel-search`, `webhooks`) means: replace the in-process service with an HTTP client implementing the same interface, move its collections, point the event bus to a shared broker. No other module changes.

## 13. Environments

| Env | Purpose | Data |
| --- | --- | --- |
| local | Each developer's **Atlas M0 free tier** cluster via `MONGO_URI`, for running the app by hand. Atlas is a replica set, but the new code never uses transactions or change streams, so it behaves the same as production. Automated tests run on a **standalone** `MongoMemoryServer`. MinIO (or S3 dev bucket), Mailpit | Seed script; never production data |
| staging | Production-like; client test keys; PayU test mode | Synthetic only |
| production | Existing **self-hosted MongoDB 8.0** container `musafirbaba-mongo`, **unchanged** (standalone) until after launch + the existing backend container (now also serving `/api/v1` when enabled) + two new containers (`b2b-worker`, `b2b-realtime`) from the same image | Real; new collections also dumped hourly (read-only) from Stage 09 |

No production personal data in staging. Ever.

## 14. Users and dashboards (decided, D18)

| Who | Account | Dashboard |
| --- | --- | --- |
| Website customer (end user) | Existing website `User` — unchanged | Existing website dashboard; hotel bookings appear in the existing bookings page (`GET /api/v1/bookings/hotels` with the customer's token) |
| Client member (B2B) | New `id_users` + `org_members` | New business area `/client` |
| Hotel member | New `id_users` + `org_members` | New business area `/hotel` |
| MusafirBaba admin/staff | Existing `Staff` login (+ new permission layer, D1) | Existing `/admin` with new sections |

The **vehicle-partner module** (MBGO/MBConnect apps, `models/partner/*`, the `/partner` portal) is a separate business and is **not used or reused** by this system. New code never imports it.
