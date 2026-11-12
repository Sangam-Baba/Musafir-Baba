# ADR-0012: Derived balances for platform and hotel accounts

| | |
| --- | --- |
| **Status** | Accepted |
| **Date** | 2026-11-12 |
| **Deciders** | Owner + tech lead |
| **Stage** | Stage 00 |

## Context

If every booking updated the same platform revenue/tax documents, bookings would contend on one hot document.

## Decision

Only client wallets (and credit receivables) are live balances; platform and hotel accounts are derived from the journal by the worker into snapshots.

## Options considered

| Option | Pros | Cons |
| --- | --- | --- |
| Derived (chosen) | No hot documents | Balances lag by seconds |
| Live everywhere | Instant | Contention on one document |

## Consequences

- Positive: bookings never contend on platform accounts.
- Trade-off: reports read snapshots.
- Follow-up: Stage 07 invariant job.

## Validation

Stage 07 invariant: snapshot = Σ journal lines.
