# 06 — API and Events

> One API (`/api/v1`) serves the website, the business portal (client + hotel workspaces), the admin panel and clients' own systems. The dashboard is just another API client — which is what makes "dashboard **or** API" free.

---

## 1. Conventions

| Topic | Rule |
| --- | --- |
| Base | `/api/v1/...` (new). Existing routes stay where they are |
| Areas | `/api/v1/...` client & website · `/api/v1/hotel/...` hotel workspace · `/api/v1/admin/...` platform admin (blocked for API keys) |
| Format | JSON, camelCase, UTF-8 |
| Money | `{ "amountPaise": 1100000, "currency": "INR" }` |
| Dates | Stay dates `YYYY-MM-DD`; instants ISO-8601 UTC |
| IDs | Public references (`MBH-…`) or opaque ids; clients must not parse them |
| Pagination | `?limit=50&cursor=…` → `{ data, nextCursor, hasMore }`; max 100 |
| Idempotency | `Idempotency-Key` (UUID) **required** on: create order, pay, cancel, refund, wallet top-up, amendment, hold extension. Stored 24 h per (org/customer, key). Same key + different body → `422 IDEMPOTENCY_KEY_REUSED` |
| Concurrency | `If-Match: <version>` on admin/hotel edits of rules, plans, listings → `412 VERSION_CONFLICT` |
| Refresh header | `X-MB-Refresh: realtime` marks an automatic refresh after a live availability signal → not billed. Honoured **only** for business-area sessions (never API keys), only on offers/price-check, max 1 per property per user per 60 s (extra ones are billed normally) |
| Errors | RFC 9457 problem details with stable `code` |
| Headers out | `X-Request-Id`; `RateLimit-Limit/Remaining/Reset`; `X-Usage-Metric`, `X-Quota-Remaining` on billable routes |
| Versioning | Breaking change → `/api/v2`; old version supported ≥ 6 months with `Deprecation` + `Sunset` headers. Within v1: additive only |
| Docs | OpenAPI 3.1 generated from zod; published in admin + to clients (Stage 14) |

## 2. Authentication by caller

| Caller | How |
| --- | --- |
| Business area users (client & hotel members) | Login in the business area of the existing Next.js app → its own httpOnly cookie (separate from website and admin) → JWT to API |
| Admin users | Existing `Staff` admin login (D1) + MFA → JWT with platform permissions |
| Website customers | Existing website auth (`User`); guest checkout via guest token; their hotel bookings are listed in the existing website dashboard |
| Client systems | API key `Authorization: Bearer mb_live_<prefix>_<secret>` (Stage 14) |
| PayU | Callback/webhook with response hash (no auth header); status always confirmed with PayU's verify API |

## 3. Endpoint catalogue (v1)

### 3.1 Accounts & orgs

| Method | Path | Permission |
| --- | --- | --- |
| POST | `/auth/login`, `/auth/otp/request`, `/auth/otp/verify`, `/auth/mfa/verify`, `/auth/refresh`, `/auth/logout`, `/auth/password/forgot`, `/auth/password/reset` | public (rate-limited) |
| GET | `/me` (user, active org, permissions) | authenticated |
| POST | `/registrations/client`, `/registrations/hotel` | public (bot-protected) |
| CRUD | `/members`, `/invitations`, `/roles`, `/branches` | `org.members.manage`, `org.roles.manage`, `org.branches.manage` |
| GET/PUT | `/kyc` , POST `/kyc/submit` | `org.kyc.manage` |
| POST | `/files/upload-url`, `/files/{id}/complete` | authenticated |

### 3.2 Hotel search & booking (client, website)

