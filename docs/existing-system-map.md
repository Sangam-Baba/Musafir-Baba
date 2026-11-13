# Existing System Map (Stage 00 · S00-T01)

> Read-only map of today's MusafirBaba system, written for the new B2B + hotel service (`backend/src/b2b/`).
> Produced 12 Nov 2026 by reading the repository. **Nothing was changed.** Items marked **🟡 OWNER CHECK** can only be answered on the server or in a dashboard; the read-only commands are given.
> Rules this map serves: `docs/plan/12-protecting-the-existing-system.md`.

## 1. Backend (`backend/`) — do not change

| Item | Finding |
| --- | --- |
| Runtime | Node 22, Express 5, Mongoose 8.17, plain JavaScript (ESM), no build step |
| Start | `Dockerfile`: `node:22-slim`, `npm ci --omit=dev`, copies `src`, `CMD node src/server.js`, port 8000, health check on `/` |
| App | `src/app.js`: request logger → CORS (`ALLOWED_ORIGINS` or `FRONTEND_URL`; credentials on) → JSON body (50 MB) → cookies → audit interceptor → routes under **`/api`**. No route under `/api/v1` |
| DB connection | `src/config/db.js`: `mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000, socketTimeoutMS: 45000 })`; no global `sanitizeFilter`, no `autoIndex` setting (default on — **for the existing app only**) |
| Transactions / change streams | None used |
| Existing cron | `node-cron` dependency (existing jobs — not touched) |

## 2. Database

| Item | Finding |
| --- | --- |
| Local dev | Atlas free tier (`mongodb+srv://…` in `backend/.env`) |
| Production | Self-hosted MongoDB 8.0 container `musafirbaba-mongo` (per `docs/SERVER_BACKUP_AND_RESTORE.md`), database `test`, ~96 collections, ~37 MB dump |
| Existing model → collection names | ~100 models (Booking, User, Staff, Invoice, Subscription, Document, Counter, Notification, Session, Partner*, Rider*…). **None uses an underscore prefix**, so the new prefixes (`org_`, `htl_`, `inv_`, `wal_`, `core_`, `rt_`…) cannot collide with any model in code |
| Collections the new system reads (read-only) | `users` (model `User`), `staffs` (model `Staff`), **`sessions`** (model `Session`, from `AuthSession.js` — needed to respect logout/revoke, see §3) |

**🟡 OWNER CHECK — production database (read-only):**
```bash
ssh 3mongoose 'docker exec musafirbaba-mongo sh -c '\''mongosh -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --quiet test --eval "
  try { rs.status(); print(\"REPLICA SET\") } catch (e) { print(\"STANDALONE (expected)\") }
  print(\"collections:\", db.getCollectionNames().length)
  print(\"prefix clash:\", db.getCollectionNames().filter(n => /^(org|kyc|htl|inv|prc|ord|hbk|wal|pay|ntf|mtr|sub|bil|api|whk|doc|rpt|core|rt)_/.test(n)))
  print(\"webpage slugs clash:\", db.webpages.find({ slug: /^(hotels|business|admin\/b2b)/ }, { slug: 1 }).toArray().map(d => d.slug))
  const s = db.serverStatus(); print(\"connections:\", s.connections.current, \"/\", s.connections.available)
"'\'''
ssh 3mongoose 'free -h; nproc; df -h /'
```
Expected: `STANDALONE`, `prefix clash: []`, `webpage slugs clash: []`. Note the real collection name of the CMS pages (`webpages` assumed).

## 3. Logins — how the new API can accept them without changing anything

| | Website customer (`User`) | Admin (`Staff`) |
| --- | --- | --- |
| Issued by | `controllers/auth.controller.js` | `controllers/staff.controller.js` |
| Access token | JWT signed with **`JWT_ACCESS_SECRET`**, TTL `ACCESS_TOKEN_TTL` (default 1 day); payload `{ sub, role, sessionId, name }` | JWT with the **same secret**; payload `{ sub, role, permissions, sessionId }` |
| Refresh token | HttpOnly cookie `user_refresh_token` on the existing backend host (`JWT_REFRESH_SECRET`) | HttpOnly cookie `admin_refresh_token` |
| How the browser sends it | `Authorization: Bearer <access>` (frontend stores it in memory — `store/useAuthStore.ts`, not persisted; refreshes through the existing `/auth/refresh`) | Same pattern (`store/useAdminAuthStore.ts`) |
| Session check | `middleware/session.middleware.js` looks up `Session` by `sessionId` and rejects `logout`/`revoked` | Same `sessions` collection |

**Conclusion for the new API (`/api/v1`, same backend host):** accept `Authorization: Bearer` tokens from the existing logins by verifying them with the existing `JWT_ACCESS_SECRET` — no cookie needed, no existing code changed. Because customers and staff share one secret, the new API must:
1. decide customer vs staff from the `role` claim and check that the `sub` exists in `users` or `staffs` respectively (read-only);
2. check the `sessions` entry (read-only) so logged-out or revoked sessions are refused, like the existing middleware does;
3. leave refreshing to the existing backend (the frontend already does this).

Business users (B2B clients, hotels) get the **new** login system (Stage 01), not these tokens.

## 4. PayU — the existing integration

| Item | Finding |
| --- | --- |
| Env | `PAYU_KEY`, `PAYU_SALT`, `PAYU_ENV` |
| Callbacks | Browser return URLs (surl/furl) on the existing backend: `/api/payment/success`, `/failure`, `/success-ride`, `/failure-ride` |
| Merchant-level webhook | Not used in code |
| **Existing txn-ID prefixes** | `txn…` (website: holidays, membership, payment page, plan-my-trip, rental, visa), `MBGO`, `MBGX`, `MBGT`, `MBGV`, `MBGC`, `MBCR`, `MBV`, `MBT`, `MB-` |

