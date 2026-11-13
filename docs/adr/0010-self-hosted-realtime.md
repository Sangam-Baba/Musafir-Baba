# ADR-0010: Self-hosted Socket.IO via capped rt_signals

| | |
| --- | --- |
| **Status** | Superseded by [ADR-0015](0015-single-process-sse.md) (2026-11-13) — no separate realtime process; live updates are Server-Sent Events from the existing backend |
| **Date** | 2026-11-12 |
| **Deciders** | Owner + tech lead |
| **Stage** | Stage 00 |

## Context

No third-party services for new notifications (D26), no Redis (D22), no change streams (ADR-0003). Existing Ably/Expo code must not be touched.

## Decision

Processes publish small signals into the capped `rt_signals` collection; the realtime process reads them with a tailable cursor and emits to Socket.IO rooms. Personal rooms come from a short-lived HS256 token; browsers may only follow public availability rooms. Notifications are stored first (inbox), so a missed push is caught up.

## Options considered

| Option | Pros | Cons |
| --- | --- | --- |
| Socket.IO + capped collection (chosen) | Self-hosted, no new infrastructure | ~1 s delivery |
| Socket.IO + Redis adapter | Standard | No Redis |
| Ably | Already used by the apps | Third-party; would touch existing code |

## Consequences

- Positive: no third party, no DB change.
- Trade-off: own container and hostname.
- Follow-up: notifications inbox (Stage 02).

## Validation

`tests/b2b/realtime.test.js` (real server + client through MongoDB).
