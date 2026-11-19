# Stage 10 — B2B client onboarding & KYC · Progress

> Task list from `docs/plan/stages/stage-10-client-onboarding-kyc.md` §3, split so each task fits one reviewable change. Built right after Stage 06 (D36). Rules and status values: `docs/progress/README.md`.

| | |
| --- | --- |
| **Status** | AWAITING_SIGN_OFF |
| **Phase · Track** | B · clients |
| **Owner(s)** | |
| **Started** | 2026-11-19 |
| **Finished** | — |
| **Plan file** | `docs/plan/stages/stage-10-client-onboarding-kyc.md` |
| **Depends on** | Stages 01, 02 (awaiting owner sign-off) |
| **Modules** | `kyc` (configuration + client details), `organizations` (client categories), `identity`, `notifications` — all existing; new client screens in the business area and admin |

## Defaults used for this stage (owner can change any of them)

| Topic | Default |
| --- | --- |
| Where clients work | The **same business area `/business`** as hotels (D14 — no new path); the menu and home page adapt to the organisation type (clients see search, team, verification; hotels keep properties). The plan's `/client` path is not created |
| KYC engine | **Configuration only** — a `CLIENT` document set and client business details; review, approval (D34), sensitive data, retention unchanged |
| Clients without GST | Allowed like hotels: a below-threshold declaration instead of the GST certificate, flagged high-risk for the reviewer (same rule as D31) |
| On approval | Organisation becomes ACTIVE (existing Stage 02 listener, any type), category **Standard** assigned, welcome email + bell. Default plan record → Stage 13; wallet → Stage 11 |
| Client categories | Admin-managed list (Standard, Silver, Gold seeded); used by margin rules (Stage 05) and listing visibility for B2B (Stage 03) |

## Tasks

