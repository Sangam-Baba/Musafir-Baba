# 12 — Protecting the Existing System (zero-impact rules)

> **Decided 12 Nov 2026 (D28):** the new B2B + hotel system shares the **one existing database**, but it must not change, slow down or break anything that works today — website, admin, MBGO, MBConnect, the existing backend, or the database server itself. The database server is **not restarted or reconfigured** until after launch.
> This file lists every place the new system meets the existing one, how each is kept safe, and how to switch it off. It is mandatory for every stage, every PR and every AI session.

---

## 1. The promise in plain words

- The new system **adds**. It never edits existing logic.
- If the new system has a bug, crashes or is switched off, **today's website, admin and apps keep working exactly as they do now**.
- The existing database keeps its current setup (standalone, no replica set) until after launch. The new code is written to be correct on it as it is (`01-architecture.md` §8).

## 2. Where the new code lives — its own folder, its own containers

| Item | Decision |
| --- | --- |
| Backend code | New folder **`b2b-backend/`** at the repo root, next to `backend/`. Own `package.json`, lockfile, `tsconfig.json`, ESLint config and **own Dockerfile** |
| Processes | Three new containers from one image: **`b2b-api`** (the `/api/v1` HTTP API), **`b2b-worker`** (jobs, sweepers, reconciler, relay), **`b2b-realtime`** (Socket.IO) |
| Existing `backend/` | **Zero changes**: no new routes mounted, no new dependencies, no Dockerfile or start-command change, no new environment variables |
| Address | The new API gets its **own hostname** (e.g. `b2b-api.<domain>`) through a **new** Cloudflare tunnel route. Existing hostnames and routes are not edited |
| Config | Own env file. Values the new system needs from today's system (database URI, the JWT secrets used to *verify* existing logins, PayU merchant key/salt, Resend key) are **copied**, never changed |

## 3. The shared database — rules

| # | Rule | Enforced by |
| --- | --- | --- |
| D1 | The new system **creates and writes only its own collections**, all with the new prefixes (`org_`, `kyc_`, `htl_`, `inv_`, `prc_`, `ord_`, `hbk_`, `wal_`, `pay_`, `ntf_`, `mtr_`, `sub_`, `bil_`, `api_`, `whk_`, `doc_`, `rpt_`, `core_`, `rt_`) | Start-up guard: every registered model's collection name must carry an allowed prefix, or the process refuses to start. A test confirms that no existing collection name starts with these prefixes |
| D2 | **Existing collections are read-only** for the new system: only `users` (website customers), `staffs` (admins) and `sessions` (to respect logout/revoke) are read, and only through `src/legacy-read/` | That adapter has its own minimal schemas and exposes `find` methods only. Lint bans write methods in it, and a test proves it cannot write |
| D3 | **No automatic index or collection creation**: the new Mongoose connection runs with `autoIndex: false` and `autoCreate: false` | Indexes and validators are created only by the migration runner, which refuses any collection without a new prefix. This stops an accidental index build on an existing collection |
| D4 | **No server changes until after launch**: no restart, no config change, no replica set, no new database users, no server-wide settings. The new code works on the standalone server (no multi-document transactions, no change streams — `01-…` §8) | Lint bans `startSession`, `withTransaction` and `.watch(`. Integration tests run on a **standalone** in-memory MongoDB, the same mode as production |
| D5 | **Load stays small and can be removed instantly** | Connection pool capped (`maxPoolSize: 10` for API, 5 for worker, 3 for realtime); `maxTimeMS` on every query (2 s for API reads, 30 s for reports); pollers back off when idle; heavy reports and archiving run at night; MongoDB CPU and latency watched (`serverStatus`, existing uptime monitor). **Stopping the three new containers removes all new load at once** |
| D6 | **Backups**: the existing daily backup is not changed | A **separate**, read-only hourly dump of the new collections only (`--nsInclude` the new prefixes) is added once real money flows (Stage 09), stored off the server |

The replica-set switch, which would allow multi-document transactions, change streams and better backups, is **optional and after launch** (DEF-021). The new code does not need it and does not change when it happens.

## 4. Existing backend features the new system relies on — used without modifying them

