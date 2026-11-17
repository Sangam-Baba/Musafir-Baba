# ADR-0009: PayU payment flow — own callbacks and txn prefixes, verify before confirm

| | |
| --- | --- |
| **Status** | Accepted |
| **Date** | 2026-11-12 |
| **Deciders** | Owner + tech lead |
| **Stage** | Stage 00 |

## Context

PayU is the existing gateway; the existing integration must not be affected.

## Decision

Same merchant account, new callback URLs under `/api/v1/payments/payu/…` and txn prefixes `B2BH`, `B2BW`, `B2BS` (existing ids start with `txn`, `MB…`). Every payment is confirmed with the response hash and PayU's verify API; rooms lost → automatic refund. PayU dashboard settings are never changed.

## Options considered

| Option | Pros | Cons |
| --- | --- | --- |
| Own callbacks + prefixes (chosen) | No interference with existing payments | Two integrations on one account |
| Reuse existing payment controller | Less code | Touches working logic |

## Consequences

- Positive: existing payments unaffected.
- Trade-off: reconciliation must filter by prefix.
- Follow-up: Stage 07.

## Validation

Stage 07 tests (verify, refund, pending poller).
