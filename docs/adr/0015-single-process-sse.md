# ADR-0015: Everything inside the one backend — background work in-process, live updates over Server-Sent Events

| | |
| --- | --- |
| **Status** | Accepted — supersedes [ADR-0010](0010-self-hosted-realtime.md) (the separate Socket.IO process) and the separate worker container (the relay and job queue of ADR-0005 stay the same, now in-process) |
| **Date** | 2026-11-13 |
| **Deciders** | Owner + tech lead |
| **Stage** | Stage 00 |

## Context

The owner wants exactly **one deployed backend and one frontend** — the existing musafirbaba.com apps. New B2B and hotel pages are routes under musafirbaba.com, and the new API is `/api/v1` on the existing backend. No new containers, hostnames, Cloudflare routes or Vercel projects. The earlier design ran two extra containers from the same image: a worker (`worker.js`) and a Socket.IO realtime server (`realtime.js`) on a new hostname. WebSockets inside the existing process would need `server.js` (the HTTP server) to be edited, which the zero-impact rule forbids.

## Decision

1. **Background work runs inside the existing backend process**, only when `B2B_ENABLED=true`. `routes/v1.js` connects the B2B database, then calls `startBackground()` (`src/b2b/background.js`), which runs the job runner, the lease-locked scheduler (reconciler, invariant checks) and the event relay. `B2B_BACKGROUND=false` turns those three off.
   - Every loop catches and logs its own errors. Nothing may throw into the existing app.
   - Timers are `unref`'d, and no signal handlers are installed, so the existing app's start and stop behaviour is unchanged.
   - Lease locks and repeat-safe steps keep everything correct if more than one backend container ever runs.
2. **Live updates use Server-Sent Events** at `GET /api/v1/realtime/stream`, an ordinary HTTP response from the B2B router (no `server.js` edit, no package, same address).
   - Each process tails the capped `rt_signals` collection once and writes matching signals to its open streams. `cache:evict` signals clear that process's shared caches.
   - **Personal rooms** come from the caller's normal login (`Authorization` header; signed-in pages open the stream with `fetch`). **Public availability rooms** can be added with `?rooms=` (max 20). No realtime token or secret, and nothing secret in the URL, because the existing request logger prints URLs.
   - Limits: 20 streams per IP, 5,000 in total. Slow readers are dropped. A 25 s heartbeat keeps proxies open. `Last-Event-ID` replays missed signals for up to 2 minutes / 100 signals; otherwise a `resync` event is sent.

## Options considered

| Option | Pros | Cons |
| --- | --- | --- |
| In-process loops + SSE (chosen) | One app; no new process, hostname or package; `server.js` untouched | Background work shares the backend's CPU (kept small; can move out later) |
| Separate worker + Socket.IO containers (ADR-0010) | Isolated CPU | Two extra containers and a new hostname — the owner rejected this |
| Socket.IO attached to the existing server | Two-way, mature | Needs a `server.js` edit and a runtime package |
| Polling only | Simplest | Slower updates, more requests |

## Consequences

- Positive:
  - One deployable, as the owner asked.
  - The B2B code now adds **0 runtime packages** (`socket.io` and `socket.io-client` removed).
  - No `B2B_REALTIME_SECRET`, `B2B_REALTIME_PORT` or `B2B_REALTIME_ORIGINS` settings.
- Trade-offs:
  - One-way pushes only. That's enough: browsers fetch details over the API.
  - Heavy background work must stay in small batches so `/api` latency doesn't move. If load ever needs it, the same `startBackground()` can run in its own process without code changes in the modules.
- Kill switches: `B2B_ENABLED=false` (everything off) and `B2B_BACKGROUND=false` (jobs off, live updates on).

## Validation

- `tests/b2b/realtime.test.js` covers:
  - streams through the real router and in-memory MongoDB;
  - room isolation;
  - public-room rules;
  - `cache:evict`;
  - `Last-Event-ID` replay and `resync`;
  - the per-IP limit;
  - in-process jobs, and the jobs-off switch.
- `tests/b2b/real-app-crash-isolation.test.js`: a broken B2B config still gives 503 only on `/api/v1`.
