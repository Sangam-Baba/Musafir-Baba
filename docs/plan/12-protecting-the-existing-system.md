# 12 — Protecting the Existing System (zero-impact rules)

> **Decided 12 Nov 2026 (D28):** the new B2B + hotel system shares the **one existing database**, but it must not change, slow down or break anything that works today — website, admin, MBGO, MBConnect, the existing backend, or the database server itself. The database server is **not restarted or reconfigured** until after launch.
> This file lists every place the new system meets the existing one, how each is kept safe, and how to switch it off. It is mandatory for every stage, every PR and every AI session.

---

## 1. The promise in plain words

- The new system **adds**. It never edits existing logic.
- If the new system has a bug, crashes or is switched off, **today's website, admin and apps keep working exactly as they do now**.
- The existing database keeps its current setup (standalone, no replica set) until after launch. The new code is written to be correct on it as it is (`01-architecture.md` §8).

## 2. Where the new code lives — inside the existing backend, in its own isolated folder

**Decided 12 Nov 2026:** no second Node.js app. The new code lives **inside the existing backend** (`backend/`) but is isolated so it cannot change existing behaviour.

| Item | Decision |
| --- | --- |
| Code | One new folder **`backend/src/b2b/`** (`core/`, `modules/`, `legacy-read/`, `routes/`, `mount.js`, `worker.js`, `realtime.js`). Tests in `backend/tests/b2b/`. Nothing outside these folders is edited, except the short list B1–B5 below |
| Language | **JavaScript (ESM), like the existing backend**, with JSDoc types and `// @ts-check` checked by `tsc --noEmit` in development and CI (D2). The existing backend has no build step and keeps it — no Dockerfile or start-command change |
| HTTP API | Served by the **existing backend process** under **`/api/v1`**. It is mounted **only when `B2B_ENABLED=true`** (default off) and **before** the existing body parsers, cookie parser and audit interceptor, so existing middleware never touches `/api/v1` requests and new code never sees existing `/api/...` requests. No existing route starts with `/api/v1` |
| Crash isolation | `app.js` imports only a tiny `b2b/mount.js`. That file loads the rest of the new code with a guarded dynamic import: if the new code fails to load, the error is logged, `/api/v1` answers `503`, and **the existing app starts and runs normally** |
| Database | The new code uses its **own Mongoose instance** (`new mongoose.Mongoose()`) with its own connection to the same database. So the existing global audit plugin (`config/mongoosePluginInit.js`), default connection settings and models are **not shared**: new models don't write to the existing audit log, and existing models are never affected |
| Background work | `node src/b2b/worker.js` and `node src/b2b/realtime.js` run as **two extra containers from the same backend image** (the image already contains `src/`). The existing backend container keeps its command; its crons and Ably/Expo code are untouched |
| Config | New variables are only **added** to the backend env (`B2B_ENABLED`, `B2B_*`); existing variables (database URI, `JWT_ACCESS_SECRET`, PayU key/salt, Resend key) are read, never changed |

**The complete list of edits to existing backend files** (each reviewed by the owner):

| # | Existing file | Edit | When `B2B_ENABLED` is off |
| --- | --- | --- | --- |
| B1 | `backend/src/app.js` | Two lines: `import { mountB2B } from "./b2b/mount.js";` and `mountB2B(app);` placed right after the CORS block | `mountB2B` returns immediately — no route, no middleware added |
| B2 | `backend/package.json` | New `devDependencies` (`typescript` for checking, `vitest`, `@types/express`) and scripts `test:b2b`, `typecheck:b2b`, `lint:b2b`, `format:b2b`, `b2b:*` (worker, realtime, migrate, guards, progress); later a few runtime dependencies (e.g. `socket.io`), each pinned to an exact version | Dev dependencies aren't installed in production (`npm ci --omit=dev`); new runtime packages are only loaded by new code |
| B3 | `backend/package-lock.json` | Updated by the B2 installs. **Rule: no existing package may change version** — every install is checked with a lockfile diff, and a package that forces bumps is not used (e.g. `supertest` was dropped because it bumped `qs`/`form-data`; tests use built-in `fetch`) | — |
| B4 | Server deployment | Two **new** containers (worker, realtime) from the same image; existing container unchanged | Don't start them |
| B5 | Backend env | New `B2B_*` variables added | `B2B_ENABLED=false` |

