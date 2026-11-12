# 10 — Coding Standards (how the code must look)

> `02-engineering-standards.md` says **what** the system must do (architecture, MongoDB rules, security, layering). This file says **how every line of new code is written** — backend and frontend — with do/don't examples.
> Applies to **all new code** for the B2B platform and hotel booking (`backend/src/core`, `backend/src/modules/*`, the business area and new pages in the Next.js app). Every PR is reviewed against it; tooling enforces what it can.

---

## 1. How it is enforced

| Rule type | Enforced by | Blocks merge? |
| --- | --- | --- |
| Formatting | Prettier (pre-commit + CI) | Yes |
| Types | `tsc --noEmit` with the strict config in §13 | Yes |
| Lint rules (§3–§10) | ESLint flat config in §13 | Yes |
| Module boundaries, layers | `dependency-cruiser` / `no-restricted-imports` (`npm run test:arch`) | Yes |
| Secrets | gitleaks | Yes |
| Tests and coverage floors | CI (`07-testing-strategy.md`) | Yes |
| Everything else in this file | Human review with the PR template | Yes |

**Legacy code is not reformatted.** Existing JavaScript in `backend/src/{controllers,models,routes,services,…}` and existing frontend pages keep their style; Prettier/ESLint for these rules run only on new folders (§13). Never mix a mass reformat into a feature PR.

## 2. General rules (all code)

1. **Readable first.** Code is written for the next person (or AI session) who has to change it at 3 a.m.
2. **Small units.** Functions ≤ 40 lines, ≤ 3 parameters (more → one typed object), cognitive complexity ≤ 15. Files ≤ 300 lines (split by responsibility, not alphabetically).
3. **Early returns** instead of nested `if`/`else`.
4. **No magic values.** Numbers and strings with meaning become named constants (`HOLD_MINUTES = 15`) or config.
5. **One way to do a thing.** Use the helpers in `@core/*` (money, dates, ids, errors, transactions, logging) — never re-implement them inside a module.
6. **Comments explain *why*,** never *what*. No commented-out code. No `TODO` without a ticket ID (`// TODO(MB-123): …`).
7. **Names say intent** in domain words from the glossary (`README.md`): `client`, `hotel`, `property`, `hold`, `netPaise`. Never `partner`, `data`, `info`, `obj`, `temp`, `x`.
8. **No dead code, no speculative code.** Build what the task asks; nothing "for later".
9. **Every change ships with tests** (§11) and a progress update (`docs/progress/`).

## 3. TypeScript

| Rule | Do | Don't |
| --- | --- | --- |
| Strict types | `unknown` + narrowing | `any`, `as any`, `@ts-ignore` |
| Optional values | `undefined` for "not set"; `null` only when it comes from the DB | Mixing both for the same field |
| Constants & enums | `const BOOKING_STATUS = ['HELD','CONFIRMED'] as const; type BookingStatus = typeof BOOKING_STATUS[number];` | `enum` |
| IDs | Branded types: `type PropertyId = string & { readonly __brand: 'PropertyId' }` | Passing raw strings between modules |
| Immutability | `readonly` fields, `ReadonlyArray`, return new objects | Mutating arguments |
| Exhaustiveness | `switch` + `assertNever(x)` in `default` | `default:` that silently does nothing |
| Imports | `import type { … }` for types; named exports only; ESM paths with `.js` | Default exports, `require()` |
| Non-null | Handle the `undefined` case | `value!` (outside tests) |
| Interfaces vs types | `interface` for object shapes that are implemented (services, ports); `type` for unions and data | — |

```ts
// ✅ exhaustive status handling
export function bookingLabel(status: BookingStatus): string {
  switch (status) {
    case 'HELD': return 'Waiting for payment';
    case 'CONFIRMED': return 'Confirmed';
    default: return assertNever(status);
  }
}
```

Import order (auto-fixed): Node built-ins → packages → `@core/*` → `@modules/*` (only their `index.ts`) → relative. Blank line between groups.

## 4. Backend: file layout and roles

