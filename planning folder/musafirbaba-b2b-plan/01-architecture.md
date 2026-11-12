# 01 — Architecture

> If code disagrees with this file, either the code is wrong or an ADR changes this file first.

---

## 1. Decisions that shape everything

| Decision | Why |
| --- | --- |
| **Build inside the existing Express backend** as isolated modules | One database, one deploy, one payment gateway (PayU), one login system for admins; reuses your team's skills |
| **MongoDB replica set** (Atlas — already in use) | Required for multi-document transactions (no double booking, wallet safety) and change streams (real-time updates). Confirm the Atlas tier: continuous backup/PITR needs M10+ (D23) |
| **Modular monolith** — each module owns its collections, exposes a service interface, emits events | Fast to build; any module can become a separate service later |
| **One booking engine, one API for every channel** | Website, B2B dashboard and B2B API all call the same code → one source of truth for inventory |
| **Redis** (new — not in the stack today, D22) | Queues (BullMQ, needs `maxmemory-policy noeviction`), rate limits, usage counters, short cache |
| **PayU** (existing gateway, D17) | Website payments, wallet top-ups, plan payments — no second gateway |
| **Self-hosted realtime: Socket.IO + Redis** in a new `realtime` process (D21, D26) | Live notifications (bell) and "availability changed" signals with **no third-party service**. The existing app notifications (Ably/Expo, `services/notification/*`) are **not touched or reused**. Contract: `11-notifications-and-realtime.md` |
| **TypeScript for new modules** (`allowJs` so existing JS keeps working) — fallback: JS + JSDoc types + zod | Types catch money/date/tenant mistakes early; AI editors produce better TS. The backend has no build step today, so this adds one (Dockerfile + start script change in Stage 00) |
| **No new search cluster** — MongoDB indexes (2dsphere, text/collation) or Atlas Search if on Atlas | One less system to run at your scale |

## 2. System context

```
   Website (Next.js)        Business area (same Next.js)     Client's own system        Admin panel (same Next.js)
   end customers            /client  and  /hotel areas       (API key)                  MusafirBaba staff
        │                          │                               │                          │
        └──────────────┬───────────┴───────────────┬───────────────┘                          │
                       ▼                           ▼                                          ▼
              ┌─────────────────────────── Existing Express backend ───────────────────────────────┐
              │  existing routes (website, CMS, vehicle partners…)  — untouched                    │
              │  /api/v1/... NEW: gateway middleware → modules (identity, orgs, kyc, hotel-*,       │
              │                 pricing, orders, wallet, payments, subscriptions, metering, …)     │
              └───────┬──────────────────┬───────────────────┬─────────────────────┬───────────────┘
                      ▼                  ▼                   ▼                     ▼
               MongoDB (replica set)   Redis (new)    Worker process         External: PayU,
               new prefixed            (cache, queues, (BullMQ jobs, outbox,  Email via EmailPort (D25),
               collections             counters,       sweepers, PDFs,       R2/Cloudinary
                                       Socket.IO       change-stream listener)
                                       adapter)
                                                       change-stream listener)
                      │
                      └── change streams ──► worker ──► Redis emitter ──► realtime (Socket.IO, self-hosted) ──► open pages
```

## 3. Deployables

| Deployable | What | Notes |
| --- | --- | --- |
| `backend` (existing Express app) | Existing routes + new `/api/v1` modules | Scale horizontally; stateless |
| `worker` (new entry point in same repo) | BullMQ consumers: outbox relay, hold sweeper, change-stream listener (cache invalidation + realtime emit), PayU status poller, derived account balances, notifications (inbox, email, escalations), PDFs, usage persistence, billing runs, webhooks | Same code base, second container, different start command; **one instance** (or a leader lock) runs the change-stream listener |
| `realtime` (new entry point in same repo) | Self-hosted **Socket.IO** server for the new system: verifies realtime tokens, joins users to their rooms, receives emits from the worker/API through the Redis adapter | Third container; own hostname (e.g. `realtime.musafirbaba.com`) via the Cloudflare tunnel; the existing Express server is not changed |
| `website` (existing Next.js) | Adds hotel search/detail/checkout pages calling `/api/v1`; hotel bookings added to the existing customer bookings page | Website customers keep their existing account and dashboard |
| Business area (new route group in the **existing** Next.js app) | `/client/*` workspace for B2B clients, `/hotel/*` workspace for hotels; shared login and UI kit | Served on `business.musafirbaba.com` via the existing `proxy.ts`; its **own login cookie**, separate from website customers and admin; split into its own app later only if needed (D14) |
| `admin` (existing `/admin` in the same Next.js app) | New sections: clients, hotels, KYC, bookings, finance, plans, usage | Reuse existing `Staff` admin login (D1) |

