# 11 — Notifications and Real-Time (self-hosted contract)

> How users of the **new** B2B and hotel system are told about things that matter (booking confirmed, new booking for a hotel, KYC decision, low wallet balance) and how open screens stay live (availability changes).
> Two fixed decisions (12 Nov 2026): **(1) no third-party service is used for the new notification features** — everything runs on our own servers; **(2) nothing that works today is changed** — the existing app notifications stay exactly as they are.
> Changes to this file need an ADR and two senior approvals.

---

## 1. The guarantee

**No important notification is ever lost** — even if the live connection drops, the user is offline, or the realtime server restarts. Live pushes make notifications *instant*; the database record and catch-up make them *certain*; escalation makes sure someone *acts*.

## 2. Existing notification system — left untouched

The MBConnect and MBGO apps already have working notifications. **None of these files, collections, routes or settings are modified, imported or reused by the new system:**

| Existing piece | Used by | Status |
| --- | --- | --- |
| `backend/src/services/notification/notificationService.js` (`notifyUser`) | MBConnect, MBGO | **Do not touch** |
| `backend/src/services/notification/transport.js`, `transports/ablyTransport.js`, `config/ably.js` (Ably) | MBConnect, MBGO | **Do not touch** |
| `backend/src/utils/notifications.js` (Expo push) | MBConnect, MBGO | **Do not touch** |
| `backend/src/models/Notification.js` (`recipientType: Rider/Partner`) | MBConnect, MBGO | **Do not touch** |
| Routes `/partner/notifications/realtime-token`, `/rider/realtime-token`, channels `notifications:partner:*` / `notifications:rider:*` | MBConnect, MBGO | **Do not touch** |
| `mobile/`, `mobile_user/` apps | — | **Do not touch** |
| Resend email calls in existing controllers (OTP, contact, invoices, newsletter) | Website, admin, apps | **Do not touch** |

The new system lives entirely in new code: `backend/src/b2b/modules/notifications/`, the live-update stream inside the existing backend (`GET /api/v1/realtime/stream`, ADR-0015), new `ntf_*` collections and new frontend files. A lint rule blocks new modules from importing any of the files above.

## 3. What we build (all self-hosted)

| Piece | Technology | Runs on | Third-party service? |
| --- | --- | --- | --- |
| Live connection to browsers | **Server-Sent Events** (plain HTTP, built into every browser — no library) | The existing backend, `GET /api/v1/realtime/stream` on musafirbaba.com's API address | No |
| Hand-off from background work to the open streams | Capped MongoDB collection `rt_signals` read with **one tailable cursor per backend process** (works on the standalone server; no Redis — D22) | Our existing MongoDB | No (existing database) |
| Stored notifications (the bell) | MongoDB `ntf_inbox` | Our existing MongoDB | No (existing database) |
| Delivery, retries, escalation | Jobs in the MongoDB job queue (`core_jobs`) run by the background loops | Inside the existing backend process (only when `B2B_ENABLED=true`) | No |
| In-app UI | Bell, toasts, sound, connection indicator in the Next.js app | Existing frontend | No |
| Email (invitations, password reset, email OTP, critical alerts) | Existing Resend account through a new `EmailPort` adapter (D25) | Resend (already used by the backend) | Existing account — no new service |
| WhatsApp / SMS | **Not in v1** — every option requires an outside provider (DEF-016) | — | — |

## 4. Architecture

```
 Business change (booking confirmed, KYC approved, …)
   │  same single-document update (event stored in the document)
   ▼
 core_outbox event ──► background job (core_jobs, inside the backend)
                         │ 1. write ntf_inbox row(s)   ← source of truth
                         │ 2. insert rt_signals row (room, event, ids)
                         │ 3. queue email (critical only, §7)
                         │ 4. schedule escalation check (§8)
                         ▼
                    rt_signals (capped) ── tailable cursor
                         ▼
        existing backend: SSE hub (GET /api/v1/realtime/stream)
                         ▼  Server-Sent Events (plain HTTP, same address)
   Business area / admin pages in the existing Next.js app
   (bell updates, toast + sound, "availability changed" refresh)
```