| Need | How, without touching existing code | Checked in |
| --- | --- | --- |
| Website customers sign in to book hotels | The browser already sends the existing access token as `Authorization: Bearer` (kept in memory, refreshed by the existing backend) — this works for the new hostname too. The new API **verifies** it with a copy of `JWT_ACCESS_SECRET`, checks the `role` claim and that the user exists, and checks the `sessions` entry (refuses logged-out/revoked sessions) — all read-only (`docs/existing-system-map.md` §3). **Existing auth code is never edited** | Stage 00 §3.1, Stage 01 |
| Admin staff use the new admin sections | Same approach: the existing `Staff` login token is verified, read-only | Stage 01 |
| PayU | Same merchant account, but the new system has **its own** callback URLs (surl/furl on the new API) and **its own transaction-ID prefixes** (`B2BH` hotel orders, `B2BW` wallet top-ups, `B2BS` subscriptions); existing IDs all start with `txn`, `MB…` or `MB-` (`docs/existing-system-map.md` §4), so they can never collide. **PayU dashboard settings (merchant-level webhook URL etc.) are never changed**: the new system confirms payments with the callback hash plus PayU's verify API, and runs its own status poller | Stage 07 |
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

1. **Protected-paths check in CI.** A PR fails if it changes anything under `backend/`, `mobile/`, `mobile_user/`, or any existing frontend file other than E1–E4, unless it carries the label `touches-existing` and the owner approves. New folders (`b2b-backend/`, new frontend folders) pass freely.
2. **Start-up and migration guards**: D1–D3 above.
3. **Lint**: new code cannot import from `backend/`, nor from existing notification or partner code, nor any transaction or change-stream API.
4. **Kill switches**: the feature flags (UI) and stopping the three containers (backend). Nothing existing depends on the new system, so switching it off is always safe.
5. **Rehearsal before every pilot and the launch**: restore the latest production backup into a **throwaway** container. Run the new system against it, then run the existing smoke checks (`/api/app-home` returns 200, website pages, admin login, MBGO/MBConnect API calls). Compare the existing collections before and after: their **document counts and checksums must be unchanged**.
6. **Monitoring from day one**: existing site latency and error rate, plus MongoDB CPU, connections and slow queries. An alert on any rise after a new-system deploy → roll back that deploy.

## 7. Touch-point register (keep this table current)

| # | Touch point | Existing thing | Type | How it's kept safe | Switch off |
| --- | --- | --- | --- | --- | --- |
| T1 | Same database server | `musafirbaba-mongo` | Shared resource | D1–D6: own collections, read-only legacy access, pool caps, timeouts, monitoring | Stop new containers |
| T2 | Read customers/staff/sessions | `users`, `staffs`, `sessions` collections | Read-only | `legacy-read` adapter, no writes possible | Stop new containers |
| T3 | Verify existing login tokens | JWT secrets | Read-only copy | Secrets copied, auth code not edited | — |
| T4 | PayU merchant account | Existing PayU setup | Shared account | Own callback URLs and txn prefixes; dashboard settings unchanged | Stop new containers |
| T5 | Resend account | Existing key | Shared account | New adapter, separate sender subdomain | Disable adapter |
| T6 | Cloudflare | Tunnel | New routes only | New hostnames; existing routes unchanged | Remove new routes |
| T7 | Frontend E1–E4 | Header, bookings page, admin nav, env | Flagged additive edits | Flags default off; owner review | Flags off |
| T8 | Frontend dependency | `package.json` | One added package | Exact version pin, lockfile reviewed | — |
| T9 | Frontend URLs `/hotels`, `/business`, `/admin/b2b` | Catch-all `[...slug]` | New routes | Clash check in Stage 00 | Flags off |

## 8. Honest limits

No change at all is impossible while the website must show the new hotels. What remains is small and controlled:
- **Shared server capacity.** The new system uses the same MongoDB server. Mitigation: D5 (caps, timeouts, monitoring, instant switch-off), plus load tests against a restored copy (Stage 16).
- **The four flagged frontend edits (E1–E4).** They are tiny, reviewed by the owner, and invisible when switched off.
- **A shared PayU account.** Separate prefixes and callback URLs mean the two integrations never read each other's payments.

Nothing in today's backend code, database settings or app logic is modified.