Each module follows `01-architecture.md` §4.1. One file = one role:

| File | Contains | Must not contain |
| --- | --- | --- |
| `routes.ts` | Route list: path, `requirePermission`, rate limit, controller | Logic |
| `controller.ts` | Parse with zod → call service → map to DTO → `res.json` | DB calls, business rules |
| `<verb>-<noun>.ts` or `*.service.ts` | One use case per method: load → authorise → domain → save → events | Express `req`/`res`, raw Mongo |
| `domain/*.ts` | Pure rules, state machines, calculations | Mongoose, Express, Redis, `fetch`, `Date.now()` |
| `repository.ts` | All DB access, tenant-scoped, returns domain objects/DTOs | Business rules |
| `models/*.ts` | Mongoose schema + indexes | Methods with business logic |
| `validators.ts` | zod request schemas | — |
| `events.ts` / `permissions.ts` / `jobs.ts` | Event types / permission codes / worker jobs | — |

### 4.1 Controller

```ts
// ✅ thin controller
export const createOrderController = (svc: OrdersService) => async (req: Request, res: Response) => {
  const input = createOrderSchema.parse(req.body);
  const order = await svc.createOrder(req.ctx, input, req.idempotencyKey);
  res.status(201).json(toOrderDto(order));
};

// ❌ logic, DB access and trust in client input inside a controller
export const createOrder = async (req, res) => {
  const order = await Order.create(req.body);           // mass assignment, no tenant, no validation
  if (req.body.total > 0) { /* … */ }                   // trusting a client amount
  res.json(order);                                      // leaks internal fields
};
```

### 4.2 Validation (zod 4)

- Use `z.strictObject({...})` (unknown keys rejected) and set limits on every field. Where other plan files say "zod `.strict()`", they mean this — in zod 4 `z.strictObject` is the preferred form.
- Money from clients is never accepted — only ids, tokens and choices.
- Reuse schemas: the same request schema feeds OpenAPI and the frontend's generated client.

```ts
export const createOrderSchema = z.strictObject({
  priceTokens: z.array(z.string().max(2048)).min(1).max(9),
  guests: z.array(guestSchema).min(1).max(9),
  paymentMode: z.enum(['WALLET', 'CREDIT', 'GATEWAY']),
  specialRequests: z.string().trim().max(500).optional(),
});
```

### 4.3 Services and transactions

```ts
// ✅ one use case, explicit context, authorise after load, events in the same transaction
async cancelBooking(ctx: RequestContext, input: CancelInput, key: IdempotencyKey): Promise<Cancellation> {
  return withIdempotency(ctx, key, () =>
    withTransaction(async (session) => {
      const booking = await this.bookings.getForUpdate(ctx, input.bookingId, session);
      this.authz.assert(ctx, 'hotel.booking.cancel', booking.ownership());
      const quote = this.quotes.verify(input.quoteToken, booking, this.clock.now());
      booking.cancel(quote, this.clock.now());
      await this.inventory.returnRooms(systemCtx(ctx, 'booking-cancel'), booking.inventoryRef(), session);
      await this.bookings.save(booking, session);          // also writes outbox events
      return booking.cancellation();
    }));
}
```

Rules: no network calls inside `withTransaction`; the callback must be safe to retry; keep it under ~1 s.

### 4.4 Repositories and Mongoose

```ts
// ✅ conditional atomic update, tenant-scoped, result checked
const res = await InventoryDay.updateOne(
  { roomTypeId, date, stopSell: false, $expr: { $lte: [{ $add: ['$booked', '$held', qty] }, '$total'] } },
  { $inc: { held: qty, version: 1 } },
  { session },
);
if (res.modifiedCount !== 1) throw new SoldOutError({ roomTypeId, date });

// ❌ read-modify-write race
const day = await InventoryDay.findOne({ roomTypeId, date });
day.held += qty;
await day.save();
```

- Always `.lean()` + explicit projection for reads; never return Mongoose documents from a repository.
- Never put `req.body` / `req.query` in a filter or update.
- Schema template: `strict: 'throw'`, `timestamps: true`, required fields, enums, `min`/`max`, indexes declared (created by migration), unique indexes on optional fields via `partialFilterExpression`.