| Method | Path | Permission | Billable metric |
| --- | --- | --- | --- |
| GET | `/hotels/destinations?q=` | `hotel.search` | — (free, rate-limited) |
| POST | `/hotels/search` | `hotel.search` | `hotel.search` |
| GET | `/hotels/{propertyRef}` | `hotel.content.read` | — |
| POST | `/hotels/{propertyRef}/offers` | `hotel.search` | `hotel.offers` |
| POST | `/hotels/offers/price-check` | `hotel.search` | `hotel.pricecheck` |
| POST | `/orders` | `hotel.booking.create` | `hotel.booking` |
| POST | `/orders/{ref}/payments` | `order.pay` | — |
| GET | `/orders`, `/orders/{ref}` | `order.read` | — |
| GET | `/bookings/hotels`, `/bookings/hotels/{ref}` | `hotel.booking.read` | — |
| POST | `/bookings/hotels/{ref}/cancellation-quote` | `hotel.booking.cancel` | — |
| POST | `/bookings/hotels/{ref}/cancel` | `hotel.booking.cancel` | — |
| POST | `/bookings/hotels/{ref}/amendments` | `hotel.booking.amend` | — |
| GET | `/documents/{id}/download` | `document.read` | — |

Each billable call = 1 query (weights editable by admin), counted on **both dashboard and API** into one monthly pool per client (D3, decided). Usage visible to the client (`GET /usage`) and to admin (`GET /admin/usage`, `GET /admin/usage/{clientOrgId}`). Automatic live refreshes (`X-MB-Refresh`, see §1) are not counted; admin can set the booking weight to 0 so a client at its limit can still book.

### 3.3 Wallet, plans, usage

`GET /wallet`, `GET /wallet/transactions`, `POST /wallet/top-ups`, `POST /wallet/manual-top-ups`, `GET /wallet/statements`, `GET /subscription`, `GET /plans`, `POST /subscription/change`, `GET /usage`, `GET /billing/invoices`.

### 3.4 Integration (Stage 14)

`CRUD /api-keys`, `CRUD /webhook-endpoints`, `POST /webhook-endpoints/{id}/test`, `GET /webhook-deliveries`, `POST /webhook-deliveries/{id}/replay`.

### 3.4a Notifications and realtime (Stage 02)

`GET /realtime/token`, `GET /notifications?after=&limit=&unread=`, `GET /notifications/unread-count`, `POST /notifications/{id}/read`, `POST /notifications/read-all`, `POST /notifications/{id}/acknowledge`, `GET/PUT /notification-preferences`; admin `/admin/notifications/templates|deliveries|escalations`. Realtime itself is a self-hosted Socket.IO endpoint (`realtime.musafirbaba.com`). Contract: `11-notifications-and-realtime.md` §11.

### 3.5 Hotel workspace (`/api/v1/hotel/...`)

`CRUD /properties`, `/properties/{id}/room-types`, `/media`, `/policies`, `POST /properties/{id}/submit`, `CRUD /rate-plans`, `/cancellation-policies`, `GET /properties/{id}/calendar?from&to`, `PUT /properties/{id}/calendar` (bulk), `POST /calendar-imports`, `GET /bookings?view=arrivals|upcoming|cancelled`, `POST /bookings/{ref}/acknowledge`, `POST /bookings/{ref}/no-show`, `POST /bookings/{ref}/cannot-honour`, `GET /statements`, `GET /payouts`.

### 3.6 Admin (`/api/v1/admin/...`)

`/orgs` (clients & hotels; status, category, suspend), `/kyc-applications`, `/properties` (approve, request changes, suspend), `/margin-rules`, `/tax-rules`, `/plans`, `/subscriptions`, `/orders`, `/bookings`, `/offline-bookings`, `/refunds`, `/wallet-adjustments`, `/credit-limits`, `/payouts`, `/reports/*`, `/view-as`, `/audit`.

## 4. Error codes (initial)

