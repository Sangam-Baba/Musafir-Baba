# ADR-0011: Business area as /business path; flagged frontend edits E1–E4 only

| | |
| --- | --- |
| **Status** | Accepted |
| **Date** | 2026-11-12 |
| **Deciders** | Owner + tech lead |
| **Stage** | Stage 00 |

## Context

The business portal lives in the existing Next.js app; `proxy.ts` is commented out and must stay untouched.

## Decision

Business area at `/business/...` (no subdomain). New pages in new folders; edits to existing files limited to E1 (enable the existing Hotels tab), E2 (Hotels tab on bookings page), E3 (admin sidebar links), E4 (env), all behind flags that default off.

## Options considered

| Option | Pros | Cons |
| --- | --- | --- |
| Path + flagged edits (chosen) | No proxy change, minimal edits | Longer URLs |
| Subdomain via proxy.ts | Nicer URL | Changes proxy logic |

## Consequences

- Positive: existing pages unchanged while flags are off.
- Trade-off: URL `/business`.
- Follow-up: URL clash check (map O1).

## Validation

Owner review of E1–E4; `b2b:guards` path check (frontend list added when frontend work starts).