**Why inside the existing backend, over Server-Sent Events (ADR-0015, replaces ADR-0010):**
- **One app.** No new process, container, port, hostname or Cloudflare route — the owner wants only musafirbaba.com and the existing backend running.
- **Zero change to the existing server.** SSE is an ordinary HTTP response from a `/api/v1` route, so `server.js` is not edited (WebSockets would need the HTTP server itself).
- **No package.** Browsers have `EventSource` built in; the backend writes plain text. Signed-in pages open the same URL with `fetch` so they can send their normal `Authorization` header (no token in the URL — the existing request logger prints URLs).
- **Can't hurt the existing app.** Every B2B loop catches its own errors and its timers are unref'd; limits per IP and in total; slow readers are dropped instead of buffering; a 25 s heartbeat keeps Cloudflare from closing idle streams.
- One direction (server → browser) is all we need: the browser only *receives* pushes and fetches details over the normal API.

Business code never holds connections — it publishes with `realtime.publish()`, which inserts a row into `rt_signals`. Each backend process tails that collection once and writes matching signals to its open streams. Each message carries the signal id; a reconnecting browser sends `Last-Event-ID` and gets what it missed (up to 2 minutes / 100 signals), otherwise a `resync` event tells the page to reload its data. Anything older is covered by the stored inbox + catch-up.

## 5. Rooms (channels) and security

| Room | Joined by | Carries | Example events |
| --- | --- | --- | --- |
| `b2b:user:{userId}` | That business user only | `notification:new {id, category, title}` | Your role changed, your export is ready, the booking you made is confirmed |
| `b2b:org:{orgId}` | Members of that org whose role allows the category | `notification:new {id, category, title}` | Hotel: new booking, cancellation · Client: wallet low, plan limit, KYC decision |
| `b2b:admin:{queue}` | Staff with the queue's permission | `queue:changed {queue, count}` | New KYC application, amendment SLA due, unacknowledged hotel booking |
| `availability:property:{propertyId}` | Anyone viewing that hotel (website, dashboard, hotel calendar) | `availability:changed {propertyId, dates}` only | Room booked/cancelled, hotel edited the calendar |

The `b2b:` / `availability:` prefixes can never clash with the existing apps' `notifications:partner:*` / `notifications:rider:*` channels (which stay on Ably).

Security rules:
1. **Auth = the normal login.** Signed-in pages open `GET /api/v1/realtime/stream` with `fetch` and their usual `Authorization` header; the same authentication as every other `/api/v1` request runs on connect and on every reconnect. No separate realtime token or secret.
2. **The server picks personal rooms, the client can't.** Personal rooms come from the caller's identity (`roomsForActor`). The browser may only add public `availability:property:{id}` rooms (`?rooms=`, max 20, format-checked; Stage 06 adds the "real, LIVE property" check).
3. **Messages carry ids and short titles only** — no prices, guest data or amounts. The browser fetches details through the normal API, which applies permissions.
4. **Revocation:** suspended org / removed role → the API publishes `session:revoke` to the user's room and the stream hub closes matching streams (Stage 01); the reconnect then fails authentication.
5. Website customers (not logged into the business area) only get `availability:property:*`. Their booking updates come by email and on the existing website pages.
6. Limits on open streams per IP (20) and in total (5,000); max signal size 2 KB; the existing backend's CORS allow-list applies unchanged (`musafirbaba.com` serves `/business` and `/admin`).

## 6. Five layers that make it reliable

| # | Layer | What it does |
| --- | --- | --- |
| 1 | **Event stored with the change** | Pushed into the business document in the **same single-document update** as the change, then relayed to the outbox. If the change happened, the notification will happen |
| 2 | **Stored notification** | A background job writes `ntf_inbox` (idempotent per event + recipient) — the source of truth for the bell |
| 3 | **Live push** | `rt_signals` row → tailable cursor → SSE hub in the backend → open pages update within about a second |
| 4 | **Catch-up** | On page load and every reconnect the browser calls `GET /api/v1/notifications?after=<cursor>`; while disconnected it polls every 60 s. `Last-Event-ID` replay (up to 2 min) fills short disconnections. A missed push is filled in within seconds |
| 5 | **Escalation** | Critical events that nobody acts on are repeated and escalated inside our own system (§8), plus email where D25 allows |