## 4. Folder layout inside the existing backend

```
backend/
  src/
    (existing folders untouched)
    core/                     # shared kernel for NEW code only
      money.ts  dates.ts  ids.ts  errors.ts  context.ts  clock.ts
      db/ (transaction helper, tenant plugin, idempotency, outbox)
      http/ (error handler, validation, request context, permission guard)
      events/ (event bus, envelope types)
      logger.ts  config.ts
    modules/
      identity/       organizations/   access/        kyc/          files/
      notifications/  audit/           wallet/        payments/     orders/
      subscriptions/  metering/        billing/       api-access/   webhooks/
      documents/      reporting/
      hotel-catalog/  hotel-inventory/ pricing/       hotel-search/ hotel-booking/
    routes/v1.ts              # mounts each module's router under /api/v1
  worker.ts                   # starts BullMQ workers
  tests/ (shared test utils)
```

### 4.1 Module anatomy

```
modules/hotel-booking/
  index.ts                 # PUBLIC: exports the service interface, types, event types — nothing else
  hotel-booking.service.ts # use cases (application layer)
  domain/                  # pure business rules: entities, state machine, calculations (no Express, no Mongoose)
  models/                  # Mongoose schemas (collections prefixed `hbk_`)
  repository.ts            # all DB access for this module (tenant-guarded)
  routes.ts  controller.ts # HTTP layer (thin)
  validators.ts            # zod schemas for requests
  events.ts                # event names + payload types
  permissions.ts           # permission codes this module declares
  jobs.ts                  # worker jobs owned by the module
  __tests__/
  README.md
```

**Boundary rules (enforced by ESLint `no-restricted-imports` / `dependency-cruiser`):**

1. A module imports another module **only through its `index.ts`**.
2. A module **never reads or writes another module's collections**. Need data? Call its service or listen to its events.
3. `domain/` imports only `core/` pure helpers — no Express, no Mongoose, no Redis.
4. Shared modules (`orders`, `payments`, `wallet`, `pricing`, `documents`, `metering`…) **never import hotel modules**. Hotels plug into orders through a handler interface (§7).
5. No module imports from the old code under `src/` except through a small, documented `legacy/` adapter (e.g. to read a website customer).

### 4.2 Collection prefixes (like schemas)

| Module | Prefix | Module | Prefix |
| --- | --- | --- | --- |
| identity | `id_` | orders | `ord_` |
| organizations | `org_` | wallet | `wal_` |
| access | `acl_` | payments | `pay_` |
| kyc | `kyc_` | subscriptions | `sub_` |
| files | `file_` | metering | `mtr_` |
| notifications | `ntf_` | billing | `bil_` |
| audit | `aud_` (or existing `AuditLog`) | api-access | `api_` |
| hotel-catalog | `htl_` | webhooks | `whk_` |
| hotel-inventory | `inv_` | documents | `doc_` |
| pricing | `prc_` | reporting | `rpt_` |
| hotel-booking | `hbk_` | core | `core_` (idempotency keys, outbox) |

## 5. Request pipeline (every `/api/v1` request)

```
requestId → helmet/CORS → body limits → authenticate (session JWT | API key | website customer token)
 → build RequestContext → org status check (active? KYC approved?) → subscription/entitlement check
 → rate limit (Redis) → permission check (route-level) → validate (zod .strict) → controller → service
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
  prepare(input, ctx, session): Promise<PreparedItem>;          // validate price token, re-price, HOLD inventory
  confirm(item, ctx, session): Promise<ConfirmedItem>;          // convert hold → booked
  release(item, reason, ctx, session): Promise<void>;           // release hold
  cancel(item, quote, ctx, session): Promise<CancelledItem>;    // return rooms, compute charges
}
```

## 8. Consistency model