### 4.5 Errors

```ts
// ✅ typed, stable code, safe details
throw new ConflictError('PRICE_CHANGED', { oldTotalPaise, newTotalPaise });

// ❌
throw new Error('price wrong');            // no code, unmappable
return res.status(500).send(err.message);  // leaks internals
try { … } catch {}                         // swallowed
```

### 4.6 Async

- Every promise is `await`ed or returned (`no-floating-promises`).
- Independent work: `await Promise.all([...])`. Never `array.forEach(async …)`.
- Every external call (PayU, email) has a timeout and goes through its adapter; retries only for safe/idempotent calls, with backoff.

### 4.7 Logging

```ts
// ✅ structured, business milestone, no PII
logger.info({ orderId, bookingRef, channel: ctx.channel, durationMs }, 'booking confirmed');

// ❌
console.log('booking', booking);           // console + whole object with guest PII
logger.info(`user ${email} paid ${amount}`);
```

### 4.8 Money, dates, ids — only through `@core`

| Do | Don't |
| --- | --- |
| `Money.inr(paise)`, `.add()`, `.percent(bps)` | `price * 1.18`, floats, `toFixed` for money |
| `clock.now()`, `nightsOf(checkIn, checkOut)`, `hotelDeadline(...)` | `new Date()`, `Date.now()`, `moment()` |
| `newReference('MBH')` | Sequential numbers, `Math.random()` for ids |

### 4.9 Notifications and realtime

- Send in-app notifications and emails only through the new `notifications` module (`notify(...)`), triggered by outbox events — never call an email client or emit to Socket.IO directly from a feature module.
- Live pushes only through the notifications module's Socket.IO **Redis emitter** helper (self-hosted). See `11-notifications-and-realtime.md`.
- **Never import or change the existing app notification code** (`services/notification/*`, `utils/notifications.js`, `models/Notification.js`, `config/ably.js`) and never add a third-party messaging SDK (Ably, Expo, Firebase, WhatsApp/SMS providers) to new code.

## 5. Frontend (Next.js 16 — existing app)

> The existing `frontend/AGENTS.md` applies: this Next.js version has breaking changes — **read the relevant guide in `node_modules/next/dist/docs/` before writing Next-specific code** (e.g. `proxy.ts` replaces middleware).

### 5.1 Structure

```
frontend/src/app/(business)/            # business area route group (business.musafirbaba.com via proxy.ts)
  client/…                              # B2B client workspace pages
  hotel/…                               # hotel workspace pages
frontend/src/features/<feature>/        # e.g. hotel-search, checkout, team, wallet, notifications
  components/  hooks/  api/  schemas/  utils/
frontend/src/components/ui/             # shadcn primitives (shared)
frontend/src/lib/api/                   # generated typed API client (from OpenAPI) + fetch wrapper
```

- Pages (`page.tsx`) stay thin: layout + feature components.
- Feature code lives in `features/<feature>`; features don't import each other's internals.

### 5.2 Components

| Rule | Detail |
| --- | --- |
| Server first | Server Components by default; add `'use client'` only for interactivity |
| Size | ≤ 200 lines; extract sub-components and hooks |
| Props | Typed `Props` interface; no `any`; no prop drilling beyond 2 levels (use composition or context) |
| Logic | No business rules or price maths in components — the API returns computed values; formatting via helpers |
| States | Every data view handles **loading** (skeleton), **empty**, **error** (with retry) and **no-permission** |
| Styling | Tailwind 4 utility classes + shadcn components; theme tokens; no inline `style={{}}` except dynamic values; no new UI library without approval |
| Accessibility | Labels on inputs, keyboard reachable, focus visible, `alt` text, colour contrast AA; `axe` in Playwright |
| Naming | Components `PascalCase.tsx`; hooks `useXxx.ts`; handlers `handleXxx`, callback props `onXxx` |

### 5.3 Data, forms, state