## 7. Email (decision D25 — DECIDED: option A)

Email is the only way to reach someone who is **not** looking at the dashboard, and the new system also needs it for invitations, password reset and KYC results. Options:

| Option | Third-party? | Notes |
| --- | --- | --- |
| **A. Reuse the existing Resend account** through a new `EmailPort` adapter (recommended) | Already used by the backend today — no *new* service, no new contract | Reliable delivery; existing Resend code is not modified — the new module has its own adapter |
| B. Self-hosted mail server (e.g. Postfix/Haraka on our host) | No | Hard to get emails into inboxes (IP reputation, SPF/DKIM/DMARC, blocklists); needs ongoing maintenance; many hosts block outbound port 25 |
| C. No email from the new system | No | Not workable: invitations, password reset and KYC results need email |

**Decision: A.** Implementation rules:
- New adapter `modules/notifications/infra/resend-email.adapter.js` implementing `EmailPort` with its own client instance; it reads the existing `RESEND_API_KEY` but **does not import or change** the existing `services/email.service.js` or any existing controller.
- Separate sender identity for the new system (e.g. `notifications@` / `business@` on a verified subdomain) with SPF/DKIM set up in Stage 02 week 1, so business mail doesn't affect the website's existing emails.
- All sends go through background jobs with retries, delivery log (`ntf_email_messages` / `ntf_email_attempts`) and an ops alert on repeated failure.
- Because email goes through `EmailPort`, switching to a self-hosted mail server later is one new adapter.

## 8. Escalation (critical events must be acted on — no outside channels)

| Event | If not acted on within | Then |
| --- | --- | --- |
| Hotel new booking not **acknowledged** | 15 min | Repeat in-app alert with sound to all front-desk/manager users of that property + email (D25) |
| | 30 min | Escalate to the hotel org owner (in-app + email) |
| | 60 min | **Ops queue alert** in admin (`b2b:admin:hotel-ack`) with the hotel's phone number so MusafirBaba staff call the hotel |
| Hotel cancellation / cannot-honour | Immediately | Client org in-app + email; ops queue alert |
| KYC application waiting | 24 h | Admin queue escalation |
| Email delivery failed | Immediately | Ops queue alert with recipient and event |

All timings are configurable per property / category. Escalations run as scheduled jobs in the MongoDB job queue and stop as soon as someone acknowledges.

## 9. Notification catalogue (v1)

| Category | Recipient | In-app (live + stored) | Email (D25) | Critical |
| --- | --- | --- | --- | --- |
| Booking confirmed | Client org (booker + accountants) / website customer (email only) | ✅ | ✅ | ✅ |
| **New booking for hotel** | Hotel org (front desk + manager of that property) | ✅ with sound, stays until acknowledged | ✅ | ✅ |
| Booking cancelled | Client org, hotel org | ✅ | ✅ | ✅ |
| Hotel cannot honour / relocated | Client org, customer (email), ops | ✅ | ✅ | ✅ |
| Payment failed / refund processed | Payer | ✅ | ✅ | ✅ |
| KYC submitted / approved / rejected | Applicant org; admin queue | ✅ | ✅ | ✅ |
| Wallet low balance / credit due | Client owner + accountants | ✅ | ✅ | — |
| Plan limit 80 % / 100 % | Client owner + admins | ✅ | ✅ | 100 % ✅ |
| Amendment update | Client org; admin queue | ✅ | ✅ | — |
| No-show marked (dispute window) | Client org | ✅ | ✅ | ✅ |
| Payout sent / statement ready | Hotel owner | ✅ | ✅ | — |
| Team: invited, role changed | The user | ✅ | ✅ | — |
| Security: new login device, password changed | The user | ✅ | ✅ | ✅ |

Critical categories can't be switched off in preferences and ignore quiet hours.

## 10. Data model