| Concern | Model |
| --- | --- |
| Inventory changes | **Strong** — atomic conditional updates inside MongoDB transactions (see `05-…`) |
| Client wallet balance | **Strong** — transaction + conditional balance update (floor check) |
| Ledger journal | **Strong** — journal entry written in the same transaction as the business change |
| Platform & hotel account balances (revenue, tax, clearing, payables) | **Derived** — computed from the journal by the worker; never updated inside booking transactions (avoids one hot document that every booking would conflict on) |
| Search results | **Advisory** — may be up to ~30 s stale; booking always re-checks |
| Side effects (emails, PDFs, webhooks, reports) | Eventual — via outbox + worker, retried |
| Usage counters | Near real time in Redis; persisted to MongoDB every few seconds; daily reconciliation |

### 8.1 Outbox

Inside the same transaction as the business change, insert an event document into `core_outbox`. The worker reads unpublished events (or watches the collection via change stream), publishes to BullMQ, marks them published. Consumers store processed event ids (`core_inbox`) so a repeat is a no-op.

## 9. Real-time updates

- The new system's live updates run on a **self-hosted Socket.IO** server (`realtime` process) with the Redis adapter — **no third-party service**. The worker and API publish through the Socket.IO **Redis emitter**. Full contract: **`11-notifications-and-realtime.md`**.
- The existing app notifications (`services/notification/*`, Ably, Expo push, `Notification` model) keep working exactly as today and are never imported by new code.
- A **change stream** on `inv_inventory_days`, run **once, in the worker** (resume token stored), feeds: (a) cache invalidation in Redis, (b) an `availability:changed` emit to room `availability:property:{propertyId}` so open hotel pages and dashboards show "availability changed — refresh price".
- In-app notifications are stored in `ntf_inbox` first, then emitted to `b2b:user:{id}` / `b2b:org:{id}`; browsers catch up over the API after any reconnect, so a missed push never loses a notification.
- Browsers connect with a short-lived realtime token from `GET /api/v1/realtime/token`; the server (not the browser) decides which rooms a socket joins. `availability:*` messages carry only property id and dates — never prices or guest data.
- Clients integrating via API get **webhooks** (Stage 14), produced from the **outbox** by the worker — never from the change-stream listener.

## 10. Performance approach

- Availability is precomputed per room type per date (`total`, `booked`, `held`); search never counts bookings.
- Short Redis cache for search results (30–60 s), invalidated by inventory/pricing change events.
- Indexes designed with every query (listed in each stage); `explain()` checked for hot queries.
- Heavy work (PDFs, emails, webhooks, reports, usage persistence) runs in the worker.
- Reports read from a secondary (`readPreference: secondaryPreferred`) or from pre-aggregated collections.

## 11. Observability

- Structured JSON logs (pino) with `requestId`, `orgId`, `actorId`, `channel`; secrets/PII redacted.
- OpenTelemetry tracing (HTTP, Mongo, Redis, PayU) if feasible; at minimum request timing + Mongo slow-query logs.
- Business metrics: searches/min, booking success rate, payment success rate, holds expired, double-booking attempts blocked (should exist and be > 0 under load — it shows the guard works), wallet low balances.

## 12. Moving a module out later

Because modules talk through `index.ts` services and events and own their collections, extracting one (e.g. `hotel-search`, `webhooks`) means: replace the in-process service with an HTTP client implementing the same interface, move its collections, point the event bus to a shared broker. No other module changes.

## 13. Environments

| Env | Purpose | Data |
| --- | --- | --- |
| local | Docker Compose: Mongo replica set (single node, `--replSet`), Redis, MinIO (or S3 dev bucket), Mailpit | Seed script |
| staging | Production-like; client test keys; PayU test mode | Synthetic only |
| production | Existing Atlas cluster (confirm `ap-south-1` and tier, D23) + existing Docker host for backend and worker | Real |

No production personal data in staging. Ever.

## 14. Users and dashboards (decided, D18)

| Who | Account | Dashboard |
| --- | --- | --- |
| Website customer (end user) | Existing website `User` — unchanged | Existing website dashboard; hotel bookings appear in the existing bookings page (`GET /api/v1/bookings/hotels` with the customer's token) |
| Client member (B2B) | New `id_users` + `org_members` | New business area `/client` |
| Hotel member | New `id_users` + `org_members` | New business area `/hotel` |
| MusafirBaba admin/staff | Existing `Staff` login (+ new permission layer, D1) | Existing `/admin` with new sections |

The **vehicle-partner module** (MBGO/MBConnect apps, `models/partner/*`, the `/partner` portal) is a separate business and is **not used or reused** by this system. New code never imports it.