| Code | HTTP | Meaning |
| --- | --- | --- |
| `VALIDATION_FAILED` | 400 | Bad input |
| `UNAUTHENTICATED` / `MFA_REQUIRED` | 401 | Login / step-up needed |
| `FORBIDDEN` | 403 | No permission (own org's resource) |
| `NOT_FOUND` | 404 | Not found or not yours |
| `VERSION_CONFLICT` | 412 | Edited by someone else |
| `SOLD_OUT` | 409 | No rooms left |
| `PRICE_CHANGED` / `PRICE_TOKEN_EXPIRED` | 409 | Re-price differs / token too old |
| `RESTRICTION_VIOLATED` | 422 | Min/max stay, closed to arrival/departure |
| `HOLD_EXPIRED` | 409 | Checkout took too long |
| `DUPLICATE_ORDER_SUSPECTED` | 409 | Identical open order exists (resend with `confirmDuplicate: true`) |
| `INSUFFICIENT_WALLET_BALANCE` | 402 | Not enough wallet + credit |
| `PAYMENT_FAILED` | 402 | Gateway declined |
| `CANCELLATION_NOT_ALLOWED` | 409 | Too late / not allowed |
| `ORG_NOT_ACTIVE` | 403 | KYC not approved or suspended |
| `ENTITLEMENT_REQUIRED` | 403 | Plan lacks this feature |
| `QUOTA_EXCEEDED` | 429 | Plan quota used up (hard limit) |
| `RATE_LIMITED` | 429 | Too many requests |
| `SUBSCRIPTION_SUSPENDED` | 402 | Unpaid plan |
| `IDEMPOTENCY_KEY_REUSED` | 422 | Same key, different request |
| `INTERNAL_ERROR` | 500 | Unexpected |

Codes are never renamed or reused.

## 5. Internal events

Envelope (stored in `core_outbox`, published to BullMQ):

```json
{ "id": "evt_…", "type": "hotelBooking.booking.confirmed", "version": 1,
  "occurredAt": "2026-11-12T10:00:00Z", "orgIds": { "client": "…", "hotel": "…" },
  "actor": { "type": "MEMBER", "id": "…" }, "correlationId": "<orderId>", "payload": { } }
```

Rules: past tense; payload = ids + essentials (no secrets/KYC data); add fields freely, but removing/renaming needs `version: 2`; consumers dedupe via `core_inbox`.

| Event | Producer | Consumers |
| --- | --- | --- |
| `organizations.org.registered` / `.activated` / `.suspended` | organizations | notifications, wallet (open accounts), subscriptions (trial) |
| `kyc.application.submitted` / `.approved` / `.rejected` | kyc | notifications, organizations |
| `hotelCatalog.property.published` / `.updated` / `.suspended` | hotel-catalog | hotel-search (cache), notifications |
| `hotelInventory.inventory.changed` | hotel-inventory | hotel-search (cache), realtime, webhooks |
| `pricing.rule.activated` | pricing | hotel-search (cache) |
| `orders.order.created` / `.confirmed` / `.failed` / `.expired` / `.cancelled` | orders | documents, notifications, webhooks, reporting |
| `hotelBooking.booking.confirmed` / `.cancelled` / `.noShow` / `.hotelFailed` / `.completed` | hotel-booking | notifications, wallet (payables), reporting, webhooks |
| `payments.payment.succeeded` / `.pending` / `.failed` · `payments.refund.processed` | payments | orders, wallet, notifications |
| `wallet.balance.low` / `.credited` | wallet | notifications, webhooks |
| `metering.quota.threshold` (80%, 100%) | metering | notifications, webhooks |
| `subscriptions.subscription.changed` / `.pastDue` / `.suspended` | subscriptions | gateway cache, notifications |

## 6. Webhooks to clients (Stage 14)

| Topic | Rule |
| --- | --- |
| Events | `booking.confirmed`, `booking.cancelled`, `booking.hotel_failed`, `booking.amended`, `payment.succeeded`, `refund.processed`, `wallet.low_balance`, `quota.threshold_reached`, `availability.changed` (opt-in, per property) |
| Payload | `{ id, type, apiVersion, createdAt, data: { … ids + essentials } }` |
| Signature | `MB-Signature: t=<unix>,v1=<hex HMAC-SHA256(secret, t + "." + rawBody)>`; receivers reject if older than 5 min |
| Delivery | At-least-once; dedupe by `id`; order not guaranteed (payload has `version`/`occurredAt`) |
| Retries | 1 m, 5 m, 15 m, 1 h, 3 h, 6 h, 12 h; then marked failed (manual replay); endpoint auto-disabled after 24 h of failures |
| Safety | HTTPS only, private-IP blocking, no redirects, 10 s timeout |
