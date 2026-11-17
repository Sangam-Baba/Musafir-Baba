# ADR-0001: New code isolated in backend/src/b2b inside the existing backend

| | |
| --- | --- |
| **Status** | Accepted — amended by [ADR-0015](0015-single-process-sse.md): the worker and realtime parts run inside the existing backend process (no extra containers) |
| **Date** | 2026-11-12 |
| **Deciders** | Owner + tech lead |
| **Stage** | Stage 00 |

## Context

The owner wants one app and one database, and zero risk to working features (website, admin, MBGO, MBConnect). A separate Node.js service was proposed and rejected (2026-11-12).

## Decision

All B2B + hotel code lives in `backend/src/b2b/` (tests `backend/tests/b2b/`, tooling `backend/scripts/b2b/`). The API is mounted at `/api/v1` by two lines in `app.js`, only when `B2B_ENABLED=true`, before the existing body parsers/audit interceptor, with a guarded dynamic import. The worker and realtime processes run as extra containers from the same image.

## Options considered

| Option | Pros | Cons |
| --- | --- | --- |
| Isolated folder in the existing backend (chosen) | One app, one deploy pipeline; existing code untouched except B1–B5 | Shares the Node process for /api/v1 → timeouts, rate limits, heavy work in the worker |
| Separate b2b-backend service | Strongest isolation | Rejected by the owner: a second Node app |
| Modules mixed into existing folders | Simplest | High risk of breaking working logic |

## Consequences

- Positive: existing behaviour unchanged when the flag is off; a broken B2B module returns 503 on /api/v1 only.
- Trade-off: B2B API shares the existing process's event loop.
- Follow-up: monitoring of existing latency after each deploy (12-… §6).

## Validation

`tests/b2b/real-app-flag-off.test.js`, `real-app-crash-isolation.test.js`, `mount.test.js`; `npm run b2b:guards`.
