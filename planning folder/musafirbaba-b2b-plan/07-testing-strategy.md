# 07 — Testing Strategy

> Your backend currently has no tests. All **new** code is tested from day one; old code is left alone unless touched.

---

## 1. Harness (built in Stage 00)

| Tool | Use |
| --- | --- |
| **Vitest** (or Jest if already preferred) | Unit, integration |
| **mongodb-memory-server** in **replica set mode** (`MongoMemoryReplSet`) | Real transactions and change streams in tests |
| **supertest** | HTTP-level API tests against the Express app |
| **ioredis-mock** or Redis container | Rate limits, counters, queues |
| **fast-check** | Property tests for money, GST, pricing, availability, ledger |
| **Playwright** (+ axe) | End-to-end journeys in website, business portal, admin |
| **k6** | Load and concurrency tests on staging |
| **nock** / PayU test mode | Payment adapter tests |

Test helpers: factories (`aClientOrg()`, `aHotelWithRooms({ rooms: 10 })`, `aCalendar(...)`), fixed `Clock` with time travel, seeded permission manifest.

## 2. Test pyramid

| Level | Share | Example |
| --- | --- | --- |
| Unit (domain, pure) | ~60% | Cancellation charge, GST slab, margin rule precedence, state machines |
| Integration (service + Mongo + Redis) | ~30% | Hold rooms in a transaction; wallet hold/capture; tenant guard |
| API (supertest) | part of integration | Permissions per route, validation, error codes |
| E2E (Playwright) | ~10 journeys | Register → KYC → approve → book → cancel |
| Load (k6) | per release | Last-room race, search latency |

## 3. Mandatory suites (CI blocks merge)

| Suite | Proves | From stage |
| --- | --- | --- |
| Boundary rules | No module imports another's internals; no cross-module collection access | 00 |
| Permission coverage | Every `/api/v1` route declares a permission | 01 |
| Authorization matrix | Each system role × scope allowed/denied as declared | 01 |
| **Tenant isolation** | Org A can't read/change org B data on any endpoint; plugin throws on unscoped queries | 01 |
| NoSQL injection | `{"$gt": ""}`-style payloads rejected everywhere | 01 |
| Upload safety | EICAR rejected, wrong magic bytes rejected, SVG rejected, EXIF stripped | 02 |
| **Inventory correctness** | Property tests: availability vs reference implementation; validator rejects oversell | 04 |
| **Pricing & GST** | Slab boundaries (₹7,499.99 / ₹7,500.00 / ₹7,500.01), CGST/SGST vs IGST, totals = Σ parts, brief example ₹10,000 + ₹1,000 = ₹11,000 | 05 |
| **Ledger invariants** | Every transaction balances; live wallet balance = Σ lines; derived account snapshots = Σ lines; wallet never below floor under concurrency | 07 / 11 |
| PayU callbacks | Bad hash rejected; replay no-op; amount/`txnid` mismatch → exception; pending resolved by poller; success after expiry → exactly one refund | 07 |
| Mongoose settings | Inventory and wallet operator queries work with the production connection settings (guards against `sanitizeFilter`-style surprises) | 00 |
| **No double booking** | 50 parallel bookings for last room → 1 winner; multi-night all-or-nothing; mixed channels; hold expiry; late payment; idempotency; crash injection (full list in `05-…` §12) | 08 |
| Cancellation | All penalty types, buffers, hotel time zones, deadline ± 1 s | 09 |
| Metering accuracy | N billable calls → N usage records; quota thresholds; non-billable not counted; `X-MB-Refresh` honoured only for business sessions within its limit, ignored for API keys | 12 / 13 |
| Webhook signing & SSRF | Signature verifiable; private IPs/redirects blocked | 14 |
| **Notifications & realtime** | Exactly one inbox row per event and recipient; catch-up works with the realtime process stopped; sockets can't receive other users'/orgs' events; escalation timings; critical categories can't be muted; existing app notification code untouched (`11-…` §15) | 02 / 08 |

## 4. Coverage floors

| Area | Minimum line/branch |
| --- | --- |
| `domain/` of wallet, payments, orders, pricing, hotel-inventory, hotel-booking | 95% / 90% |
| Other new `domain/` and services | 85% / 80% |

Coverage is a floor; reviewers check failure paths and permission tests exist.

## 5. Performance budgets (staging, ~5,000 hotels, 365 days inventory)

| Scenario | Load | Budget (p95) |
| --- | --- | --- |
| Destination autocomplete | 100 RPS | < 150 ms |
| City search (cache miss) | 30 RPS | < 800 ms |
| City search (cache hit) | 200 RPS | < 150 ms |
| Offers for a hotel | 50 RPS | < 400 ms |
| Create order + wallet pay | 20 RPS | < 2 s, 0 oversell |
| My Bookings list | 50 RPS | < 300 ms |

## 6. CI pipeline

```
commit: format, lint-staged, gitleaks
PR: install → lint + typecheck + boundary rules → unit/property → integration (MongoMemoryReplSet + Redis)
    → API tests → dependency audit + Semgrep → build
main: deploy staging → smoke → Playwright E2E → (nightly) k6 + invariant checker
release: manual approval → deploy production → smoke → watch dashboards
```

## 7. Definition of Done (every task)

- [ ] Acceptance criteria are automated tests
- [ ] Happy path, edge cases and failure paths tested
- [ ] Permission + tenant isolation tests for new routes/collections
- [ ] OpenAPI, events and module README updated
- [ ] Logs/metrics added; alert + runbook if it can page someone
- [ ] Security checklist ticked
- [ ] Admin screen exists for anything configurable