## 3. The shared database — rules

| # | Rule | Enforced by |
| --- | --- | --- |
| D1 | The new code **creates and writes only its own collections**, all with the new prefixes (`id_`, `org_`, `acl_`, `kyc_`, `file_`, `aud_`, `htl_`, `inv_`, `prc_`, `ord_`, `hbk_`, `wal_`, `pay_`, `ntf_`, `mtr_`, `sub_`, `bil_`, `api_`, `whk_`, `doc_`, `rpt_`, `core_`, `rt_` — list in `backend/src/b2b/core/db/prefixes.js`) | Start-up guard: every registered model's collection name must carry an allowed prefix, or the process refuses to start. A test confirms that no existing collection name starts with these prefixes |
| D2 | **Existing collections are read-only** for the new system: only `users` (website customers), `staffs` (admins) and `sessions` (to respect logout/revoke) are read, and only through `src/legacy-read/` | That adapter has its own minimal schemas and exposes `find` methods only. Lint bans write methods in it, and a test proves it cannot write |
| D3 | **Own Mongoose instance, no automatic index or collection creation**: the new code's separate Mongoose instance runs with `autoIndex: false` and `autoCreate: false`; the existing global plugins are not registered on it | Indexes and validators are created only by the migration runner, which refuses any collection without a new prefix. This stops an accidental index build on an existing collection |
| D4 | **No server changes until after launch**: no restart, no config change, no replica set, no new database users, no server-wide settings. The new code works on the standalone server (no multi-document transactions, no change streams — `01-…` §8) | Lint bans `startSession`, `withTransaction` and `.watch(`. Integration tests run on a **standalone** in-memory MongoDB, the same mode as production |
| D5 | **Load stays small and can be removed instantly** | New code's pool capped (`maxPoolSize: 10` in the backend process, 5 for worker, 3 for realtime); `maxTimeMS` on every query (2 s for API reads, 30 s for reports); request timeouts and rate limits on `/api/v1`; nothing CPU-heavy (PDFs, reports, imports) runs in the backend process — it goes to the worker; MongoDB CPU and latency and the existing site's response times watched. **`B2B_ENABLED=false` + stopping the two new containers removes all new load at once** |
| D6 | **Backups**: the existing daily backup is not changed | A **separate**, read-only hourly dump of the new collections only (`--nsInclude` the new prefixes) is added once real money flows (Stage 09), stored off the server |

The replica-set switch, which would allow multi-document transactions, change streams and better backups, is **optional and after launch** (DEF-021). The new code does not need it and does not change when it happens.

## 4. Existing backend features the new system relies on — used without modifying them

| Need | How, without touching existing code | Checked in |
| --- | --- | --- |
| Website customers sign in to book hotels | The browser already sends the existing access token as `Authorization: Bearer` (kept in memory, refreshed by the existing backend) — the new routes are on the same backend host, so nothing changes in the browser. The new API **verifies** it with a copy of `JWT_ACCESS_SECRET`, checks the `role` claim and that the user exists, and checks the `sessions` entry (refuses logged-out/revoked sessions) — all read-only (`docs/existing-system-map.md` §3). **Existing auth code is never edited** | Stage 00 §3.1, Stage 01 |
| Admin staff use the new admin sections | Same approach: the existing `Staff` login token is verified, read-only | Stage 01 |
| PayU | Same merchant account, but the new system has **its own** callback URLs (surl/furl under `/api/v1/payments/payu/…`) and **its own transaction-ID prefixes** (`B2BH` hotel orders, `B2BW` wallet top-ups, `B2BS` subscriptions); existing IDs all start with `txn`, `MB…` or `MB-` (`docs/existing-system-map.md` §4), so they can never collide. **PayU dashboard settings (merchant-level webhook URL etc.) are never changed**: the new system confirms payments with the callback hash plus PayU's verify API, and runs its own status poller | Stage 07 |
| Email | Same Resend account through a new adapter (D25), with a separate sender on a new subdomain (DNS records are only added) | Stage 02 |
| File storage | Same provider, separate bucket or `b2b/` prefix | Stage 02 |
| Existing notifications (Ably, Expo, `services/notification/*`), cron jobs, partner module | Not used, not imported, not changed | Lint (`10-…` §9) |