```tsx
// ✅ server state via React Query + generated client + query-key factory
export const bookingKeys = {
  all: ['bookings'] as const,
  list: (filters: BookingFilters) => [...bookingKeys.all, 'list', filters] as const,
};
export function useBookings(filters: BookingFilters) {
  return useQuery({ queryKey: bookingKeys.list(filters), queryFn: () => api.bookings.list(filters) });
}

// ❌ hand-written URL, untyped, no cache, token in localStorage
const res = await fetch('/api/v1/bookings?x=' + q, { headers: { Authorization: localStorage.token } });
```

- **Server state** (anything from the API): React Query only. **UI state** (open dialogs, selected tab): local state or zustand. Never copy API data into zustand.
- **Forms**: React Hook Form + `zodResolver` with schemas matching the API; show server field errors on the field; disable submit while pending; send an `Idempotency-Key` for money/booking actions and reuse it on retry.
- **Auth**: httpOnly cookies via route handlers; never store tokens in `localStorage`/`sessionStorage`.
- **Permissions**: `can('hotel.booking.cancel')` hides/disables actions — the backend still enforces.
- **Money and dates**: `formatInr(paise)`, `formatStayDate('2026-12-24')`, hotel-time vs viewer-time helpers — never format by hand.
- **Realtime**: `useRealtime(...)` hook only (socket.io-client to our own `realtime` server; it handles tokens, reconnect and catch-up) — see `11-…` §12.

## 6. API contract code

- Request/response shapes come from the backend zod schemas → OpenAPI → generated frontend client. Never hand-write request/response types in the frontend.
- Response DTO mappers (`toOrderDto`) decide exactly which fields leave the server; net rates, margins and internal ids never appear for client/website callers.
- Error responses are RFC 9457 problem details with a stable `code`; the frontend switches on `code`, never on message text.

## 7. Events and jobs

- Event names `module.entity.pastVerb` + `version`; payload types in `events.ts`; payload = ids + essentials.
- Consumers and jobs are idempotent (check `core_inbox` / job key) and log start, result and duration.
- Jobs never assume order; they reload state before acting.

## 8. Security in code (quick reference)

Tenant id only from `ctx` · `requirePermission` on every route · `authz.assert` after loading · 404 for other orgs' records · `z.strictObject` + limits · no raw request objects in queries · no secrets/PII in logs, errors, URLs · server computes every amount · signed tokens verified server-side. Full list: `03-security-baseline.md`.

## 9. Performance in code

- No N+1 queries: batch by ids (`$in`) or aggregate; every query has a supporting index (`explain()` checked for hot paths).
- Paginate every list (cursor, ≤ 100).
- Cache only with an explicit key, TTL and invalidation event.
- Frontend: `next/image`, dynamic import for heavy components (calendar, maps), no data fetching in loops.

## 10. Dependencies

New package only with justification in the PR (maintained, licence, size, CVEs). Prefer what is already in the stack: zod 4, React Query, React Hook Form, zustand, Tailwind 4, shadcn, date-fns(-tz), pino, BullMQ.

## 11. Tests (how test code looks)

| Rule | Detail |
| --- | --- |
| Location | `__tests__/` next to the module (`*.test.ts`; integration `*.int.test.ts`) |
| Names | Behaviour sentences: `it('returns SOLD_OUT when the last room is taken by another booking')` |
| Shape | Arrange → Act → Assert; one behaviour per test |
| Data | Factories (`aClientOrg()`, `aHotelWithRooms({ rooms: 10 })`); no shared mutable fixtures |
| Time | Fixed `Clock`; time-travel helpers; never `sleep` |
| Mocks | Only at the edges (PayU, email adapter); real Socket.IO server and Redis in integration tests; real Mongo (`MongoMemoryReplSet`) for repositories and transactions |
| Must cover | Happy path, edge cases, failure paths, permission denied, other-tenant 404, concurrency/idempotency where relevant |
| Don't | Tests that only assert a mock was called; snapshot tests of large objects; skipped tests without a ticket |

## 12. Git, commits, PRs

