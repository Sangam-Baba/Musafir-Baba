# Go-live runbook — B2B Stages 00–04 (hotel onboarding, listings, rooms & rates)

> For whoever runs the production server and the Vercel project. Every step is reversible: `B2B_ENABLED=false` (then
> `docker compose up -d`) switches all new code off at once. Nothing existing is changed.

## What goes live

Hotels can register, upload their documents and get verified, add properties (room types, photos), submit listings,
and set rooms, prices, rules and cancellation policies. MusafirBaba admins review KYC and listings and can override
calendars. **Nothing can be booked or paid yet** (Stages 05–08).

## 0. Before you start

- [ ] Owner sign-off of Stages 00–04 (`docs/progress/stages/stage-0N.md` → Finished).
- [ ] Human review of the inventory code (`backend/src/b2b/modules/hotel-inventory/`: `night-steps.js`,
      `hold.service.js`, `safety-net.js`, `calendar-writes.js`, the validator in `models/inventory-day.model.js`).
- [ ] Owner checks O1, O2, O4, O5 (`docs/existing-system-map.md` §9).
- [ ] A fresh production database backup exists.

## 1. Sign-in across two sites: the login relay (decision D35)

The API stays on `musafirbabaserver.3mongoose.online`; the website is `musafirbaba.com` — two different sites, so browsers
wouldn't send the API's strict sign-in cookie. Instead, **only the sign-in calls** (login, email code, two-step,
refresh, sign-out, hotel registration, accepting an invitation) go through a small relay on the website
(`frontend/src/app/api/v1/[...path]/route.ts`, a Vercel function). The cookie then belongs to `musafirbaba.com` and
stays HttpOnly + strict; everything else (calendar, uploads, live updates) still goes straight to the API.

Generate one more secret and keep it: `openssl rand -base64 48` → **`B2B_RELAY_SECRET`** (the same value on Vercel and on
the server). It lets the API see the visitor's real IP behind the relay (rate limits, activity log); nobody without it
can fake an IP.

## 2. Merge the code

- Merge the pull request `b2b/stage-00` → `main` on GitHub (fast-forward, no conflicts at the time of writing).
- The workflow *Deploy Backend to musafirbabaserver* rebuilds the backend. B2B is still **off** (no `B2B_ENABLED`).
- Smoke check the existing system: `/api/app-home` → 200, website home and package pages, admin login page,
  MBGO / MBConnect app calls.

## 3. Backend settings (server, `~/server/docker/musafirbaba-backend/.env`)

Add these lines (nothing existing is changed). First with B2B still **off**:

```bash
# generate each secret once and KEEP it (password manager). Losing B2B_FILE_KEY = stored documents can't be opened.
openssl rand -base64 48   # → B2B_AUTH_SECRET
openssl rand -base64 48   # → B2B_FILE_KEY
```

```env
B2B_ENABLED=false
B2B_BACKGROUND=true
B2B_AUTH_SECRET=<first secret>
B2B_FILE_KEY=<second secret>
B2B_PUBLIC_URL=https://musafirbaba.com
B2B_FILE_STORAGE=r2
B2B_MEDIA_BASE_URL=https://cdn.musafirbaba.com
B2B_EMAIL_MODE=resend
B2B_EMAIL_FROM=MusafirBaba Business <business@musafirbaba.com>
B2B_RELAY_SECRET=<third secret, same as on Vercel>
```

- `B2B_FILE_STORAGE=r2` uses the existing `R2_*` settings already in this file (documents under `b2b-private/`, photos
  under `b2b-public/`). Without it, uploads would be written inside the container and lost on the next rebuild.
- `B2B_EMAIL_*` uses the existing `RESEND_API_KEY`; the sender's domain must be verified in Resend. Without it, emails
  are only written to the log (hotels can't confirm their email).
- `ALLOWED_ORIGINS` (existing) must include `https://musafirbaba.com` and `https://www.musafirbaba.com` if used.

Apply: `docker compose up -d` (recreates the container with the new settings).

## 4. Create the new collections (once)

```bash
docker exec musafirbaba-backend node src/b2b/migrate.js
```

Only new prefixed collections and indexes are created (`id_`, `org_`, `acl_`, `kyc_`, `file_`, `aud_`, `htl_`, `inv_`,
`ntf_`, `core_`, `rt_` …); existing collections are never touched. Expect "applied: 0001 … 0034".

## 5. Switch B2B on

Set `B2B_ENABLED=true` in the `.env`, then `docker compose up -d`.

- Check: `curl -s https://musafirbabaserver.3mongoose.online/api/v1/health` → `"status":"ok"` (database up, background running).
- Existing smoke checks again (step 2).

## 6. First MusafirBaba admin

The admin script isn't inside the image; copy it in once:

```bash
docker cp backend/scripts musafirbaba-backend:/app/scripts   # from a checkout of main on the server
docker exec musafirbaba-backend node scripts/b2b/grant-admin.js <staff email> platform.superAdmin
```

After that, Super Admins give other staff their B2B roles in the admin pages.

## 7. Frontend (Vercel)

Project → Settings → Environment Variables (Production), then redeploy (or it deploys with the merge):

| Name | Value | Visible to the browser? |
| --- | --- | --- |
| `NEXT_PUBLIC_B2B_API_URL` | `https://musafirbabaserver.3mongoose.online/api/v1` | yes |
| `NEXT_PUBLIC_B2B_AUTH_RELAY` | `true` | yes |
| `B2B_UPSTREAM_URL` | `https://musafirbabaserver.3mongoose.online/api/v1` | **no** (server only) |
| `B2B_RELAY_SECRET` | the third secret (same as the server) | **no** (server only) |

- Google Maps key (Google Cloud Console): allow `https://musafirbaba.com/*` and `https://www.musafirbaba.com/*` and keep
  the *Maps JavaScript API* enabled (the location pin; without it hotels type latitude / longitude).
- Check: `curl -s -X POST https://musafirbaba.com/api/v1/auth/refresh -H "X-B2B-Auth: 1"` → `401 REFRESH_INVALID`
  (the relay reaches the API); `curl -s -X POST https://musafirbaba.com/api/v1/files/x` → `404`.

## 8. Try it end to end

1. `https://musafirbaba.com/business` → Register a test hotel → confirm the email.
2. Upload the documents, add the bank account, submit for verification.
3. Admin: `/admin/b2b` → KYC queue → verify documents → approve.
4. Hotel: add a property (all steps, room types, photos) → submit → admin approves the listing.
5. Hotel: Rooms & rates → add a cancellation policy, a rate plan, set rooms and prices for 30 nights.
6. Reload the page while signed in — you stay signed in (confirms the login relay, step 1).

## 9. Watch, and how to roll back

- First days: site response times and errors, MongoDB CPU / connections / slow queries, the backend log for
  `invariant violated`, `reconciler`, `b2b` errors.
- **Roll back**: `B2B_ENABLED=false` → `docker compose up -d`. The website, apps and admin work exactly as before; the new
  collections stay (unused) until switched on again.