## 5. The existing Next.js app — the only shared code base

New UI is added **as new files**. Edits to existing files are limited to the short, flagged list below.

| Rule | Detail |
| --- | --- |
| New pages are new folders | Website hotels: `src/app/(user)/hotels/…`. Business area: **`/business/…` as a path** (`src/app/(business)/business/…`) — **no subdomain**, so `proxy.ts` (today fully commented out) stays untouched (D14 updated). New admin pages: `src/app/admin/b2b/…`. Feature code: `src/features/b2b-*/` |
| URL clash check | The site has a catch-all route `(user)/[...slug]`. Before adding `/hotels` and `/business`, Stage 00 checks (read-only) that no existing CMS page, slug or sitemap URL starts with those paths, so no existing page gets hidden |
| Existing components | May be **imported and reused** (e.g. shadcn UI) but are **not edited**. If one needs a change, copy it into `src/features/b2b-*/` |
| New dependency | One: `socket.io-client`, pinned to an exact version, in its own PR with the lockfile diff reviewed |
| Feature flag | `NEXT_PUBLIC_FEATURE_HOTELS` and `NEXT_PUBLIC_FEATURE_B2B` default **off**. When off, the new UI is invisible and the flagged edits below render nothing |

**The complete list of edits to existing frontend files.** Each is a few lines and behind a flag:

| # | Existing file (exact path confirmed in Stage 00) | Edit | When off |
| --- | --- | --- | --- |
| E1 | `components/custom/HeroSearchWidget.tsx` — the **existing, disabled** Hotels tab | Enable it when the flag is on, `href: '/hotels'` (the existing Hotels tile in `QuickServiceTiles.tsx` already links to `/hotels` and needs no edit) | Tab stays disabled as today |
| E2 | Customer bookings page `app/(user)/bookings/page.tsx` (confirm live page — map O5) | Add a "Hotels" tab that renders a **new** component (`features/b2b-hotel-bookings`) | Tab not rendered; page identical to today |
| E3 | Admin sidebar `components/admin/app-sidebar.tsx` | Add links to the new `/admin/b2b/*` pages | Links not rendered |
| E4 | `.env` example / Vercel env | Add the new public variables (API URL, flags) | — |

Anything not on this list needs a new row here, approved by the owner, before code is written.

## 6. Guardrails that make this enforceable (Stage 00)

**Implemented (S00-T05):** `npm run b2b:guards` in `backend/` (scripts in `backend/scripts/b2b/`, no extra packages) checks items 1–4 below against `origin/main`; `.github/workflows/b2b-guards.yml` runs it plus type check and tests on every `b2b/*` branch and PR — on GitHub-hosted machines only, never the production runner, with read-only permissions. Run it locally before every commit.

