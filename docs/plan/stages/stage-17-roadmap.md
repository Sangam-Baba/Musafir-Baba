# Stage 17 — Roadmap (after launch)

Each item becomes its own stage file (same template) when scheduled.

| Priority | Item | Why | Reuses |
| --- | --- | --- | --- |
| P1 | **Channel manager connection** (AxisRooms / STAAH / eZee) | Hotels manage one inventory for all sites → removes outside-overbooking risk | Calendar bulk update, guarded allotment edits, events |
| P2 | **Bedbank adapter** (TBO or similar) | Thousands of hotels instantly; fixes thin inventory | Item handler, pricing, booking engine (async confirmation), mapping table for duplicates |
| P3 | On-request hotels | Hotels that confirm manually | Booking states, SLA timers, auto-release/refund |
| P4 | Automated amendments (dates, room, names) | Less ops work | Holds, pricing, wallet adjustments |
| P5 | Partial cancellation (some rooms) | Common agent request | Cancellation + credit notes |
| P6 | Sub-agents (clients reselling to their own agents) | Distribution growth | Orgs with parent, markups, wallets |
| P7 | Promotions/coupons | Conversion | Pricing pipeline (separate from margins) |
| P8 | OAuth client credentials, SDKs, public sandbox | Larger API clients | api-access |
| P9 | Next products: transfers, activities, packages, flights, visa | Revenue lines | orders, wallet, payments, documents, pricing, metering, reporting — each product adds catalog + booking modules implementing `OrderItemHandler` |
| P10 | Split `hotel-search` or `webhooks` into services | Scale | Module boundaries |

## Adding a new product (pattern)

1. New modules `<product>-catalog` and `<product>-booking`.
2. Implement and register `OrderItemHandler`.
3. Add pricing match fields and tax rules (data) for its SAC.
4. Add document and notification templates.
5. Add meters and plan features.
6. Enable its tab in My Bookings (read model is already product-agnostic).
7. No changes to orders/wallet/payments core without an ADR.

## Gate before starting any item

v1 stable for 4 weeks (SLOs met, no open severe bugs in affected areas) and an approved ADR.