**Conclusion:** the plan's proposed prefixes `MBH`/`MBW`/`MBS` sit in the crowded `MB…` family. Use **`B2BH`** (hotel orders), **`B2BW`** (wallet top-ups), **`B2BS`** (subscriptions) — no existing ID starts with `B2B`. *(Plan update needed — see §8.)*

**🟡 OWNER CHECK — PayU dashboard (look only, change nothing):** is a merchant-level webhook / notify URL configured? Write down its value. The new system will never change it.

## 5. Frontend (`frontend/`, Next.js 16, React 19)

| Item | Finding |
| --- | --- |
| `proxy.ts` | Entirely commented out — stays untouched |
| Catch-all | `(user)/[...slug]/page.tsx` serves CMS pages via `GET /webpage/slug?slug=…`; a new static `/hotels` or `/business` folder would take priority over a CMS page with the same slug → slug check in §2 |
| Existing hotel entry points | `components/custom/HeroSearchWidget.tsx`: a **"Hotels" tab already exists, `enabled: false`, `href: ""`** · `components/custom/QuickServiceTiles.tsx`: a **"Hotels" tile already links to `/hotels`** (today that URL falls to the catch-all) |
| Site header | `components/common/Header.tsx` (used by `(user)/layout.tsx`) |
| Customer bookings page | `app/(user)/bookings/page.tsx` (also `app/user/bookings/page.tsx` exists — confirm which one is live) |
| Admin layout / sidebar | `app/admin/layout.tsx` uses `components/admin/app-sidebar.tsx` |
| Env | `NEXT_PUBLIC_BASE_URL` (existing backend `…/api`), `NEXT_PUBLIC_SITE_URL`, Cloudinary, Google Maps |
| Realtime client | None needed — live updates are Server-Sent Events (browser `EventSource` / `fetch`), ADR-0015 |

**Refined frontend edit list (replaces E1 in plan file 12):**
- **E1a** `HeroSearchWidget.tsx`: Hotels tab → `enabled: NEXT_PUBLIC_FEATURE_HOTELS === 'true'`, `href: '/hotels'`.
- **E1b** `QuickServiceTiles.tsx`: already links to `/hotels` → **no edit needed**; once `/hotels` exists it works. ⚠ Today this tile points at a page that doesn't exist, so it is already broken in production. Building `/hotels` fixes it; until then, decide whether the new page shows "coming soon" while the flag is off.
- **E2** `app/(user)/bookings/page.tsx`: flagged "Hotels" tab.
- **E3** `components/admin/app-sidebar.tsx`: flagged links to `/admin/b2b/*`.
- **E4** env: `NEXT_PUBLIC_B2B_API_URL`, `NEXT_PUBLIC_FEATURE_HOTELS`, `NEXT_PUBLIC_FEATURE_B2B`.

## 6. Email, files, notifications

| Item | Finding | New system |
| --- | --- | --- |
| Email | `services/email.service.js` uses Resend | New adapter with the same key; don't import this file |
| Files | Cloudinary (`config/cloudinary.js`, signatures) and Cloudflare R2 (`cloudflareSignature.js`, `migrateToR2.service.js`) | Same provider, separate `b2b/` prefix or bucket |
| App notifications | Ably + Expo (`services/notification/*`, `Notification` model) | Not used, not imported |

## 7. Deployment

| Item | Finding |
| --- | --- |
| Backend container | `musafirbaba-backend` on the 3mongoose server, plus `musafirbaba-mongo` |
| Tunnel | `cloudflared` (systemd) on the server |
| Production deploy | `.github/workflows/deploy-musafirbabaserver.yml`: on every push to `main` that changes `backend/**`, the self-hosted runner `musafirbabaserver` resets `~/server/docker/musafirbaba-backend` to `origin/main` and runs `docker compose up -d --build`. **So merging B2B work into `main` redeploys the backend** — safe while `B2B_ENABLED` is unset (the B2B code stays switched off). Not changed by B2B work |
| `BACKEND_URL` in `backend/.env` | points to an `onrender.com` host (local file). Production is the server container above (O3 answered); confirm Render is no longer serving traffic |
| Frontend hosting | **🟡 OWNER CHECK:** Vercel? (the runbook says Vercel/Render are not touched) — needed to add the `NEXT_PUBLIC_*` variables for E4 |
| Host capacity | **🟡 OWNER CHECK:** the `free -h; nproc; df -h` output from §2 — two new containers (worker, realtime) need roughly 0.5 GB RAM in total at pilot scale |

## 8. Plan updates triggered by this map

1. txn-ID prefixes `MBH/MBW/MBS` → **`B2BH/B2BW/B2BS`** (`12-…` §4, Stage 07, `AGENTS.md`).
2. `legacy-read` reads **`users`, `staffs` and `sessions`** (read-only), and checks role + session for existing-login tokens (`12-…` D2, Stage 01).
3. Frontend edit E1 = **enable the existing Hotels tab** (and the existing tile starts working), not a new header link.

## 9. Still open (owner checks above)

| # | Check | Blocks |
| --- | --- | --- |
| O1 | Production DB: standalone, no prefix clash, no `hotels`/`business` CMS slugs, connections, host capacity | Stage 00 DoD |
| O2 | PayU dashboard: merchant webhook URL (record only) | Stage 07 |
| O3 | ~~Which backend serves production~~ — the server container, deployed from `main` (see §7); just confirm Render is idle | — |
| O4 | Frontend hosting and how env vars are set | Edit E4 |
| O5 | Which customer bookings page is live: `(user)/bookings` or `user/bookings` | Edit E2 |
