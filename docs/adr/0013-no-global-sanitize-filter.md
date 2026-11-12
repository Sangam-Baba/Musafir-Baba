# ADR-0013: No global sanitizeFilter — key validation instead

| | |
| --- | --- |
| **Status** | Accepted |
| **Date** | 2026-11-12 |
| **Deciders** | Owner + tech lead |
| **Stage** | Stage 00 |

## Context

Global `mongoose.set('sanitizeFilter', true)` would wrap `$expr`/`$gte` in `$eq` and silently break inventory and wallet updates (and possibly legacy code).

## Decision

Every input passes `validate()`: keys starting with `$`, containing `.` or prototype keys are refused at any depth before zod `strictObject`; raw request objects never reach queries.

## Options considered

| Option | Pros | Cons |
| --- | --- | --- |
| Key validation (chosen) | Safe and keeps operator queries working | Must use validate() everywhere |
| Global sanitizeFilter | One line | Breaks atomic conditional updates |

## Consequences

- Positive: injection shapes refused.
- Trade-off: discipline enforced by review.
- Follow-up: every route uses validate().

## Validation

`tests/b2b/http-layer.test.js` (5 injection payloads over HTTP).
