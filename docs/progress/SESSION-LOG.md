# Session Log

> Append-only. One entry per working session (human or AI), **newest at the top**. The next session reads the last 3 entries before starting, so nobody starts cold.

<!-- Copy this block for each session -->

## 2026-11-19 — AI (Claude) — Build order D36; Stage 06 closed; Stage 10 B2B client onboarding (S10-T01 to T08)

- **Goal:** owner asked to bring the B2B dashboard forward (D36) and start the B2B client flow without touching working logic.
- **Done:** D36 recorded (06 → 10 → 12 part A → 07 → 08 → 09 → Pilot 1 → 11 → 12 part B → 13 …). Stage 06 → AWAITING_SIGN_OFF (S06-T10 home-page tab deferred, DEF-032 — owner didn't say yes). Stage 10, all 8 tasks: client details + `CLIENT` document set (configuration only); `POST /registrations/client`, org-type-aware `PUT /kyc`; client categories (`org_client_categories`, migration 0041, Standard / Silver / Gold, admin list, a client's category with event; search passes the category → category margin rules and category-limited hotels work); on approval Standard (repeat-safe) and a client-worded welcome (hotels' message unchanged); admin category panels; business wizard "Travel agent / B2B client" option and client-aware verification / home; mandatory suite. Local fix earlier today: local admins had no B2B roles because the nightly production copy overwrote the dev Atlas DB before production roles existed — same roles granted on the dev DB only.
- **Not done / why:** default plan record for clients (DEF-033, Stage 13); screens type-checked, not clicked through in a browser.
- **Files / PR:** commits 4a4b942 … on `b2b/stage-00` (not pushed). Migration 0041 new (with 0035–0040 from Stage 05) — not applied to production.
- **Tests run:** each task: lint, typecheck, full `test:b2b` (last 95 files, all green), progress check, guards (only the untracked design screenshots / .DS_Store).
- **Decisions / deferrals:** clients work in the shared `/business` area (no `/client` path); clients without GST allowed like hotels (declaration + high-risk flag); client categories managed with the existing `platform.org.manage`; notification variant per org type (bell shows it, settings list shows it once); DEF-032, DEF-033.
- **Next step:** Stage 12 part A — B2B dashboard without booking (search with B2B prices, offers with GST breakdown, markup / my selling price, team) — when the owner says go.

## 2026-11-19 — AI (Claude) — Stage 06 Search & availability: S06-T01 to T09, T11, T12

- **Goal:** website hotel search (live availability, website prices incl. GST), channel-aware so B2B gets B2B prices, without touching existing code.
- **Done:** 11 of 12 tasks → DONE. Module `hotel-search`; catalogue search read model (LIVE + channel-visible, by city / area / distance / reference; status lookup); destination autocomplete (in-memory, no new collection; dropped on listing events); search gateway (anonymous → website prices + per-IP limits; active client org with permission → B2B prices + per-user / per-org limits; hooks for Stages 12 / 13); `POST /hotels/search` (one availability call, every option priced per channel, filters / sort / cursor; from-prices only, no tokens); `POST /hotels/:ref/offers` (caller's price view + price token per option, cancellation terms); `POST /hotels/offers/price-check` (OK / PRICE_CHANGED / SOLD_OUT, fresh token); live availability rooms only for LIVE properties (owners / staff for unpublished); website pages `/hotels` and `/hotels/[slug]` (server-rendered hotel content, live rooms, price check) behind `NEXT_PUBLIC_FEATURE_HOTELS` (off); load-test script; mandatory suite.
- **Not done / why:** S06-T10 (home-page Hotels tab = approved edit E1 on the existing `HeroSearchWidget.tsx`) — waits for the owner's OK; staging load run (DEF-031 — no staging data); pages type-checked but not clicked through in a browser; booking itself is Stage 08 (Reserve = price check + "call us").
- **Files / PR:** commits 93b6bbf … on `b2b/stage-00` (not pushed). No new migrations in Stage 06.
- **Tests run:** each task: `lint:b2b`, `typecheck:b2b`, full `test:b2b` (last: 90 files, all green), progress check, guards (only the untracked design screenshots / .DS_Store); frontend `tsc` — no errors in B2B files.
- **Decisions / deferrals:** search routes mounted before Stage 03's `/hotels/:ref`; destinations held in memory instead of `htl_destinations`; child ages accepted but priced by count; price range on price per night incl. GST; price check returns OK when only the breakdown (not the total) changed; realtime hook accepts "no token" for public rooms; guards allow the new `(user)/hotels` folder; DEF-031.
- **Next step:** owner OK for E1 (or skip it — `/hotels` works by link and the existing Hotels tile already points there); then Stage 07 — Payments (PayU) & ledger core.

## 2026-11-18 — AI (Claude) — Stage 05 Pricing & GST: S05-T01 to S05-T11

- **Goal:** build Stage 05 (margins by channel, GST as data, quote, price token, admin screens) without touching anything outside the B2B folders.
- **Done:** all 11 tasks → DONE; stage AWAITING_SIGN_OFF. Owner decisions (CA to review at the demo): principal / resell model (GST on our sell price), one Delhi issuer (`07`; Delhi hotels CGST + SGST, others IGST), **hotels without GST sellable for now** (nothing in Stages 00–04 blocked them, so no existing code changed). New module `pricing`: GST rates as dated data (seeded 5 % ≤ ₹7,500 no ITC / 18 % above from 22 Sep 2025, history rates, SaaS 18 % pending Q6); margin rules (per-night winner, fixed / % with min-max / per-booking fee, no rule = not sellable; Website +₹250 / B2B +₹150 seeded); approvals by a second person with history inside each rule and gap-free replacement; quote (breakdown per room-night, hotel GST recorded, who-sees-what views, 1-minute cache dropped by pricing events); price tokens (HMAC, keys derived from `B2B_AUTH_SECRET`, rotation, bound to buyer / channel / stay, keyed breakdown hash, SAME / CHANGED re-price); GST-rate admin + pricing settings (GSTINs, hotels without GST); client display markups (`/markups`); simulator (typed rate or a property's real calendar, draft rules) + rule reach; admin **Pricing** tab (rules, simulator, GST & settings).
- **Not done / why:** agent-model calculation (DEF-030 — only if the CA says agent); CA review of the tax data (DoD item open); MusafirBaba's Delhi GSTIN number to be filled in by an admin; screens type-checked but not clicked through in a browser.
- **Files / PR:** commits e488c8e … on `b2b/stage-00` (not pushed). Migrations 0035–0040 (new `prc_` collections only) — not run on dev Atlas or production yet.
- **Tests run:** every task: `lint:b2b`, `typecheck:b2b`, full `test:b2b` green (last: 84 files / 803 tests), `b2b:progress -- --check`, guards (only the untracked design screenshots / .DS_Store flagged); frontend `tsc` — no errors in B2B files.
- **Decisions / deferrals:** history embedded in each rule instead of `prc_rule_history` (a change can never exist without its line); retiring a rule needs the approve permission; per-booking fee is a separate layer taxed at the first night's rate; tokens re-price to CHANGED rather than honouring an old price (a stateless token can't carry the breakdown without exposing the hotel rate); settings change without a second approver (plan asks maker–checker for rules and rates only). DEF-030 added.
- **Next step:** owner sign-off of Stages 00–05 and a human review of pricing / GST code; deploying Stage 05 = merge + migrations 0035–0040 (B2B already on). Then Stage 06 — search & availability (website first).

## 2026-11-13 — AI (Claude) — Stage 01 started: task list, S01-T01 setup

- **Goal:** start Stage 01 (organisations, users, roles & permissions).
- **Done:** `stages/stage-01.md` with 20 tasks and the stage's choices (existing `bcrypt`/`jsonwebtoken` packages, new `B2B_AUTH_SECRET`, rotating refresh tokens, existing customer/staff tokens verified read-only with preview tokens refused, TOTP on node:crypto, Resend through an `EmailPort` job, admin MFA/roles in new collections, `aud_events`). S01-T01 → DONE: modules `identity`, `organizations`, `access`, `audit` (README, permissions, events, index), `core/permissions.js`, `permission-catalogue.js`, generator template updated, sample `example` module deleted.
- **Not done / why:** S01-T20 CAPTCHA waits for an owner decision (it needs an outside service).
- **Files / PR:** `backend/src/b2b/{core/permissions.js,permission-catalogue.js,modules/{identity,organizations,access,audit}/*}`, `backend/scripts/b2b/gen-module*.js`, `tests/b2b/permissions-catalogue.test.js`, `docs/progress/*`.
- **Tests run:** `test:b2b` ✅ 23 files / 217 tests; `typecheck:b2b` ✅; `lint:b2b` ✅; `b2b:guards` ✅; `b2b:progress -- --check` ✅.
- **Decisions / deferrals:** migrations are added per task together with each collection's indexes.
- **Later in the session:** S01-T02 → DONE (system roles as patterns; wildcards never grant sensitive permissions — found by the matrix test: Hotel Manager would otherwise get payout bank details; `acl_permissions` synced at background start). Tests ✅ 24 files / 257.
- **Later:** S01-T03 → DONE (`id_users`, password policy, lockout; dev deps `@types/bcrypt`, `@types/jsonwebtoken`). Tests ✅ 25 files / 267.
- **Later:** S01-T04 → DONE (sessions, rotating refresh tokens with reuse detection, refresh/logout/logout-all endpoints). Tests ✅ 26 files / 279.
- **Later:** S01-T05 → DONE (`POST /auth/login`, limits per IP/account, growing delay, lock event). Tests ✅ 27 files / 290.
- **Later:** S01-T06 → DONE (email codes, forgot/reset, sealed email jobs, Resend/log senders). Tests ✅ 28 files / 304.

## 2026-11-14 — AI (Claude) — S01-T07 two-step login

- **Goal:** authenticator-app two-step login, recovery codes, step-up — without affecting anything existing (owner's instruction).
- **Done:** S01-T07 → DONE (see stage file). Business-token authenticator brought forward from T12. Two fixes found on the way: the test GET helper silently dropped headers (one check had passed vacuously); SSE reconnect could deliver a replayed signal twice when the live feed lagged (now skipped per stream, with a test).
- **Not done / why:** —
- **Files / PR:** `backend/src/b2b/modules/identity/{domain/totp.js,models/mfa.model.js,mfa.service.js,mfa-challenge.js,mfa-routes.js,sign-in.js,business-auth.js}`, `routes/identity.js` (identity wiring moved out of `v1.js`), `core/{context,http/permissions,realtime/rooms,realtime/stream,db/idempotency}.js`, tests.
- **Tests run:** `test:b2b` ✅ 29 files / 318 (full suite twice); `typecheck:b2b` ✅; `lint:b2b` ✅; `b2b:guards` ✅ (existing backend diff vs `origin/main` still only `app.js` +5).
- **Decisions / deferrals:** event-free (two-step changes will be audited in T13 from session methods).
- **Later:** S01-T08 → DONE (organisations, members, branches, `/me`, org switcher, member permissions from system roles). Test helper gained `patch`. Tests ✅ 30 files / 325.
- **Later:** urgent live-site change on its own branch from `main` (rentals admin: vehicle page preview + author dropdown, frontend only, 4 files) → owner merged it as PR #219; merged `main` back into `b2b/stage-00` so the guards compare like with like.
- **Later:** S01-T09 → DONE (invitations, accept as new/existing user, remove member, Owner-only rule, last-Owner rule). Test helper gained `del`. Tests ✅ 31 files / 331.
- **Later:** S01-T10 → DONE (custom roles, role assignment with limits). Tests ✅ 32 files / 337.
- **Later:** S01-T11 → DONE (authorizer, list scoping, 60 s member-permission cache cleared on changes). Tests ✅ 33 files / 360.
- **Later:** S01-T12 → DONE (existing logins read-only, blocked orgs on /me, every route guarded — checked by a test). Tests ✅ 35 files / 383.
- **Fix:** live-updates catch-up could still repeat a signal when the live feed delivered it *during* the catch-up read (seen once in a full run: 3, 2, 3). Live signals are now held while a stream catches up and released in order without repeats (deterministic test added). The S01-T12 commit had been made while that flaky test failed — my command chain didn't stop on it; fixed in the next commit and the suite was then run 4× green.
- **Later:** S01-T13 → DONE (activity log from events, sign-in event, org and admin reads). Tests ✅ 36 files / 388.
- **Open:** one full-suite run (of ~12 today) had 1 failing test that could not be captured (no repeat in the next 7 runs). Every suite run now saves its full output so the next occurrence is identified and fixed at the cause.
- **Later:** S01-T14 → DONE (B2B admin pass with two-step login and a 7-day setup window, platform roles, admin orgs/users/staff API, suspend ends org sessions, grant-admin command). Tests ✅ 37 files / 397 (3× green).
- **Order changed (owner):** nothing was visible yet (server only), so the screens come first: T16 → T17 → T18, then T15.
- **Later:** S01-T16 → DONE (business sign-in pages, home, security; refresh cookie policy matched to the existing logins for production). Backend tests ✅ 398 (2× green); 6 new pages load on the dev server.
- **Later:** S01-T17 → DONE (Team page with four tabs, Activity page; member names and current permissions from the API). Note: the long-running local dev server once missed a new folder (404) — re-saving the file fixed it.
- **Later:** S01-T18 → DONE (admin gate, organisations, users, activity, organisation page with suspend/reactivate). Backend ✅ 398 (2× green); admin pages load on the dev server.
- **Later (owner):** couldn't open /admin/b2b — B2B roles are separate from the existing admin role by design; ran `b2b:migrate` + `b2b:grant-admin` for admin1@musafirbaba.com on **dev Atlas only**; added the Staff access tab; restyled the B2B admin pages with the existing admin UI kit (owner: "ui is not aligned"); local `.env` files given the B2B settings at the owner's request.

## 2026-11-15 — AI (Claude) — S01-T15 view-as, S01-T19 test suite, S01-T20 deferred

- **Goal:** finish Stage 01.
- **Done:** S01-T15 → DONE (view as client/hotel, read-only by default, 30 min, reason, owners emailed, banner + End view). S01-T19 → DONE (tenant isolation sweep over every Stage 01 collection; the other mandatory tests already existed). S01-T20 → DEFERRED (DEF-023, CAPTCHA needs an outside service — owner decision).
- **Not done / why:** Stage 01 sign-off is the owner's (fill in Finished).
- **Files / PR:** `backend/src/b2b/modules/identity/{view-as.service.js,models/view-as.model.js}`, `routes/{view-as,account,v1}.js`, migration `0017` (also applied on dev Atlas), `tests/b2b/{view-as,stage-01-tenant-isolation}.test.js`, frontend admin org page + business shell.
- **Tests run:** backend ✅ 39 files / 423 (2× green); typecheck ✅; lint ✅; guards ✅; pages load on the dev server.
- **Decisions / deferrals:** DEF-023.
- **Next step:** owner signs off Stages 00 and 01; Stage 02 after 3 decisions (KYC document storage, upload scanning without an extra container, unregistered hotels).
- **Later:** owner decided D29 (existing R2 bucket, private folder — so every file is encrypted before upload), D30 (strict checks, no scanner), D31 (unregistered hotels allowed with PAN + declaration). Stage 02 task list written. S02-T01 → DONE, S02-T02 → DONE. Tests ✅ 447 (2× green).
- **Later:** S02-T03 → DONE (signed 60-second links, downloads, access log).
- **Later:** S02-T04 → DONE (KYC rules, document sets as configuration, risk flags). Tests ✅ 2× green.
- **Later:** S02-T05 → DONE (hotel self-registration: owner + hotel org ONBOARDING + draft KYC application with risk flags + 48h email verification link + signed in; migration 0020). Tests ✅ 43 files / 469, 2× green.
- **Later:** S02-T06 → DONE (KYC application: edit details, attach/remove documents, submit/resubmit — repeat-safe, revision-checked; state machine table; resend verification link). Tests ✅ 44 files / 477, 2× green.
- **Later:** S02-T07 → DONE (PAN and bank account number sealed per field, bound to the org; last 4 shown; reviewer reveal recorded as an event; bank details required to submit). Tests ✅ 45 files / 480, 2× green.
- **Later:** S02-T08 → DONE (admin KYC review: queue, 30-minute lock, verdicts per document file, approve/reject, second approver for high risk, never your own org, full PAN/bank view recorded). Tests ✅ 46 files / 487, 2× green.
- **Later:** S02-T09 → DONE (approval activates the hotel in the background with the verified legal name; the hotel sees rejection reasons per document, marked resolved when replaced; owner emails/bell move to S02-T10). Tests ✅ 46 files / 490, 2× green.
- **Later:** S02-T10 → DONE (notifications: bell inbox from events — once per event and recipient, live push with ids/titles only, emails from versioned templates, catch-up, permission filter, preferences with critical lock, admin queue pushes; migration 0021). Escalations → DEF-024, delivery log + template editor → DEF-025. Tests ✅ 47 files / 497, 2× green.
- **Later:** S02-T11 → DONE (unfinished registrations: one reminder after 30 days, removal after 90 — org closed, memberships/sessions ended, documents and draft deleted; repeat-safe; days configurable). Tests ✅ 48 files / 501, 2× green.
- **Later:** S02-T12 → DONE (business area: `/business/register`, `/business/verify-email`, `/business/verification` with status, rejection notes, timeline, details, bank, documents, submit; Verification tab, home card, register link). Frontend typecheck ✅; pages load (200) on the dev server; live API check of the registration error path ✅. Dev Atlas: migrations 0018–0021 applied (target verified: cluster0.laeqxcp). Frontend `eslint` crashes on the repository's own config (existing problem, not B2B).
- **Later:** S02-T13 → DONE (admin: Verification tab with queue + "waiting for review" count; review screen with lock bar, details and cross-checks, full PAN/account on request, documents with open + verdicts, decision with first/final approval, timeline; backend adds `you {staffId, canReview, canSecondApprove}` to review responses). Frontend tsc ✅; pages load; backend tests ✅ 48 files / 501, 2× green.
- **Later:** S02-T14 → DONE (`useRealtime` hook — fetch-based SSE with Authorization header, Last-Event-ID, resync, backoff, status; business bell with unread badge, list, mark read / all, live pop-up, connection dot, 60 s polling when not live; B2B admin bell with the waiting-for-review count, live on `queue:changed`). Frontend tsc ✅; SSE parser checked with a script against a backend-shaped stream (split chunks too); CORS preflight allows the stream headers; pages load. No backend change.
- **Later:** S02-T15 → DONE (Stage 02 mandatory tests: isolation for every Stage 02 collection, registration crash injection; gap fixed — empty draft for an onboarding hotel without an application). Tests ✅ 49 files / 515, 2× green. **Stage 02 → AWAITING_SIGN_OFF** (owner to try the flow in the browser and sign off; listing is Stage 03).
- **Later:** Stage 03 started — `stages/stage-03.md` (13 tasks); owner decision D32 (photos: "use the existing setup" → existing R2 bucket served at cdn.musafirbaba.com, browser makes the WebP sizes, backend checks them, no new package). S03-T01 → DONE (`hotel-catalog` module, permissions, events). Tests ✅ 49 files / 526, 2× green.
- **Later:** S03-T02 → DONE (master lists + starter data + admin API; migration 0022 applied on dev Atlas — target verified cluster0.laeqxcp). Tests ✅ 50 files / 531, 2× green.

## 2026-11-16 — AI (Claude) — S03-T03a several GSTINs per business (D33)

- **Goal:** owner raised: some hotel groups have different GSTINs (and sometimes PANs) per hotel.
- **Done:** D33 decided with the owner — one org = one PAN; same PAN in several states → further GSTINs per state, each verified; different PAN → separate org under the same login. S03-T03a → DONE (backend, screens, migration 0023 on dev Atlas). A test caught that a verified GSTIN could be removed — fixed (condition moved into the filter).
- **Tests run:** `test:b2b` ✅ 51 files / 537, 2× green; `typecheck:b2b` ✅; `lint:b2b` ✅; `b2b:guards` ✅; frontend tsc ✅; pages load.
- **Later:** S03-T03 → DONE (properties: wizard sections, version check 412/428, pin inside city, GSTIN per state, property limits; migration 0024 on dev Atlas). Found while testing: Node's time-zone list names India "Asia/Calcutta", so the check now asks the runtime instead of the list. Tests ✅ 52 files / 542, 2× green.
- **Later:** S03-T04 → DONE (room types; migration 0025 on dev Atlas). Tests: first pair of full runs had **one failure in an unrelated, older test** (`realtime.test.js` — "a live signal arriving DURING the catch-up…": the stream answered with a non-OK status and an empty body, so the real status was not captured). Passed 5× on its own; the SSE test helper now records status and raw body, and the test asserts the stream opened, so a repeat will show the cause. Then ✅ 53 files / 546, 2× green before committing.
- **Later:** S03-T05 → DONE (photos: built-in multipart parsing instead of `multer` — typecheck can't check multer and adding its types would be a new package; header-level WebP / JPEG checks incl. camera / GPS data refusal; public folder on R2 / local disk). Tests ✅ 54 files / 552, 2× green.
- **Later:** S03-T06 → DONE (listing state table, readiness, submit / resubmit / withdraw; property events to the relay and activity log). Caught while wiring: the activity log only attaches events that carry `orgId` — property events now do. Test image helpers moved to `tests/b2b/helpers/images.js`. Tests ✅ 55 files / 557, 2× green.
- **Later:** S03-T07 → DONE (live edits: sensitive → pending revision, rest direct; admin approve / reject with `revisionId`; hotel cancel; room types / photos on live listings; migration 0026 on dev Atlas). Shared test helper `helpers/hotel-listing.js` (complete property). Tests ✅ 56 files / 562, 2× green.
- **Later:** S03-T08 → DONE (admin listing tools: list / queue, detail with checklist and duplicates within 200 m, approve / request changes / suspend / reactivate / archive, direct edits, own-organisation guard).
- **Rare test failures — cause found and fixed (test helpers only):** run 2 had sign-in tests getting 404 / 401 from the *wrong* server. Node's `fetch` keeps connections open; a test file's closed server keeps already-open connections alive, and when the next file's server gets the same port, `fetch` reuses the old connection and talks to the old app. This also explains the earlier `realtime.test.js` flake (S03-T04) and the unidentified one from Stage 01. Fix: test servers (helpers/http.js and realtime.test.js) answer every request with `Connection: close`, listen on 127.0.0.1 only, and end all connections on close. No app code changed. Then ✅ 57 files / 568 — 3 + 2 clean full runs.
- **Later:** S03-T09 → DONE (visibility + public content `GET /hotels/:ref`). Tests ✅ 58 files / 572, 2× green.
- **Later:** S03-T10 → DONE (listing notifications + admin queue pushes; property-limited members only see their properties' notifications). Tests ✅ 59 files / 576, 2× green.
- **Later:** S03-T11 → DONE (business-area listing screens; frontend tsc ✅; pages load; live 401 / 404 checks). Not clicked through in a browser.
- **Later:** S03-T12 → DONE (admin listing screens, masters screens, admin bell counts listings). Frontend tsc ✅; pages load; live 401 check.
- **Later:** S03-T13 → DONE (isolation for htl_ owned collections, master lists classified, XSS payload test, photo-upload crash injection). Tests ✅ 60 files / 583, 2× green. **Stage 03 → AWAITING_SIGN_OFF** (owner to try the listing flow in the browser and sign off).
- **Next step:** Stage 04 — inventory & rates calendar (task list).

## 2026-11-17 — AI (Claude) — Business portal UI refresh (owner's design screens), UI-1 shell

- **Goal:** owner shared 13 design screens (`screenui-desgine/`, not committed) as inspiration for the business portal; show only what works (hotels).
- **Decisions (owner):** hide services that aren't built (only Hotels & Resorts); add the design's extra business fields as optional (trade name, entity type, year, designation, alternate number); build a public landing page at `/business`; reuse the website's own logo and photos.
- **Plan:** UI-1 shell · UI-2 overview · UI-3 five-step sign-up wizard (+ optional fields, backend B2B only) · UI-4 verification · UI-5 team / settings / properties / business profile · UI-6 landing. Bookings, finance, reports, enquiries are not shown until built. Admin panel unchanged.
- **Done:** UI-1 — dark sidebar with the white logo (only working pages, permission-filtered), top bar (business switcher, bell, account menu with name + role, log out), mobile drawer, page banner (breadcrumb, orange highlight word, website photo `Heroimg.jpg`), summary card / panel / tabs / pill pieces, Help & Support page (website care contact in `b2b/support.ts`). All existing shell behaviour kept (session renewal, view-as banner and end, business switch, blocked-business notices). Frontend tsc ✅; all business pages load.
- **Later:** UI-2 → done (Overview: verification progress card with ring + steps from real data — details, email, bank, documents, submitted, verified; after verification the "first live listing" card; real counts — properties, live listings, team, unread; onboarding checklist with action buttons; help card; quick links). Frontend tsc ✅; page loads.
- **Later:** UI-3 → done. Backend (B2B only): optional business details — trade / brand name, entity type, year of establishment, contact designation, alternate mobile — checked in `validateHotelDetails`, kept in the KYC details; new risk flag `PAN_DOES_NOT_MATCH_ENTITY_TYPE` (PAN holder type vs entity type → second approver). Tests ✅ 60 files / 586, 2× green; live check on the running backend. Frontend: `/business/register` is now the five-step wizard (dark top bar + stepper, banner, progress card with edit pencils): 1 partner type (hotel supplier only) · 2 business details grouped like the design (+ your name / password when not signed in) · 3 services (Hotels & Resorts, number of properties) → creates the account + business with the same registration call · 4 documents + bank (existing panels) · 5 review & submit (email banner, confirm, same submit). Server problems with details send you back to step 2 with the message under the field. The same grouped form is used for "Edit details" on Verification; admin review shows the new fields. Old one-page form removed. Frontend tsc ✅; pages load.
- **Later:** UI-4 → done (Verification: status banner per status with submitted date / round, "expected update within 1–2 working days" and contact while waiting, "list your property" when verified; horizontal timeline from the real history — started, details & documents, submitted, under review, verified / changes requested, account activated; "what to fix" card; documents as a table — requirement, file, status (needed / uploaded / under review / verified / not accepted with the reviewer's note), view / upload / replace / remove; right column: submit card, help card, important information). Same actions and API calls as before; old status panel removed. Frontend tsc ✅; pages load.
- **Later:** UI-5 → done. Team & Access: summary cards (members, pending invitations, roles, your role), icon tabs, "Access logs" → Activity. Settings & Security: tabs Account settings (name, role, email verified / send a new link, mobile, change password → email-code reset, your businesses; 2FA) · Security (2FA panel — same setup / enable / recovery codes — and "Sign out everywhere" via the existing `POST /auth/logout-all`, link to sign-in activity) · Notifications (existing preferences API; critical ones locked on). My Properties: cards for total / live / waiting / drafts + needs changes. New read-only Business Profile (`/business/profile`, sidebar after Overview): organisation, business ID, role, verification; registered details, address, GST registrations per state and bank only for roles that may read verification. No backend change; no new endpoints (no session list or change-password endpoint exists, so those link to Activity / password reset). Frontend tsc ✅; pages load (200).
- **Later:** UI-6 → done. `/business` shows a public landing page to visitors who are not signed in (before: straight to sign-in): header with logo, Sign in / Register; hero on the website banner photo; "Who can join" — Hotels & Resorts only; benefits limited to what works today (verification, listing with rooms / photos / policies, where it's shown, team access, two-step login, partner team); how it works (register → verified → list → live); contact with care@ / phone / hours. Signed-in users, renewable sessions and MusafirBaba "view as" links still get the Overview exactly as before; every other business page still sends visitors to sign-in. Frontend tsc ✅; page loads; desktop screenshot checked (phone width still to check in a real browser — headless Chrome would not go below ~500px). UI redesign (UI-1 → UI-6) complete; next: Stage 04 (inventory & rates calendar).
- **Later:** fixes after owner testing. (1) `/business/register` crashed ("useEffect must not return anything besides a function" → "destroy is not a function"): the scroll-to-top effect was an arrow expression and newer Chrome returns a Promise from a smooth `window.scrollTo`; now a block body. (2) Phone / tablet layout: the top bar no longer pushes the account button off screen (business picker shrinks); verification banner text no longer squeezed to one word per line; documents table becomes stacked cards on phones; summary cards two per row on phones; compact timeline on phones; compact step dots in the sign-up wizard on phones (tap a done step to go back); tighter panel / header padding; tabs scroll edge to edge. Class changes only, no logic or API changes. Checked with DevTools-protocol device emulation at 390 px and 820 px with sample API answers (no database use): no page wider than the screen on any business page; wizard step 1 → 2 without console errors. Frontend tsc ✅.
- **Later:** compact enterprise styling for the business portal (owner request: smaller fields and components, premium dashboard feel). Inter font for the business area (already loaded by the site root); one-step-smaller text, padding, gaps, corners and icons across the portal (scripted rewrite of class strings only — checked: no changed line differs outside a class string); fields 32 px with a soft focus ring, labels 12 px; buttons medium weight; panels / cards with a hairline shadow and 48 px headers; stat cards with small uppercase labels; slimmer sidebar (240 px) with a quiet active state (orange bar + icon); 56 px top bar; quieter page header with the photo faded in on the right. Admin pages and the public landing page unchanged. Frontend tsc ✅; desktop (1440), tablet and phone renders checked, no page wider than the screen. Also gave the owner a locally signed email-confirmation link for a test account (read-only script in the session scratchpad; no code change).
- **Later:** D34 (owner, 17 Nov 2026) — an admin approving a non-GST hotel got "two people required" (GST_UNREGISTERED makes it high risk). Now whoever holds `platform.kyc.approve` (e.g. Operations) verifies on their own at any risk; a reviewer with only `platform.kyc.review` still gives only the first approval on high-risk applications, and someone with the approve permission finishes it. An application already waiting after its own first approval is finished by approving again. Rule in `modules/kyc/domain/approval.js` (unit-tested); approval tests moved to `kyc-review-approval.test.js` (file-length limit); admin decision panel wording updated. Plan: D34 in 09-decisions-and-risks, Stage 02 §3.6 text. Tests ✅ 61 files / 590, 2× green; lint, typecheck ✅; guards only flag the untracked screenshots folder / .DS_Store (never committed).

## 2026-11-17 — AI (Claude) — Stage 04 started: S04-T01 to S04-T04

- **Goal:** start Stage 04 (inventory & rates calendar) task by task, nothing outside the B2B folders touched.
- **Done:** S04-T01 setup (module `hotel-inventory`, permissions + role matrix, task list, D12 allotment recorded as plan default) · S04-T02 cancellation policies (per property; rules / no-show / non-refundable; guest summary; version check; archive) · S04-T03 rate plans (room types, meal plan, policy, pricing model, booking window, derived plans; a policy in use can't be archived) · S04-T04 nights per room type (`inv_inventory_days` with the database validator — tested with raw writes; 0-room creation, repeat- and race-safe; 365-day window schedule; stay dates in the property's time zone).
- **Not done / why:** S04-T05 → T14 next (rate days + calendar read, bulk edit, availability, hold primitives, sweeper, signals, CSV, admin, screens, mandatory suite).
- **Files / PR:** commits 9ae5a8a, 10f3a35, 7be8f6b, 2ed32dc on `b2b/stage-00` (not pushed). Migrations 0027–0029 applied on dev Atlas.
- **Tests run:** each task: lint, typecheck, `test:b2b` 2× green (last: 65 files / 626), progress check, guards (only the untracked screenshots folder / .DS_Store flagged).
- **Decisions / deferrals:** policies are per property (not per hotel company) so property limits hold; room types read through hotel-catalog's own service (reader also needs `hotel-catalog.property.read`); no hotel-catalog event added — nights are created by the inventory module; partial index with `$in` avoided (version-safe unique name + archived key).
- **Next step:** S04-T05 — rate days (prices by guests, min / max stay, closed to arrival / departure, stop-sell) and `GET /hotel/properties/:id/calendar`; derived plan prices worked out on reading from the parent's prices.
- **Later:** S04-T05 (nightly prices per room / per guests and rules; derived prices read live from the parent, stricter rules win; calendar read creating the window's nights) → d672566 · S04-T06 (bulk edit: range + weekdays, guarded room reductions listing refused nights, prices merged inside MongoDB, preview, > 50 % confirmation, repeat-safe request id, undo latest, change log) → 136207e. Migrations 0030–0031 applied on dev Atlas. Tests 68 files / 641, 2× green (one run hit an in-memory database start timeout in notifications.test.js — unrelated, re-run green). Next: S04-T07 availability.
- **Later:** S04-T07 availability (aggregation shortlist + full rules; matched against a separate simple reference on 400 random calendars + 30 through the database) → 4150413 · S04-T08 inventory primitives (hold / confirm / release / extend / return, one atomic update per night recording the owner id; 100 parallel holds on 3 rooms → exactly 3; crash half-way through confirm finished forward; lost night handling) → 26f71c6. **Needs human review (hotel-inventory).** Migration 0032 applied on dev Atlas. Tests 70 files / 653, 2× green. Next: S04-T09 sweeper / reconciler / invariant check.
- **Later:** S04-T09 safety net (reconciler rules for holds stuck in PLACING / RELEASING / CONFIRMING; 30 s sweeper for expiry, leftovers, overdue alert; 10-min invariant checks; crash-injection tests) → 425d34c · S04-T10 live availability signals (event stored with holds and calendar changes, relayed, ≤ 1 `availability:changed` per property per second) → see git log. **Needs human review (hotel-inventory).** Migrations 0033–0034 applied on dev Atlas. Tests 72 files / 661, 2× green. Next: S04-T11 CSV import.
- **Later:** D12 confirmed by the owner (allotment; no other channels for now; hotels mark overlaps by hand) · S04-T11 calendar file import (template, every problem by line and column, dry run, apply — repeat-safe, logged, undoable) → dffecc8 · S04-T12 admin calendars (read any property; override with a reason, logged as OVERRIDE, undoable, own-company guard; path `calendar/override` because Stage 03's `/admin/properties/:id/:action` would catch `calendar-override`; admin panel) → see git log. Tests 74 files / 671, 2× green. Next: S04-T13 hotel screens.
- **Later:** S04-T13 "Rooms & rates" screens (calendar grid with bulk edit — preview, > 50 % confirm, undo, live updates; rate plans; policies; file import; change history; realtime hook got an optional `rooms` list) → 0578761 · S04-T14 mandatory suite (tenant isolation for all six `inv_` collections, classification, map of every other mandatory test) → see git log. **Stage 04: 14 / 14, AWAITING_SIGN_OFF.** Deferred on purpose: DEF-026 (50k-row timing, Stage 16), DEF-027 (virtualised grid), DEF-028 (change-log archiving, Stage 15), DEF-029 (booking-entry invariant + cancellation event, Stage 08). Human review required for the inventory code. Tests 75 files / 684, 2× green. Next: Stage 05 — Pricing & GST (CA input Q1–Q7).
- **Later (18 Nov):** go-live of Stages 00–04 requested by the owner. Branch `b2b/stage-00` pushed (owner merges the PR). Runbook `docs/go-live/stages-00-04.md`. Owner: the API stays on `musafirbabaserver.3mongoose.online` (no new domain), frontend on Vercel → **D35 login relay**: sign-in calls go through `frontend/src/app/api/v1/[...path]/route.ts` (allow-list, POST, ≤ 64 KB) so the strict refresh cookie is first-party on musafirbaba.com; the API trusts the relay's visitor IP only with `B2B_RELAY_SECRET` (constant-time; `core/rate-limit.js` — core change, needs review); switched on by `NEXT_PUBLIC_B2B_AUTH_RELAY=true` (off locally). Guard allow-list extended for `docs/go-live/` and `frontend/src/app/api/v1/`. Also: location map falls back to lat / lng when Google refuses the Maps key. Tests 75 files / 685, 2× green; relay tried on the dev servers (404 outside the allow-list; refresh / login answers passed through). Not verified: Set-Cookie after a successful login through the relay (runbook step 8.6 checks it live).
- **Later (18 Nov, 00:35–00:41 IST) — production, with the owner's go-ahead:** PR #220 merged by the owner (backend auto-redeployed, B2B off). Fresh database dump `~/server/backups/mongo/pre-b2b/mongo-test-20261118-003518.archive.gz` (39.6 MB). `backend/.env` backed up (`.env.bak.20261118003607-pre-b2b`) and **only appended**: `B2B_ENABLED`, `B2B_BACKGROUND`, three generated secrets (`B2B_AUTH_SECRET`, `B2B_FILE_KEY`, `B2B_RELAY_SECRET` — never printed), `B2B_PUBLIC_URL`, `B2B_FILE_STORAGE=r2`, `B2B_MEDIA_BASE_URL`, `B2B_EMAIL_MODE=resend`, `B2B_EMAIL_FROM` (the existing verified info@ address), `RESEND_API_KEY` (= the existing `Resend_API` value; the existing email service reads `Resend_API` first). Recreated with B2B off → existing endpoints 200, `/api/v1` 404. Migrations 0001–0034 applied (re-run: none); existing collections still 108 (+39 new). `B2B_ENABLED=true` → `/api/v1/health` ok (database up, job lag 0, reconciler running), existing API and website 200, backend 224 / 512 MB, load 0.11; start-up log clean. Still to do: first Super Admin (staff email needed), Vercel settings (owner), end-to-end test. **Open risk raised with the owner:** the nightly 03:00 backup mirrors production into the same Atlas database local development uses (`--drop` per collection) — from tonight it replaces the local B2B test data with production's.
- **Later (18 Nov) — first B2B admins (owner: existing admin / superadmin staff get full access):** production has 3 active `admin` staff, no `superadmin`. Super Admin is limited to 2 holders by design → `admin@` and `ashu@` = `platform.superAdmin`; `admin1@` (TestAdmin) = Operations + Finance + Hotels + Support. Grant script copied into the container, run, removed again; `acl_staff_roles` holds the three entries. Later admins: Super Admins assign roles in the admin pages.
- **Later (18 Nov) — Vercel settings added by the owner; relay checked live:** relay → API answers, allow-list 404, CORS from musafirbaba.com to the API allows credentials. The API still saw Cloudflare addresses as the visitor: **musafirbaba.com itself is served through Cloudflare** (Cloudflare → Vercel), so Vercel's forwarding headers carry a Cloudflare edge address. Fixes pushed to `main` with the owner's go-ahead (frontend only, no backend redeploy): 18116ad (secret trimmed, all Vercel forwarding headers, `x-b2b-relay: secret=yes|no; ip=yes|no` diagnostic — never values) and 2db90f2 (use `cf-connecting-ip` only when the address connecting to Vercel is inside Cloudflare's published ranges — a direct call to the Vercel address can't fake it; range logic checked on 15 cases). Result: the API records the visitor's real address (checked: the tester's own IPv6). Test logins used fake addresses and only left short-lived rate-limit counters. Still open: end-to-end sign-in test by the owner; nightly Atlas mirror decision; optionally rotate `B2B_RELAY_SECRET` (it was shown in chat) and mark it Secret on Vercel.
- **Later (18 Nov) — backups, owner: "complete backup like we are doing":** the nightly 03:00 script dumps the whole database (no exclusions; 7 days kept) and mirrors `test.*` to Atlas, so B2B collections are included from tonight — nothing changed. Full backup taken now with the same dump command: `pre-b2b/mongo-test-20261118-125942-b2b-live.archive.gz` (147 collections = 108 existing + 39 B2B, no errors). Consequence accepted: from tonight the Atlas copy used by local development also carries production's B2B data.
- **Next step:** UI-5 team & access, settings & security, my properties, business profile.
- **Next step:** S02-T05 — hotel self-registration (`POST /registrations/hotel`: user + org ONBOARDING + KYC application, email verification, duplicate GSTIN flag).

## 2026-11-13 — AI (Claude) — S00-T15 revised: everything inside the one backend (ADR-0015)

- **Goal:** owner decision — exactly one backend app and one frontend app (musafirbaba.com; new pages as routes under it). No extra containers, hostnames or previews.
- **Done:** S00-T15 reworked (still DONE):
  - `worker.js`, `realtime.js`, the Socket.IO server, realtime tokens and `core/lifecycle.js` were removed.
  - `background.js` `startBackground()` now runs jobs, the scheduler (reconciler, invariants), the event relay and the signal reader **inside the backend process**, started by `routes/v1.js` after the B2B database connects. Every loop catches its own errors, all timers are unref'd, and no signal handlers are installed.
  - Live updates are **Server-Sent Events** at `GET /api/v1/realtime/stream` (`core/realtime/stream.js`): personal rooms from the login, ≤ 20 public availability rooms, 20 streams/IP, 5,000 in total, slow readers dropped, 25 s heartbeat, `Last-Event-ID` replay, `resync`.
  - `cache:evict` now clears shared caches (`createCache({ shared: true })`).
  - Config: `B2B_BACKGROUND` added; `B2B_REALTIME_PORT/SECRET/ORIGINS` removed. DB roles are now `api`/`cli`/`test`.
- **Not done / why:** —
- **Files / PR:**
  - Code: `backend/src/b2b/{background.js,routes/v1.js,routes/realtime.js,core/realtime/{stream,signals}.js,core/{cache,config}.js,core/db/connection.js,core/jobs/{runner,scheduler}.js,core/db/events-relay.js,migrate.js}`; `tests/b2b/realtime.test.js` rewritten.
  - Crash-isolation test now uses `B2B_BACKGROUND=maybe`. The old `B2B_REALTIME_PORT` trigger was no longer invalid, so that test had been passing for the wrong reason.
  - `package.json`: scripts `b2b:worker` and `b2b:realtime` removed; `socket.io` and `socket.io-client` uninstalled, so B2B now adds 0 runtime packages.
  - Docs: ADR-0015 (supersedes 0010, amends 0001); plan 01, 02, 03, 05, 06, 07, 08, 09 (D21, D28, K14), 10, 11, 12 (B2, B4, B5, D5, kill switches), stage 00/02/06 files, PR template, AGENTS template + copy, existing-system map (E4 drops `NEXT_PUBLIC_B2B_REALTIME_URL`).
- **Tests run:** `npm run test:b2b` ✅ 23 files / 214 tests; `typecheck:b2b` ✅; `lint:b2b` ✅; `b2b:guards` ✅ (lockfile: 237 dev packages added, 0 runtime, none changed).
- **Decisions / deferrals:** ADR-0015. If background load ever shows in `/api` response times, `startBackground()` can move to its own process with owner approval (no module changes).
- **Next step:** owner signs off Stage 00; then write the Stage 01 task list (organisations, users, roles & permissions).

## 2026-11-12 — AI (Claude) — S00-T06 lint/format, S00-T18 module generator

- **Goal:** finish Stage 00.
- **Done:** S00-T06 → DONE: `npm run lint:b2b` (ESLint 9 + `eslint-plugin-jsdoc` + Prettier check; config in `scripts/b2b/`; B2B folders only), `npm run format:b2b`; CI runs lint; secret scan added to `b2b:guards` (MongoDB URIs with passwords, AWS keys, private keys, Resend keys, secrets in env-style lines); all B2B files formatted; scheduler split into smaller functions. S00-T18 → DONE: `npm run b2b:gen-module` with templates (index, permissions, events, domain, tenant model, repository, service, validators, routes, README with migration, integration test); sample `example` module generated and tested (not mounted). Progress counter now shows `AWAITING_SIGN_OFF` when all tasks are done — only a human sets a stage `DONE` (by filling in Finished).
- **Not done / why:** git pre-commit hooks deferred (DEF-022) — they would change every developer's commit flow repo-wide.
- **Files / PR:** `backend/scripts/b2b/{eslint.config.js,prettier.json,gen-module*.js,guards*.js,progress-lib.js}`, `backend/src/b2b/modules/example/*`, `tests/b2b/{gen-module,modules/example}.test.js`, `.github/workflows/b2b-guards.yml`, `docs/progress/*`, AGENTS template + copy; `package.json`: dev deps `eslint` 9.39.1, `@eslint/js`, `eslint-plugin-jsdoc` 50.6.17, `prettier` 3.6.2 (dev only; no existing package changed) and scripts `lint:b2b`, `format:b2b`, `b2b:gen-module`.
- **Tests run:** `npm run test:b2b` ✅ 213/213; `lint:b2b` ✅; `tsc` ✅; `b2b:guards` ✅; `b2b:progress -- --check` ✅.
- **Decisions / deferrals:** DEF-022 (git hooks).
- **Next step:** owner reviews Stage 00 Definition of Done and fills in the Finished date; then Stage 01.


## 2026-11-12 — AI (Claude) — S00-T12, T16, T17, T19, T20, T21

- **Goal:** finish Stage 00's support tasks.
- **Done:** S00-T21 → DONE (`core/health.js`: ok/degraded/down, job lag, reconciler last run; 503 when the database is down). S00-T12 → DONE (`npm run b2b:progress` + `-- --check`, now in CI; counts in STATUS.md are generated from here on). S00-T19 → DONE (`docs/adr/0001`–`0014`). S00-T20 → DONE (`backend/src/b2b/AGENTS.md` + `CLAUDE.md`; template's realtime line and command list corrected). S00-T16 and S00-T17 marked DONE (harness and B2B CI already in place; staging deploy + existing-system smoke checks wait for a staging server). `docs/adr/` allowed in the guards. README: `DONE` = committed on the stage branch.
- **Not done / why:** S00-T18 module generator and S00-T06 lint tooling — next.
- **Files / PR:** `backend/src/b2b/core/health.js`, `routes/v1.js`, `backend/scripts/b2b/progress*.js`, `backend/src/b2b/{AGENTS,CLAUDE}.md`, `docs/adr/*`, `.github/workflows/b2b-guards.yml`, tests.
- **Tests run:** `npm run test:b2b` ✅ 202/202; `tsc` ✅; guards ✅; `b2b:progress -- --check` ✅.
- **Decisions / deferrals:** —
- **Next step:** S00-T18 — `npm run b2b:gen-module <name>` + sample module; S00-T06 — style tooling (check ESLint for lockfile drift first).


## 2026-11-12 — AI (Claude) — S00-T15 self-hosted realtime

- **Goal:** live notifications and availability updates without third-party services, Redis or change streams.
- **Done:** S00-T15 → DONE. `core/realtime/rooms.js` (personal rooms from the token; browsers may only join `availability:property:*`), `token.js` (HS256 on node:crypto, ≤ 15 min, audience `b2b-realtime`, timing-safe check), `signals.js` (`publish`, `publishCacheEvict` → capped `rt_signals`; `createSignalReader` with a tailable cursor, resumes from last id, skips signals older than 2 min after restart), `server.js` (Socket.IO: handshake token, ≤ 20 connections per IP, ≤ 20 public rooms per socket, 4 KB messages, `cache:evict` never sent to browsers), `realtime.js` process, `GET /api/v1/realtime/token`, config `B2B_REALTIME_SECRET` / `B2B_REALTIME_ORIGINS`, migration `0005-rt-signals`.
- **Not done / why:** new Cloudflare hostname for the realtime container — at first deploy; API-process cache eviction listener — when the first cache is used (Stage 06).
- **Files / PR:** `backend/src/b2b/core/realtime/*`, `routes/realtime.js`, `routes/v1.js`, `realtime.js`, `core/config.js`, `migrations/index.js`, `tests/b2b/realtime.test.js`; `package.json`: `socket.io` 4.8.1 (runtime, 18 packages added, none changed), `socket.io-client` 4.8.1 (dev).
- **Tests run:** `npm run test:b2b` ✅ 197/197 (real Socket.IO server + client: member receives org event via MongoDB; anonymous can follow availability, not personal rooms; other org receives nothing; forged token refused); `tsc` ✅; guards ✅; migration `0005` applied on dev; realtime process live on dev: health `database: up`, SIGTERM exit 0.
- **Decisions / deferrals:** realtime tokens signed with node:crypto (no `@types/jsonwebtoken`).
- **Next step:** S00-T21 health details, then Stage 00 tooling/docs tasks (module generator, ADRs, AGENTS.md, `npm run progress`).


## 2026-11-12 — AI (Claude) — S00-T14b rate limiter + cache

- **Goal:** request limits that work across processes and restarts, and a short-lived cache — without Redis or new packages.
- **Done:** S00-T14b → DONE. `core/rate-limit.js`: fixed-window counters in `core_rate_limits` (one upsert per call, duplicate-key retry), over-limit keys remembered in memory until the window ends (no further DB writes), `rateLimit(limiter, keyOf)` middleware (RateLimit-* headers, 429 `RATE_LIMITED` + Retry-After), `clientIp` (CF-Connecting-IP; existing app's `trust proxy` not changed). `core/cache.js`: LRU + TTL + `deletePrefix`. Migration `0004-core-rate-limits`.
- **Not done / why:** wiring limits onto real routes happens with those routes (login in Stage 01, booking in Stage 08).
- **Files / PR:** `backend/src/b2b/core/{rate-limit,cache}.js`, `migrations/index.js`, `tests/b2b/rate-limit-cache.test.js`; plan: rate limiter/cache now in-house (no `rate-limiter-flexible`, no `lru-cache`).
- **Tests run:** `npm run test:b2b` ✅ 190/190 (20 parallel calls across two limiters → exactly 10 allowed); `tsc` ✅; guards ✅; migration `0004` applied on dev.
- **Decisions / deferrals:** in-house instead of packages — no new runtime dependency in the existing app.
- **Next step:** S00-T15 — self-hosted realtime (Socket.IO reading `rt_signals`).


## 2026-11-12 — AI (Claude) — S00-T11 event relay

- **Goal:** deliver stored events (booking confirmed, KYC approved …) to their consumers exactly once, without transactions.
- **Done:** S00-T11 → DONE. `core/db/events-relay.js`: `relayOnce` (event → `core_outbox` with `_id = eventId` → `enqueue` per consumer with `dedupeKey` → `$pull` from the document → clear the flag only if no new event arrived), `createEventBus` (`subscribe`), `consumerJobHandlers` (`core_inbox` dedupe), `createEventRelay` (500 ms loop, skips overlapping passes). Worker runs it; registry `background.js` gains `eventBus` and `eventSources`. Scheduler also skips overlapping ticks. Routine background reads (`systemScope(reason, { routine: true })`) log at debug. Migration `0003-core-outbox-inbox` (90-day TTL).
- **Not done / why:** —
- **Files / PR:** `backend/src/b2b/core/db/events-relay.js`, `tenant-plugin.js`, `model.js`, `jobs/{reconciler,scheduler}.js`, `background.js`, `worker.js`, `migrations/index.js`, `tests/b2b/events-relay.test.js`.
- **Tests run:** `npm run test:b2b` ✅ 183/183 (repeat relay / crash before clearing → no duplicates; 3 relays at once → each event once; late event not lost; end-to-end state change → relay → jobs → each handler once; job run twice → handler once); `tsc` ✅; guards ✅; migration `0003` applied on dev; live worker start/stop ✅.
- **Decisions / deferrals:** —
- **Next step:** S00-T14b — rate limiter (MongoDB store) + in-process cache.


## 2026-11-12 — AI (Claude) — S00-T03 job queue + scheduler, S00-T14 worker wiring

- **Goal:** background work on MongoDB (no Redis) that is safe with several worker containers.
- **Done:** S00-T03 → DONE: `core/jobs/queue.js` (`enqueue` with dedupe, `claimNext` = one findOneAndUpdate with lease and crash takeover, `completeJob`/`failJob` only by the current owner, exponential backoff 5 s→1 h, `DEAD` after maxAttempts), `runner.js` (claim/run loop, idle back-off 0.5→5 s, clean stop), `scheduler.js` (lease-locked schedules, once across workers, crash takeover, error recorded); migration `0002-core-jobs-and-schedules`. S00-T14 → DONE: `worker.js` runs the job runner, reconciler every 30 s and invariant checks every 10 min; registry `background.js` for modules.
- **Not done / why:** rate limiter + cache split out as S00-T14b (total tasks now 22).
- **Files / PR:** `backend/src/b2b/core/jobs/{queue,runner,scheduler}.js`, `background.js`, `worker.js`, `migrations/index.js`, `tests/b2b/jobs.test.js`.
- **Tests run:** `npm run test:b2b` ✅ 176/176 (30 jobs × 2 racing workers → each once; 2 schedulers → once per interval; crash takeover; stale owner can't complete); `tsc` ✅; guards ✅; migration `0002` applied on dev; worker started live on dev, both schedules recorded a run, SIGTERM exit 0.
- **Decisions / deferrals:** —
- **Next step:** S00-T11 — events relay (`pendingEvents` → `core_outbox` → jobs per consumer, `core_inbox` dedupe).


## 2026-11-12 — AI (Claude) — S00-T08 consistency kit (no transactions)

- **Goal:** the building blocks that make "no double booking" work on the standalone production MongoDB.
- **Done:** S00-T08 → DONE. `core/db/transition.js` (one conditional update: status check + `statusChangedAt` + events; only options allowed are `systemScope` — no sessions), `core/db/events.js` (`newEvent` with `module.entity.pastVerb` types, `pendingEvents` fields), `core/db/owned-counter.js` (`applyOwned` with capacity check, `undoOwned`, `transferOwned` — owner recorded in the same document, pipeline updates, repeat-safe), `core/jobs/reconciler.js` (rules for stuck statuses, attempt counter, alert after 3), `core/db/invariants.js`.
- **Not done / why:** scheduling the reconciler every 30 s comes with the scheduler (S00-T03); the relay of `pendingEvents` to the outbox is S00-T11.
- **Files / PR:** `backend/src/b2b/core/{db,jobs}/*`, tests `consistency-kit.test.js` + test-only `helpers/sample-hold-flow.js` (miniature of the Stage 04 inventory flow with the real validator).
- **Tests run:** `npm run test:b2b` ✅ 166/166 — hold flow crashed after each of 5 steps and confirm flow after each of 5 steps → reconciler always restores a consistent state; 20 buyers / 3 rooms → exactly 3; overlapping stays → no night oversold; validator refuses impossible writes; 10 concurrent transitions → 1 winner. `tsc` ✅; guards ✅.
- **Decisions / deferrals:** Mongoose quirk recorded in code — a subdocument field named `type` must be declared as `{ type: String }`.
- **Next step:** S00-T03 — MongoDB job queue + lease-locked scheduler (then run the reconciler from the worker).


## 2026-11-12 — AI (Claude) — S00-T09 tenant guard, S00-T10 idempotency

- **Goal:** no org can reach another org's data; repeated requests never run twice.
- **Done:** S00-T09 → DONE: `tenantPlugin` / `defineTenantModel` — every query/update/delete/count/distinct/aggregate/bulkWrite on a tenant model must be scoped by an ownership field (concrete value, `$eq`, non-empty `$in`, `$and`, or `$or` with all branches scoped); `estimatedDocumentCount` always refused; new documents need an owner (create, insertMany, bulkWrite insert); cross-org work via `systemScope(reason)`, logged. S00-T10 → DONE: `withIdempotency` (claim → run → store response; replay; 422 `IDEMPOTENCY_KEY_REUSED`; 409 `IDEMPOTENCY_IN_PROGRESS`; lease takeover after a crash; record removed on failure so retries work), `hashRequest` (key-order independent), `idempotencyScope` per actor; migration `0001-core-idempotency-keys`.
- **Not done / why:** —
- **Files / PR:** `backend/src/b2b/core/db/{tenant-plugin,idempotency,model}.js`, `migrations/index.js`, tests.
- **Tests run:** `npm run test:b2b` ✅ 148/148 (incl. 15 unscoped-access attempts, 10 parallel double-clicks → 1 run); `tsc` ✅; `npm run b2b:guards` ✅; `npm run b2b:migrate` on dev ✅ (applied once, second run no-op).
- **Decisions / deferrals:** verified Mongoose 8.17.1 supports `bulkWrite` middleware and custom query options.
- **Next step:** S00-T08 — consistency kit (`transition()`, owned counters, reconciler registry).


## 2026-11-12 — AI (Claude) — S00-T13 HTTP layer

- **Goal:** safe request handling for every /api/v1 route.
- **Done:** S00-T13 → DONE. `core/http/validate.js` (forbidden keys `$…`, `a.b`, `__proto__`/`constructor`/`prototype` refused at any depth before zod; parsed input on `res.locals.input`), `context-middleware.js` (RequestContext per request, pluggable `authenticate`, anonymous until Stage 01), `permissions.js` (`publicRoute`, `requireCustomer`, `requirePermission` → 401/403), `protection.js` (API security headers, 15 s request timeout, UUID `Idempotency-Key` reader). Wired into `/api/v1`.
- **Not done / why:** real authenticators (business login, existing token verification, API keys) — Stage 01/14 as planned.
- **Files / PR:** `backend/src/b2b/core/http/*`, `routes/v1.js`, `tests/b2b/http-layer.test.js`, test helper `post()`.
- **Tests run:** `npm run test:b2b` ✅ 118/118 (incl. 5 injection payloads over HTTP); `tsc` ✅; `npm run b2b:guards` ✅.
- **Decisions / deferrals:** own security headers instead of `helmet` (no new runtime package).
- **Next step:** S00-T09 tenant plugin and S00-T10 idempotency helper.


## 2026-11-12 — AI (Claude) — S00-T07 core kernel

- **Goal:** shared building blocks for all B2B modules.
- **Done:** S00-T07 → DONE. `core/money.js` (immutable, integer paise, basis points, half-up, no negatives), `core/dates.js` (`StayDate`, `nightsOf` ≤ 30 nights, `addDays`, `hotelDeadline` in hotel time zone incl. DST, `todayIn`), `core/ids.js` (`MBO`/`MBH`/`MBHT`/`MBC` references, crypto-random Crockford base32 + Luhn mod 32 check char, `parseReference` with look-alikes), `core/errors.js` (typed errors → RFC 9457, unknown errors never leak), `core/logger.js` (JSON lines, redacts secrets/PII by key at any depth), `core/context.js` (frozen RequestContext, `systemContext` needs a reason), `core/http/problem.js` wired into `/api/v1` (404 + error handler).
- **Not done / why:** —
- **Files / PR:** `backend/src/b2b/core/*`, `backend/src/b2b/routes/v1.js`, tests `core-*.test.js`.
- **Tests run:** `npm run test:b2b` ✅ 104/104; `tsc` ✅; `npm run b2b:guards` ✅.
- **Decisions / deferrals:** logger written in-house instead of `pino` — no new runtime package in the existing app (plan updated).
- **Next step:** S00-T13 — HTTP layer (zod `validate()` with `$`/`.` key rejection, `requirePermission`, context builder).


## 2026-11-12 — AI (Claude) — S00-T05 guard checks + CI

- **Goal:** automatic checks so B2B work can never change existing code or dependencies.
- **Done:** S00-T05 → DONE. `npm run b2b:guards`: changed paths (only B2B folders, docs, B1–B3), `app.js` may only gain the mount lines, `package.json` additions only (scripts named `test:b2b`/`typecheck:b2b`/`b2b:*`), lockfile — no existing package changes version or disappears, code rules for `src/b2b` (no transactions/change streams, no default mongoose, `defineModel` only, no imports outside `src/b2b`, Clock for time, `@ts-check`, legacy-read read-only) and existing code must not import B2B code except `app.js → b2b/mount.js`. `.github/workflows/b2b-guards.yml`: b2b/* branches + PRs only, `ubuntu-latest`, read-only permissions.
- **Not done / why:** ESLint style rules (T06) — not added yet; needs a lockfile check because ESLint has many dependencies.
- **Files / PR:** `backend/scripts/b2b/*`, `backend/tests/b2b/guards.test.js`, `.github/workflows/b2b-guards.yml`, `package.json` (+ `b2b:guards`).
- **Tests run:** `npm run test:b2b` ✅ 78/78; `tsc` ✅; `npm run b2b:guards` ✅ against origin/main.
- **Decisions / deferrals:** found that `deploy-musafirbabaserver.yml` redeploys the backend on every push to `main` touching `backend/**` (O3 answered) — merging B2B work deploys it switched off; the deploy workflow is not changed.
- **Next step:** S00-T07 — core kernel (money, dates, ids, errors, logger).


## 2026-11-12 — AI (Claude) — S00-T04 zero-impact guards

- **Goal:** make it impossible for B2B code to write to existing collections.
- **Done:** S00-T04 → DONE. Allowed-prefix list in code (`core/db/prefixes.js`, aligned with plan §4.2: added `id_`, `file_`, `aud_`, `rt_`; audit never uses the existing `AuditLog`); `defineModel()` (B2B instance, explicit prefixed collection, strict) + start-up check in api/worker/realtime; migration runner with restricted context, prefix checks, `core_migrations` records and lease lock, `npm run b2b:migrate`; `legacy-read/` — `findCustomerById`, `findStaffById`, `findSessionById` (native `findOne` with fixed projections, `maxTimeMS` 2 s, no passwords).
- **Not done / why:** —
- **Files / PR:** `backend/src/b2b/core/db/{prefixes,model,migrations}.js`, `backend/src/b2b/legacy-read/index.js`, `backend/src/b2b/{migrate.js,migrations/index.js}`, tests; `package.json` (+ `b2b:migrate` script, dev dep `mongodb-memory-server` 10.1.4).
- **Tests run:** `npm run test:b2b` ✅ 46/46 (on standalone MongoDB 8.0.4 in memory); `tsc` ✅; `npm run b2b:migrate` on dev DB ✅ (only creates `core_migrations`).
- **Decisions / deferrals:** `mongodb-memory-server` pinned to 10.1.4 — newer versions bumped existing `debug`/`semver` (lockfile rule).
- **Next step:** S00-T05 — CI: protected paths, lockfile guard, lint bans for `src/b2b`.


## 2026-11-12 — AI (Claude) — S00-T02 `backend/src/b2b/` skeleton

- **Goal:** isolated B2B code inside the existing backend, switched off by default.
- **Done:** S00-T02 → DONE. `src/b2b/mount.js` (flag `B2B_ENABLED`, guarded dynamic import, never falls through to existing middleware), `routes/v1.js` (`/api/v1/health`, `/meta/version`), own Mongoose instance (`autoIndex`/`autoCreate` off, pool caps), config (zod), clock, request id, `worker.js`, `realtime.js` (health only), `jsconfig.json`. B1: 2 lines in `app.js`. B2: dev deps `vitest`, `typescript`, `@types/express` + scripts.
- **Not done / why:** owner direction changed mid-task — separate `b2b-backend/` app rejected; plan updated (§6.10) to "inside the existing backend, isolated".
- **Files / PR:** `backend/src/b2b/**`, `backend/tests/b2b/**`, `backend/src/app.js` (B1), `backend/package.json` + lockfile (B2/B3).
- **Tests run:** `npm run test:b2b` ✅ 11/11 (flag off = today's behaviour on the real app.js; crash isolation on the real app.js → 503 on /api/v1, existing routes fine; separate Mongoose instance doesn't get the existing audit plugin); `npm run typecheck:b2b` ✅; worker start/stop against dev DB ✅.
- **Decisions / deferrals:** lockfile rule — no existing package may change version (supertest dropped: it bumped `qs`, `form-data` and 5 others).
- **Next step:** S00-T04 — prefix guard, migration runner, read-only `legacy-read`.


## 2026-11-12 — AI (Claude) — S00-T01 Map the existing system

- **Goal:** read-only map of today's system for the new `b2b-backend/` service.
- **Done:** S00-T01 → DONE. `docs/existing-system-map.md` (logins, PayU, frontend entry points, DB names, deployment). Plan moved to `docs/plan/`; progress tracking set up in `docs/progress/`; branch `b2b/stage-00` from `origin/main`.
- **Not done / why:** owner checks O1–O5 need server/dashboard access (blocker B1).
- **Files / PR:** `docs/existing-system-map.md`, `docs/plan/**`, `docs/progress/**` — no existing code touched.
- **Tests run:** none (no code yet).
- **Decisions / deferrals:** PayU txn prefixes → `B2BH/B2BW/B2BS`; legacy-read also reads `sessions`; edit E1 = enable the existing Hotels tab. Plan file 12 updated.
- **Next step:** S00-T02 — create the isolated `backend/src/b2b/` skeleton with the flagged two-line mount.


## YYYY-MM-DD — <name or "AI (editor/model)"> — SNN-Txx <task name>

- **Goal:** what this session set out to do
- **Done:** what was finished (task IDs → new status)
- **Not done / why:** what's left and the reason (blocked? deferred → `DEF-…`?)
- **Files / PR:** main files touched, PR link
- **Tests run:** commands and results (e.g. `npm test` ✅, `npm run test:arch` ✅)
- **Decisions / deferrals:** new ADRs, `DEF-…` rows, plan changes
- **Next step:** the exact next task for the following session