1. **Lockfile guard in CI**: fails if any package already in `backend/package-lock.json` changes version or disappears; only additions are allowed.
2. **Protected-paths check in CI.** A PR fails if it changes anything in `backend/` outside `backend/src/b2b/**` and `backend/tests/b2b/**`, or anything in `mobile/`, `mobile_user/` or existing frontend files, **except** the approved edits B1–B5 and E1–E4 — and those need the label `touches-existing` plus owner approval.
3. **Start-up and migration guards**: D1–D3 above (prefix guard, read-only legacy access, own Mongoose instance with `autoIndex`/`autoCreate` off).
4. **Lint (new folders only)**: code in `backend/src/b2b/` cannot import anything from the rest of `backend/src/` (except nothing — it reads existing data only through `legacy-read`), nor existing notification or partner code, nor any transaction or change-stream API. Code outside `src/b2b/` (other than `app.js` → `b2b/mount.js`) never imports from `src/b2b/`.
5. **Crash isolation test**: CI starts the existing app with a deliberately broken `src/b2b` module and checks that existing routes still answer and `/api/v1` returns `503`.
6. **Kill switches**: `B2B_ENABLED=false` (API), stopping the worker/realtime containers, and the frontend flags. Nothing existing depends on the new code, so switching it off is always safe.
7. **Rehearsal before every pilot and the launch**: restore the latest production backup into a **throwaway** container, run the backend with `B2B_ENABLED=true` against it, run the existing smoke checks (`/api/app-home` 200, website pages, admin login, MBGO/MBConnect API calls) and compare the existing collections before and after: **document counts and checksums must be unchanged**.
8. **Monitoring from day one**: existing site latency and error rate, plus MongoDB CPU, connections and slow queries. An alert on any rise after a deploy → set `B2B_ENABLED=false` and roll back.

## 7. Touch-point register (keep this table current)

| # | Touch point | Existing thing | Type | How it's kept safe | Switch off |
| --- | --- | --- | --- | --- | --- |
| T1 | Same database server | `musafirbaba-mongo` | Shared resource | D1–D6: own collections, read-only legacy access, own Mongoose instance, pool caps, timeouts, monitoring | Flag off + stop new containers |
| T2 | Read customers/staff/sessions | `users`, `staffs`, `sessions` collections | Read-only | `legacy-read` adapter, no writes possible | Flag off |
| T3 | Verify existing login tokens | `JWT_ACCESS_SECRET` | Read-only | Secret read from the existing env, auth code not edited | — |
| T4 | Same backend process | `app.js`, Express app, event loop | Two-line mount (B1) | Mounted before existing middleware, only when the flag is on; guarded dynamic import; timeouts and rate limits; heavy work in the worker | `B2B_ENABLED=false` |
| T5 | `package.json` / lockfile | Dependencies | Additions only (B2, B3) | Exact pins, reviewed lockfile diff; dev tools not installed in production | — |
| T6 | Same backend image | Dockerfile (unchanged) | Two new containers (B4) | Existing container's command unchanged | Stop them |
| T7 | PayU merchant account | Existing PayU setup | Shared account | Own callback URLs and `B2B*` txn prefixes; dashboard settings unchanged | Flag off |
| T8 | Resend account | Existing key | Shared account | New adapter, separate sender subdomain | Disable adapter |
| T9 | Frontend E1–E4 | Hotels tab, bookings page, admin sidebar, env | Flagged additive edits | Flags default off; owner review | Flags off |
| T10 | Frontend dependency | `package.json` | One added package | Exact version pin, lockfile reviewed | — |
| T11 | Frontend URLs `/hotels`, `/business`, `/admin/b2b` | Catch-all `[...slug]` | New routes | Clash check (map O1) | Flags off |

## 8. Honest limits

No change at all is impossible while the website must show the new hotels. What remains is small and controlled:
- **Shared server capacity and process.** The new code uses the same MongoDB server and, for its API, the same Node.js process. Mitigation: D5 (caps, timeouts, rate limits, heavy work in the worker, monitoring, instant switch-off), plus load tests against a restored copy (Stage 16).
- **Five small backend touch points (B1–B5).** A two-line mount behind a flag, dependency additions, two extra containers and new env variables — all reviewed by the owner.
- **The four flagged frontend edits (E1–E4).** They are tiny, reviewed by the owner, and invisible when switched off.
- **A shared PayU account.** Separate prefixes and callback URLs mean the two integrations never read each other's payments.

No existing backend logic, route, model, middleware or database setting is modified.
