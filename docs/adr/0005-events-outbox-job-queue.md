# ADR-0005: Events in the document, outbox relay, MongoDB job queue (no Redis)

| | |
| --- | --- |
| **Status** | Accepted |
| **Date** | 2026-11-12 |
| **Deciders** | Owner + tech lead |
| **Stage** | Stage 00 |

## Context

No Redis is set up (D22) and no transactions are available (ADR-0003), yet side effects (emails, notifications, webhooks) must happen exactly once.

## Decision

The state change pushes its event into the document's `pendingEvents` in the same update. The worker relay copies events to `core_outbox` (_id = eventId), enqueues one `core_jobs` job per consumer (dedupe key) and pulls them; consumers record handled events in `core_inbox`. Jobs are claimed with leases; schedules are lease-locked in `core_schedules`.

## Options considered

| Option | Pros | Cons |
| --- | --- | --- |
| MongoDB-only (chosen) | No new infrastructure | Polling load on MongoDB (kept small) |
| BullMQ + Redis | Mature | Redis not available (D22) |
| Outbox in a transaction | Standard | No transactions (ADR-0003) |

## Consequences

- Positive: nothing lost, nothing sent twice, safe with several workers.
- Trade-off: ~500 ms delivery delay.
- Follow-up: revisit Redis if DEF-020 triggers are hit.

## Validation

`tests/b2b/events-relay.test.js`, `jobs.test.js`.
