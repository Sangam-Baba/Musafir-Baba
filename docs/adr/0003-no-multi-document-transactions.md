# ADR-0003: No multi-document transactions or change streams — patterns P1–P5

| | |
| --- | --- |
| **Status** | Accepted |
| **Date** | 2026-11-12 |
| **Deciders** | Owner + tech lead |
| **Stage** | Stage 00 |

## Context

Production MongoDB is a standalone self-hosted 8.0 server and stays unchanged until after launch (D23, D28). Standalone servers support neither transactions nor change streams.

## Decision

All multi-step flows use single-document atomic steps: P1 conditional updates, P2 owner ids recorded in the same document (`applyOwned`/`undoOwned`/`transferOwned`), P3 state documents (`transition`), P4 the reconciler, P5 events stored in the document. Lint (`b2b:guards`) bans `startSession`, `withTransaction`, `.watch(`.

## Options considered

| Option | Pros | Cons |
| --- | --- | --- |
| Single-document patterns (chosen) | Correct on standalone and on a future replica set; no DB change | More careful code; reconciler required |
| Convert production to a replica set before launch | Simpler code with transactions | Owner declined touching the database before launch |
| Separate database for B2B | Clean | Owner wants one database |

## Consequences

- Positive: rooms can never be double sold; a crash can only briefly block rooms.
- Trade-off: ~2 extra weeks of effort.
- Follow-up: crash-injection test for every flow.

## Validation

`tests/b2b/consistency-kit.test.js` (crash after every step, 20-buyer race, overlapping stays).