| Collection | Key fields | Indexes |
| --- | --- | --- |
| `ntf_inbox` | `recipientType (USER/ORG)`, `recipientId`, `orgId`, `category`, `title`, `body`, `link`, `entityRef {type, id}`, `critical`, `createdAt`, `readBy[] {userId, at}`, `acknowledgedAt?`, `acknowledgedBy?`, `eventId` | unique `{eventId, recipientId}`, `{recipientId, createdAt:-1}` |
| `ntf_preferences` | `userId`, `category`, `channels {inApp, email}`, `quietHours` | unique `{userId, category}` |
| `ntf_escalations` | `inboxId`, `rule`, `step`, `dueAt`, `status (PENDING/DONE/CANCELLED)` | `{status, dueAt}` |
| `ntf_email_templates`, `ntf_email_messages`, `ntf_email_attempts` | Email templates (versioned) and delivery log | `{status, createdAt}` |

Org notifications are stored once per org; "read" is tracked per user (`readBy`), and "acknowledge" categories (new hotel booking) are cleared for everyone once any authorised user acknowledges.

## 11. API (new, under `/api/v1`)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/realtime/stream?rooms=` | Server-Sent Events: personal rooms from the login + up to 20 public availability rooms |
| GET | `/notifications?after=<cursor>&limit=50&unread=true` | Bell list and catch-up |
| GET | `/notifications/unread-count` | Badge |
| POST | `/notifications/{id}/read` · `/notifications/read-all` · `/notifications/{id}/acknowledge` | Read / acknowledge |
| GET/PUT | `/notification-preferences` | Per category (critical locked) |
| Admin | `/admin/notifications/templates`, `/deliveries`, `/escalations` | Templates, delivery log, escalation board |

## 12. Frontend pattern

```tsx
// One hook used everywhere — handles the stream, reconnect, Last-Event-ID, catch-up and status
function useRealtime(rooms: { availability?: PropertyId }, handlers: RealtimeHandlers): RealtimeStatus;

// Bell
const { data } = useNotifications();     // React Query: GET /notifications (catch-up on mount + reconnect)
useRealtime({}, { onNotification: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }) });
```

- Uses the browser's own `EventSource` for anonymous pages and a small `fetch` stream reader for signed-in pages (needs the `Authorization` header) — no package, no outside service.
- The push only tells the page to refetch; what is shown always comes from the API with permissions.
- Header shows connection status: live / reconnecting / offline (polling).
- Hotel workspace: new-booking toast with sound and a persistent badge until acknowledged; browser tab title flashes while unacknowledged.

## 13. Live availability (inventory) — same rails

- A background job, from `inventory.changed` events (`05-inventory-and-no-double-booking.md` §8), publishes `availability:changed` to `availability:property:{id}` through `rt_signals`.
- Pages refresh offers marked `X-MB-Refresh: realtime` (not billed — Stage 12 §3.2).
- **Correctness never depends on this.** Double booking is prevented by atomic database updates; realtime only keeps screens fresh.

## 14. Operations

| Item | Detail |
| --- | --- |
| Deploy | Nothing extra — part of the existing backend, on only when `B2B_ENABLED=true`; on restart browsers reconnect by themselves (`retry: 3000`) and catch up with `Last-Event-ID` |
| Scale | Each backend container tails `rt_signals` itself, so several containers work without sticky sessions or an adapter |
| Memory | Plan ~50–100 MB per 1,000 connections; include in host sizing (risk K14) |
| Monitoring | Open streams (`hub.stats()`), signals/min, outbox → inbox lag (alert > 30 s), slow readers dropped, unacknowledged hotel bookings, pending escalations past due, email failures |

## 15. Tests that must pass

| Test | Pass condition |
| --- | --- |
| Outbox → inbox | One inbox row per event and recipient, even if processed twice |
| Catch-up | Signal reader stopped → notification still appears via `GET /notifications?after=`; reconnect with `Last-Event-ID` replays missed signals |
| Room security | Personal rooms can't be requested in `?rooms=`; user can't receive another user's or org's events; suspended org's streams closed |
| Permission filter | Org notification only reaches members allowed for the category |
| Escalation | Unacknowledged hotel booking → repeat at 15 min, owner at 30 min, ops alert at 60 min (fixed clock); stops on acknowledge |
| Critical lock | Preferences can't disable critical categories |
| No sensitive data | Stream messages contain only ids, categories and titles (availability: property id + dates) |
| Isolation from existing system | Lint rule blocks imports of the existing notification files; existing app notification tests/smoke checks still pass |