| ID | Task | Plan ref | Status | Owner | PR | Tests | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S10-T01 | Stage setup: task list, defaults recorded, permissions for client categories | §3 | DONE | AI (Claude) | | — | No new permission needed: the category list and a client's category are managed with the existing `platform.org.manage` (sensitive — Super Admin, Operations) and read with `platform.org.read`; team pages use the Stage 01 permissions. Defaults above (business area `/business` adapts by organisation type; configuration-only KYC; clients without GST like hotels) |
| S10-T02 | Client business details (shared checks, no hotel-only fields) + `CLIENT` document set (configuration) | §3.1, §3.2 | DONE | AI (Claude) | | 5 ✅ | `domain/client-details.js` `validateClientDetails` = exactly the Stage 02 hotel checks (GSTIN / PAN checksums and cross-checks, state, PIN, mobile, email, terms, optional entity type / trade name / year / designation / alternate mobile) without the hotel-only property count; same risk flags (`assessRisk`). `DOCUMENT_SETS.CLIENT` (configuration, engine unchanged): GST certificate (or below-threshold declaration when not registered), PAN card, company registration, office address proof, cancelled cheque (refunds). Hotel set unchanged (tested) |
| S10-T03 | `POST /registrations/client` and `PUT /kyc` details for clients (owner account, org `CLIENT` ONBOARDING, draft application, email link) | §3.1, §5 | DONE | AI (Claude) | | 4 ✅ + hotel registration ✅ | One registration flow for both kinds of business (`register(deps, limiter, type)`): same browser header, 10 / hour per IP, owner account (or the signed-in user), org `CLIENT` ONBOARDING, draft application with the client details and document set, verification email ("verify your company"), signed in. `ClientDetailsBody` = the hotel form without the property count (sending one → 400). `PUT /kyc` uses the client form for client members and the hotel form for everyone else (hotels exactly as before); `GET /kyc` starts an empty draft of the org's own type for an onboarding client too. Type annotations widened to accept client details (no logic change in the KYC engine). New public route added to the reviewed list |
| S10-T04 | Client categories `org_client_categories` (admin list, seeded Standard / Silver / Gold) + a client's category (admin sets it); search uses it for B2B prices and visibility | §3.4 | DONE | AI (Claude) | | 4 ✅ | `org_client_categories` (migration `0041`, platform-wide, key unique; never deleted — switched off), seeded at background start (adds missing keys only). New field `clientCategory` on organisations (default empty; clients only) and event `organizations.org.category-changed` stored with the change. `createClientCategoriesService`: list (active / all), add (KEY in capitals), rename / reorder / switch off, `assign` (active category, CLIENT orgs only, repeat-safe). Routes: `GET /admin/client-categories` (`platform.org.read`), `POST`, `PATCH /:key`, `PUT /admin/orgs/:id/client-category` (`platform.org.manage`). `basicInfo` now also returns the category, and the **search gateway passes it on**: margin rules matching a category (Stage 05) and listings limited to categories (Stage 03) now work for signed-in clients (tested end to end: Gold rule price, Gold-only hotel); picked up within a minute (cached org info) |
| S10-T05 | On approval for clients: category Standard, welcome notification (repeat-safe); plan record → Stage 13, wallet → Stage 11 | §3.5 | DONE | AI (Claude) | | 2 ✅ + notifications ✅ | Approval already activates the org (Stage 02 listener, any type). New consumer `organizations-client-default-category` on `organizations.org.activated` (type CLIENT) → `assignDefault`: Standard only when the client has no category yet (conditional update with the category event; repeat-safe; never overrides an admin's choice; hotels untouched). **Welcome:** the existing approval notification now has a client wording — `kyc.approved-client` ("…is verified. You can now search hotels with your B2B prices and add your team", link `/business`, email "Your company is verified") chosen when the event's `orgType` is CLIENT (`categoryKeyFor`); hotels get exactly the old message. The variant shows in the bell but not twice in notification settings. No "set your password" link needed — the owner chose a password when registering. Default plan record → **DEF-033** (Stage 13); wallet accounts open with Stage 11 |
| S10-T06 | Admin: clients list and client detail (category, members, KYC history, suspend / reactivate, view as client) | §3.7 | DONE | AI (Claude) | | 1 ✅ + tsc ✅ | Most of it existed from Stage 01 / 02 and works for clients unchanged: organisations list with type filter, organisation page (members, status — suspend with reason / reactivate, activity), "view as" (read-only, owners emailed, audited), KYC queue and review (filter by org type). Added: the admin organisation view returns `clientCategory` (clients only); the list shows it next to the type; a client's page has a **Client category** panel (pick + save; note that new clients get Standard on approval); the Organisations tab has a **Client categories** panel (add with a KEY and name, switch on / off). Type-checked; not clicked through in a browser by me |
| S10-T07 | Business area for clients: registration wizard (client), menu and home by organisation type, verification page (client documents), team pages (existing) | §3.3, §3.6 | DONE | AI (Claude) | | tsc ✅ | **Sign-up wizard** (`/business/register`): step 1 now offers **Hotel & property supplier** or **Travel agent / B2B client**; for clients the details form has no property count, step 3 shows "Hotel booking (B2B prices)", the account is created through `POST /registrations/client`, documents step asks for the company bank account (refunds), review step shows the client service. **Verification page**: the client document list comes from the server (configuration); the details form and summary hide the property count for clients. **Menu**: already permission-driven — clients don't see My Properties. **Home**: client wording ("…then you can search hotels with your B2B prices"; once verified: "Hotel search with your B2B prices opens in this dashboard soon — invite your team under Team"). **Team, roles, branches, security, profile, activity**: the Stage 01 pages work for clients unchanged. Admin KYC review hides the property count for clients. Hotel path unchanged (same defaults). Type-checked; **not clicked through in a browser by me** |
| S10-T08 | Mandatory test suite: client KYC through configuration only, category assignment, approval listeners repeat-safe, team / role isolation between client orgs, view-as read-only | §8 | DONE | AI (Claude) | | 2 ✅ | `stage-10-mandatory.test.js`: a client **end to end through the generic engine** — register, email verified, bank, the five client documents, submit, MusafirBaba takes it, verifies every document, approves (`orgType: CLIENT` on the event) → active, Standard, signed in with `hotel-search.search.use`; **"Junior Agent"** custom role (search + markup read) and a branch; a sensitive platform permission refused in a custom role; another client company sees none of the roles, branches or members and can't edit the role (404). Header maps the rest (details, registration, categories, approval listeners repeat-safe + welcome, view-as read-only — `view-as.test.js` covers every org type) |

Status: `TODO` · `DOING` · `REVIEW` · `DONE` · `BLOCKED` · `DEFERRED` (needs a `DEF-…` row) · `DROPPED` (reason in Notes)

## Definition of Done (copied from the stage file)

- [x] Client registers → uploads → admin approves → owner sets password → logs in to the `/client` workspace (the owner sets the password when registering; the workspace is the shared `/business` area — stage-10-mandatory)
- [x] Owner invites an agent, creates a custom role ("Junior Agent": search + book only), limits them to one branch (role + branch tested; "book" permissions arrive with Stage 12 part B; invitations and branch limits are the Stage 01 features)
- [x] Admin sees and manages every client; view-as works read-only with audit (organisations list / page, category, suspend / reactivate, view-as from Stage 01)
- [x] No change to the KYC engine code was needed (configuration only — a `CLIENT` document set and client details; only type annotations were widened)

## Mandatory tests (copied from the stage file)

- [x] Client KYC through the generic engine (no engine code changed) — stage-10-mandatory, kyc-client-details, kyc-client-registration
- [x] Client category assignment — client-categories, client-approval
- [x] Approval listeners idempotent — client-approval (Standard only once, never overrides), Stage 02 activation listener
- [x] Team/roles isolation between client orgs — stage-10-mandatory
- [x] View-as read-only — view-as.test.js (Stage 01, any org type)
