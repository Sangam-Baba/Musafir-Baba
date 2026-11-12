# 02 — Engineering Standards (Node.js · Express · MongoDB · Next.js)

> Line-by-line coding rules (with do/don't examples and tool configs) are in **`10-coding-standards.md`** — this file covers engineering principles and system rules.
> The bar: code a 10–15-year engineer is happy to be paged for at 3 a.m. Readable before clever. Explicit before magical. Enforced by tooling where possible, by review where not.

---

## 1. Principles

1. **Make illegal states unrepresentable** — value objects, explicit state machines, validated inputs.
2. **Business rules live in `domain/`** — pure functions/classes, no Express, no Mongoose. Easy to test.
3. **Thin controllers, focused services** — one use case per service method; no 2,000-line "god services".
4. **Explicit dependencies** — pass collaborators in (factory functions or constructor injection); no hidden globals.
5. **Fail fast, fail safe** — validate at the edge, throw typed errors, default deny.
6. **Idempotent by design** — anything that may be retried (HTTP, jobs, webhooks, events) can safely run twice.
7. **Observable by default** — every use case logs a business milestone with context and timing.
8. **Consistency** — every module looks the same; the tenth module is as easy to read as the first.

## 2. Language & tooling

- **TypeScript** for all new code under `src/core` and `src/modules` (`tsconfig` with `allowJs: true` so old JS keeps working). Compile with `tsc` or run with `tsx`/`ts-node` in dev; build to `dist/` for prod. The backend has **no build step today** (the Dockerfile copies `src` and runs `node src/server.js`), so Stage 00 changes the Dockerfile and start script for the whole backend — smoke-test existing routes after the switch.
- `tsconfig`: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `useUnknownInCatchVariables`.
- **ESLint** (flat config): `@typescript-eslint/strict-type-checked`, `no-floating-promises`, `switch-exhaustiveness-check`, `import/no-cycle`, `no-restricted-imports` (module boundaries), `eslint-plugin-security`, `sonarjs` (cognitive complexity ≤ 15). **Prettier** for formatting.
- **Banned:** `any` (use `unknown` + narrowing), non-null `!` outside tests, `@ts-ignore`, `console.log` in app code, `new Date()`/`Date.now()` outside the clock, floating-point money, `Model.collection` raw access outside repositories, `mongoose.set('strictQuery', false)`.
- If the team decides to stay on JavaScript (decision D2): same rules via JSDoc `@ts-check` + zod everywhere.
- Husky + lint-staged: format, lint, `gitleaks` on commit.

## 3. Naming

| Thing | Convention | Example |
| --- | --- | --- |
| Files | kebab-case + role | `create-order.ts`, `inventory.repository.ts` |
| Types / classes | PascalCase | `HotelBooking`, `Money` |
| Functions / vars | camelCase, verb for functions | `computeCancellationCharge` |
| Booleans | is/has/can | `isRefundable` |
| Collections | module prefix + plural snake | `inv_inventory_days`, `hbk_bookings` |
| Fields | camelCase | `checkInDate`, `amountPaise` |
| Money fields | suffix `Paise` | `netPaise`, `totalPaise` |
| Stay dates | suffix `Date`, string `YYYY-MM-DD` | `checkInDate: '2026-12-24'` |
| Instants | suffix `At`, `Date` type (UTC) | `createdAt`, `holdExpiresAt` |
| Events | `module.entity.pastVerb` + `version` field | `hotelBooking.booking.confirmed`, v1 |
| Permissions | `area.resource.action` | `hotel.booking.cancel` |
| Error codes | UPPER_SNAKE, never reused | `SOLD_OUT`, `PRICE_CHANGED` |
| Env vars | UPPER_SNAKE with module prefix | `PAYMENTS_RAZORPAY_KEY_ID` |
| Org types | `PLATFORM` / `CLIENT` / `HOTEL` | — **never "partner" in new code** |

## 4. Layering

### 4.1 Controller (HTTP) — only this:

```ts
export const cancelBookingController = (svc: HotelBookingService) => async (req: Request, res: Response) => {
  const input = cancelBookingSchema.parse({ ...req.body, bookingId: req.params.id });
  const result = await svc.cancelBooking(req.ctx, input, req.idempotencyKey);
  res.status(200).json(toCancellationDto(result));
};
```

### 4.2 Service (application) — orchestrates one use case:

```ts
async cancelBooking(ctx: RequestContext, input: CancelInput, idemKey: IdempotencyKey): Promise<Cancellation> {
  return withIdempotency(ctx, idemKey, () =>
    withTransaction(async (session) => {
      const booking = await this.repo.getForUpdate(ctx, input.bookingId, session);   // 404 if not visible
      this.authz.assert(ctx, 'hotel.booking.cancel', booking.ownership());          // object-level check
      const quote = this.quotes.verify(input.quoteToken, booking, this.clock.now());  // pure domain
      booking.cancel(quote, this.clock.now());                                        // state machine
      await this.inventory.returnRooms(systemCtx(ctx), booking.inventoryRef(), session);
      await this.repo.save(booking, session);                                         // + outbox events
      return booking.cancellation();
    }));
}
```

Rules:
- **No HTTP/network calls inside a transaction** (PayU, email, supplier APIs happen before/after, driven by events).
- **Authorise after loading** the document (object-level), not only at the route.
- Transactions are short (< 1 s); retry on `TransientTransactionError` / `WriteConflict` via `session.withTransaction`.

### 4.3 Domain

- Entities enforce invariants through methods (`booking.cancel()`), never by setting fields directly.
- Value objects validated at construction: `Money`, `StayDates`, `Occupancy`, `Gstin`, `Pan`, `PhoneNumber`, `Email`, `BookingReference`.
- State machines are transition tables; illegal transitions throw `InvalidStateTransition`.

```ts
export class Money {
  private constructor(readonly paise: number, readonly currency: 'INR') {
    if (!Number.isSafeInteger(paise) || paise < 0) throw new DomainError('INVALID_MONEY');
  }
  static inr(paise: number) { return new Money(paise, 'INR'); }
  add(o: Money) { return Money.inr(this.paise + o.paise); }
  subtract(o: Money) { return Money.inr(this.paise - o.paise); }
  /** basis points: 100 bps = 1%. Half-up rounding to the paisa. */
  percent(bps: number) { return Money.inr(Math.floor((this.paise * bps + 5000) / 10000)); }
}
```

### 4.4 Repository (Mongoose)

- All DB access for a module lives in its repository; repositories return domain objects or plain typed DTOs (`.lean()`), never live Mongoose documents to controllers.
- Every method takes `ctx` (and `session` when in a transaction).
- **Explicit projections** — never return whole documents with secrets/encrypted fields to callers that don't need them.
- Optimistic locking on mutable aggregates: `version` field, update with `{ _id, version }` filter, `$inc: { version: 1 }`; 0 matched → `VERSION_CONFLICT`.

## 5. MongoDB rules

| Rule | Detail |
| --- | --- |
| Replica set | Required (transactions, change streams). Local dev runs a single-node replica set |
| Connection | `writeConcern: { w: 'majority' }`, `readConcern: 'majority'` for money/inventory; `retryWrites: true` |
| Transactions | `session.withTransaction(fn, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } })`; idempotent callback; < 1 s |
| Hot documents | Never write, inside a transaction, a document that **every** booking/payment would also write (platform revenue/tax/clearing accounts, global counters): concurrent MongoDB transactions on one document abort with `WriteConflict` and retry, which serialises the whole platform. Derive such totals from the journal in the worker. Contention on one room-type-night or one client wallet is expected and fine |
| Query safety | **Do not enable `sanitizeFilter` globally**: it wraps operator objects in `$eq`, so filters like `held: { $gte: qty }` or `date: { $gte, $lt }` silently stop matching (inventory and wallet code would break, and so could legacy code). Instead: every input through zod `.strict()`; reject keys that start with `$` or contain `.`; never pass `req.body`/`req.query` into a filter or update; query operators appear only in repository code. `strictQuery: true` on new schemas |
| Schemas | `strict: 'throw'` on new schemas; required fields; enums; min/max; `timestamps: true` |
| DB validators | Critical invariants also as collection `$jsonSchema`/`$expr` validators (e.g. `booked + held <= total`) |
| Indexes | Declared in schema, created by migration script (not `autoIndex` in prod); unique indexes for business keys (`orgId + idempotencyKey`, `roomTypeId + date`). Unique indexes on **optional** fields use `partialFilterExpression` (e.g. `{ gstin: { $type: 'string' } }`) — never `sparse` on a compound index (it still indexes documents where only one field exists, so `{null, 'CLIENT'}` duplicates collide) |
| Money | Integer paise in `Number` (always `Number.isSafeInteger`); never floats; rates in basis points |
| Dates | Stay dates as `'YYYY-MM-DD'` strings (sortable, no time zone bugs); instants as `Date` (UTC) |
| IDs | `ObjectId` internally; public references `MBH-7K3Q-9X2D` (random, Crockford base32 + check char); never sequential except GST invoice series |
| TTL indexes | Only for disposable data (OTP, idempotency records, sessions). **Never for holds** — deleting a hold must also give rooms back (sweeper job does that) |
| Migrations | `migrate-mongo` (or similar) scripts per module for indexes, validators and data changes; reviewed like code; forward-only |
| Large collections | Inventory/usage/audit: compound indexes, archive old dates monthly |
| Aggregations | Must start with an indexed `$match` on ownership fields |

## 6. Errors

- Typed errors from `core/errors`: `DomainError(code)`, `NotFoundError`, `ConflictError`, `ForbiddenError`, `ValidationError`, `InvalidStateTransition`, `SoldOutError`, `PriceChangedError`.
- One Express error middleware maps them to **RFC 9457 problem details**:

```json
{ "type": "https://api.musafirbaba.com/errors/sold-out", "title": "Sold out", "status": 409,
  "code": "SOLD_OUT", "detail": "No rooms left for 2026-12-24.", "requestId": "…" }
```

- Never leak stack traces, Mongo errors, or other tenants' ids. Unknown → 500 `INTERNAL_ERROR` (details in logs only).
- Express 5 forwards async errors automatically; never swallow errors with empty `catch`.

## 7. Validation

- zod schemas per endpoint, `.strict()` (unknown fields rejected), length/size limits on every string and array.
- Limits: max 30 nights, max 9 rooms per booking, max 4 children per room, page size ≤ 100, body ≤ 1 MB (uploads use presigned URLs).

## 8. Logging

- pino JSON: `ts, level, msg, requestId, orgId, actorId, channel, module, action, durationMs`.
- Redacted always: passwords, OTPs, tokens, API keys, `authorization`/`cookie` headers, PAN, bank account numbers, full phone/email.
- `info` for business milestones (booking confirmed, KYC approved), `warn` for handled anomalies (sold-out race lost), `error` for things needing action.

## 9. Config & secrets

- Config validated at boot with zod; app refuses to start on bad config.
- Secrets from environment/secret manager only; never in repo or logs; `gitleaks` in CI.
- Feature flags (DB-backed or env) for risky behaviour, default **off**.

## 10. Time

- Inject a `Clock` (`clock.now()`); tests use a fixed clock.
- Stay dates are calendar dates; nights = `[checkIn, checkOut)`.
- Hotel deadlines (cancellation, check-in) are computed in the **hotel's IANA time zone** (`Asia/Kolkata` default) with `date-fns-tz`/Temporal polyfill, stored as UTC instants.

## 11. API design (summary — full in `06-api-and-events.md`)

REST under `/api/v1`, plural nouns, camelCase JSON, money as `{ amountPaise, currency }`, cursor pagination, `Idempotency-Key` on money/inventory POSTs, problem-details errors, OpenAPI generated from zod (`zod-to-openapi`).

## 12. Frontend (Next.js)

- App Router; Server Components by default; Client Components only where interactive.
- Data: typed API client generated from OpenAPI + TanStack Query; no hand-written URLs.
- Forms: React Hook Form + the **same zod schemas** as the backend.
- UI kit shared between business portal and admin (Tailwind + Radix/shadcn); MusafirBaba theme tokens.
- Auth: httpOnly, Secure, SameSite=Lax cookies via Next route handlers (BFF); no tokens in `localStorage`.
- Permission-aware UI (`can('hotel.booking.cancel')`) — but the backend is the only enforcement.
- Accessibility WCAG 2.2 AA; LCP < 2.5 s on 4G; images via `next/image`.
- Real-time: the `useRealtime` hook (socket.io-client; token renewal, reconnect, catch-up — `11-notifications-and-realtime.md` §12) on room `availability:property:{id}` on hotel pages; shows "prices/availability updated". Automatic refreshes after a signal send `X-MB-Refresh: realtime` so they are not billed (Stage 12 §3.2).
- The business area lives in the existing Next.js app as its own route group with its **own** session cookie (never shared with website-customer or admin cookies).

## 13. Git & reviews

- Trunk-based, short branches (< 3 days), squash merge, protected `main`, Conventional Commits.
- PR < 400 changed lines (excluding generated code).
- Required checks: lint, typecheck, unit, integration, boundary rules, secret scan, dependency audit.
- **Two approvals** for: `wallet`, `payments`, `orders`, `hotel-inventory`, `hotel-booking`, `access`, `pricing` (tax), auth, tenant plugin.
- Use `templates/pull-request-template.md`.

## 14. Documentation

- Module `README.md` (template), ADRs for decisions, runbooks for alerts.
- Comments explain **why**, not what. Public service methods have TSDoc.

## 15. Dependencies

- New library needs: active maintenance, permissive licence, no critical CVEs, justification in the PR.
- Lockfile committed; Renovate/Dependabot weekly; critical security updates within 72 h.
