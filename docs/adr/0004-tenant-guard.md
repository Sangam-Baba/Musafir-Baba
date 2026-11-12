# ADR-0004: Tenant guard: repository rule + Mongoose plugin

| | |
| --- | --- |
| **Status** | Accepted |
| **Date** | 2026-11-12 |
| **Deciders** | Owner + tech lead |
| **Stage** | Stage 00 |

## Context

MongoDB has no row-level security; bookings involve several parties (client, hotel, customer).

## Decision

Tenant models use `defineTenantModel(..., ownershipFields)`: every query/update/delete/count/distinct/aggregate/bulkWrite must be scoped by an ownership field (or `$or` with all branches scoped), new documents need an owner; cross-org work uses `systemScope(reason)`, which is logged.

## Options considered

| Option | Pros | Cons |
| --- | --- | --- |
| Plugin as safety net behind repositories (chosen) | Forgotten filters throw instead of leaking | Must remember systemScope for background work |
| Repository rule only | Simple | One missed filter leaks data |
| One database per tenant | Strong isolation | Impossible with shared inventory |

## Consequences

- Positive: other orgs' data can't be read by accident.
- Trade-off: background code must state a reason.
- Follow-up: isolation tests for every tenant endpoint.

## Validation

`tests/b2b/tenant-plugin.test.js` (15 unscoped attempts refused).