- Branch `feat/S04-T09-hold-rooms` (task ID from `docs/progress/`).
- Conventional Commits: `feat(hotel-inventory): add holdRooms with conditional updates`.
- PR < 400 changed lines; one task per PR; PR template fully filled (architecture, security, correctness, tests, progress).
- Two approvals for money, inventory, access, tenant plugin, pricing/GST, auth, realtime server and notifications.

## 13. Tooling configuration (set up in Stage 00)

**`backend/tsconfig.json`** (key options)

```jsonc
{
  "compilerOptions": {
    "target": "ES2022", "module": "NodeNext", "moduleResolution": "NodeNext",
    "allowJs": true, "checkJs": false, "outDir": "dist",
    "strict": true, "noUncheckedIndexedAccess": true, "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true, "noFallthroughCasesInSwitch": true, "useUnknownInCatchVariables": true,
    "paths": { "@core/*": ["./src/core/*"], "@modules/*": ["./src/modules/*"] }
  },
  "include": ["src"]
}
```

**`backend/eslint.config.js`** (applies to new folders only)

```js
export default [
  {
    files: ['src/core/**/*.ts', 'src/modules/**/*.ts'],
    extends: [tseslint.configs.strictTypeChecked],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'import/no-default-export': 'error',
      'import/no-cycle': 'error',
      'no-console': 'error',
      'max-lines': ['error', 300],
      'max-lines-per-function': ['warn', 40],
      'max-params': ['error', 3],
      'sonarjs/cognitive-complexity': ['error', 15],
      'no-restricted-syntax': ['error',
        { selector: "NewExpression[callee.name='Date']", message: 'Use clock.now()' },
        { selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']", message: 'Use clock.now()' },
        { selector: 'TSEnumDeclaration', message: 'Use as-const unions' }],
      'no-restricted-imports': ['error', { patterns: [
        { group: ['**/modules/*/!(index)*', '**/modules/*/*/**'], message: 'Import other modules only via their index.ts' },
        { group: ['**/models/partner/**', '**/controllers/partner/**'], message: 'Vehicle-partner code is unrelated' },
        { group: ['**/services/notification/**', '**/utils/notifications*', '**/models/Notification*', '**/config/ably*',
                  'ably', 'expo-server-sdk', 'firebase-admin', 'twilio'],
          message: 'New system uses its own self-hosted notifications (11-notifications-and-realtime.md); existing app notification code must not be touched' }] }],
    },
  },
  { files: ['src/modules/*/domain/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: ['mongoose', 'express', 'ioredis', 'bullmq', 'ably'] }] } },
];
```

**Prettier** (`.prettierrc`, new folders only via `.prettierignore` for legacy paths): `{ "singleQuote": true, "trailingComma": "all", "printWidth": 110, "semi": true }`.

**Frontend**: keep `next/core-web-vitals` + `next/typescript`; add for `src/app/(business)/**` and `src/features/**`: `no-explicit-any`, `consistent-type-imports`, `no-console`, `max-lines` 300, `react-hooks/exhaustive-deps` as error, and a restricted-import rule banning direct `fetch('/api/...')` in favour of `src/lib/api`.

**lint-staged**: Prettier + ESLint on staged files in the new folders; gitleaks on everything.

**CI** (`07-testing-strategy.md` §6): lint → typecheck → `test:arch` → tests → audit → build → `npm run progress -- --check`.

## 14. Review checklist (short form)

- [ ] Right file for each piece of logic (§4); controllers thin; domain pure
- [ ] Types strict; no `any`/`!`/enum/default export; exhaustive switches
- [ ] zod `strictObject` with limits; no client amounts trusted
- [ ] Money/dates/ids/errors/logging via `@core`
- [ ] Atomic conditional updates for counters; no read-modify-write; no network in transactions
- [ ] Notifications/realtime only via the new notifications module and self-hosted Socket.IO; existing app notification code untouched
- [ ] Frontend: React Query + generated client; RHF + zod; loading/empty/error states; accessible; no tokens in storage
- [ ] Tests follow §11; progress files updated
