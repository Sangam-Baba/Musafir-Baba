# Stage 01 — Organisations, users, roles & permissions · Progress

> Task list from `docs/plan/stages/stage-01-orgs-users-roles.md` §3 (work breakdown), split so each task fits one reviewable change. Rules and status values: `docs/progress/README.md`.

| | |
| --- | --- |
| **Status** | IN_PROGRESS |
| **Phase · Track** | A · shared |
| **Owner(s)** | |
| **Started** | 2026-11-13 |
| **Finished** | — |
| **Plan file** | `docs/plan/stages/stage-01-orgs-users-roles.md` |
| **Depends on** | Stage 00 (awaiting owner sign-off) |
| **Modules** | `identity`, `organizations`, `access`, `audit` (all in `backend/src/b2b/modules/`) |

## Choices made for this stage (no new packages, nothing existing changed)

| Topic | Choice | Why |
| --- | --- | --- |
| Password hashing | Existing `bcrypt` package, cost 12 | Already a backend dependency → lockfile unchanged |
| Business-user tokens | Existing `jsonwebtoken` package, **new secret `B2B_AUTH_SECRET`** (≥ 32 chars), access token 15 min | A separate secret means B2B tokens can never be accepted by the existing API, and existing tokens can never pass as B2B tokens |
| Refresh tokens | Random opaque token, stored hashed in `id_sessions`, rotated on every use; reuse of an old one revokes the whole family; HttpOnly cookie `b2b_refresh` limited to path `/api/v1/auth` | Plan §8 "refresh token theft" |
| Existing logins on `/api/v1` | Customer and staff tokens verified with the existing secret, read-only: shape must be `{ sub, role, sessionId }`, `sub` must exist in `users`/`staffs`, the `sessions` row must be `active`. Preview tokens (`{ role }` only, same secret) are refused | `docs/existing-system-map.md` §3; nothing existing changes |
| MFA (TOTP) | RFC 6238 on `node:crypto` (no package) + 10 one-time recovery codes (hashed) | No new dependency |
| Email (OTP, invitations, reset) | Small `EmailPort`: Resend adapter (existing account, existing `RESEND_API_KEY` read-only, existing `resend` package) sent from a background job; dev/test adapter writes to the log with codes visible only when `NODE_ENV !== 'production'` | D25 option A; no network calls between database steps |
| Admin MFA + roles (D1) | Existing `Staff` login unchanged; MFA secret and platform-role mapping stored in **new** collections (`id_staff_mfa`, `acl_staff_roles`) — `staffs` is never written; first Super Admin granted by a CLI script `npm run b2b:grant-admin` | Zero-impact rule D2 |
| Audit | New `aud_events` (not the existing `AuditLog`) | Decided in Stage 00 (S00-T04) |
| Orgs in this stage | Created by an admin (`POST /api/v1/admin/orgs` + owner invitation). Self-registration comes in Stage 02 (hotels) and Stage 10 (clients) | Plan §2 "Out" |
| New env variables (B5) | `B2B_AUTH_SECRET`, `B2B_EMAIL_FROM`, `B2B_PUBLIC_URL` (e.g. `https://musafirbaba.com`) | New `B2B_*` only |

## Tasks

| ID | Task | Plan ref | Status | Owner | PR | Tests | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S01-T01 | Stage setup: scaffold `identity`, `organizations`, `access`, `audit`; delete the sample `example` module | §3 | DONE | AI (Claude) | | 7 ✅ | Module folders with README, `permissions.js` (via new `core/permissions.js` `definePermissions`: code, group, description, org types, sensitive), `events.js`, `index.js`; `src/b2b/permission-catalogue.js` collects them (access never imports feature modules); generator template updated. Migrations are added in the task that builds each collection (with its indexes) |
| S01-T02 | `access` domain: permission catalogue from each module's `permissions.js` → seeded into `acl_permissions`; allowed list per org type; sensitive flag; the 13 system roles of §4 (pure, matrix-tested) | §3.3, §4 | DONE | AI (Claude) | | 40 ✅ | `access/domain/patterns.js` (`*` one part, `**` any parts; **wildcards never grant sensitive permissions** — only `**` or an exact code), `system-roles.js` (13 roles of §4 as patterns, kept in code so every org always has the current definition; `acl_roles` = custom roles only; default scopes; Super Admin max 2), `acl_permissions` (migration `0006`) synced at background start (`startupTasks`, repeat-safe, retired codes kept). Matrix test incl. stand-in permissions of later stages |
| S01-T03 | `identity` users: `id_users`, bcrypt cost 12, password policy, email lowercase-unique, phone E.164, lockout counters | §3.1, §7 | TODO | | | | |
| S01-T04 | `identity` sessions: access JWT (`B2B_AUTH_SECRET`, 15 min), rotating refresh tokens in `id_sessions` with family + reuse detection, logout, "log out all", refresh cookie | §3.1, §8 | TODO | | | | |
| S01-T05 | `identity` login: email or phone + password; rate limits per IP and per account, progressive delay, lockout; NoSQL-injection tests | §3.1, §8 | TODO | | | | |
| S01-T06 | Email OTP login + forgot/reset password (hashed codes, caps per email/IP/day, cool-downs) + `EmailPort` (Resend adapter via job, log adapter for dev/test) | §3.1, §8 | TODO | | | | |
| S01-T07 | TOTP MFA (node:crypto) + recovery codes + step-up endpoint | §3.1 | TODO | | | | |
| S01-T08 | `organizations`: `org_organizations` (`PLATFORM`/`CLIENT`/`HOTEL`, status), `org_branches`, `org_members` (a user may be in several orgs), `/me`, `/orgs/switch` | §3.2 | TODO | | | | |
| S01-T09 | Invitations: `org_invitations` (signed single-use links, 7-day expiry), accept as new or existing user, remove member, last-Owner rule; events `organizations.member.invited/joined/removed` | §3.2, §6, §7 | TODO | | | | |
| S01-T10 | Custom roles CRUD (allowed list per org type, sensitive permissions locked) + role assignment with scope `OWN` / `BRANCH` / `ORG` / properties; events `access.role.*` | §3.3, §6, §7 | TODO | | | | |
| S01-T11 | Authorizer `authz.assert(ctx, permission, ownership)` (pure) + member-permission cache 60 s, cleared on role/member change (`cache:evict`); branch/property scope filters | §3.4 | TODO | | | | |
| S01-T12 | Request pipeline: real authenticators (B2B token; existing customer/staff tokens read-only; preview tokens refused); org status check (suspended → sessions revoked, login shows reason); CI test that every `/api/v1` route declares a permission | §3.5, §7 | TODO | | | | |
| S01-T13 | `audit`: `aud_events` written from events (auth, members, roles, view-as, org status); admin audit API | §3.8 | TODO | | | | |
| S01-T14 | Admin access (D1): staff MFA enrolment (`id_staff_mfa`, mandatory for B2B admin permissions, enrolment window), platform roles (`acl_staff_roles`), `npm run b2b:grant-admin`, `/api/v1/admin/*` platform context only; admin orgs/users API (list, filter, detail, create org + owner invite, suspend/reactivate) | §3.6, §3.10, §5 | TODO | | | | |
| S01-T15 | View as client/hotel: `admin.viewAs` (reason, 30 min, read-only unless `admin.viewAs.write` + step-up), banner flag in `/me`, audit, owner emailed | §3.7 | TODO | | | | |
| S01-T16 | Business area (frontend, new `/business` route group in the existing Next.js app, new folders only): login, OTP login, reset, MFA setup, org switcher | §3.9 | TODO | | | | |
| S01-T17 | Business area Team page: members, invitations, roles editor (grouped permissions with descriptions), branches | §3.9 | TODO | | | | |
| S01-T18 | Admin pages (frontend, new folders under `/admin/b2b`): orgs list/detail, user search, audit viewer, view-as button | §3.10 | TODO | | | | Sidebar link = flagged edit E3 (owner approval) |
| S01-T19 | Mandatory test suite: authorization matrix (system roles × scopes), permission coverage, tenant isolation for every new collection, token rotation, OTP caps, view-as read-only | §9 | TODO | | | | |
| S01-T20 | CAPTCHA on login / OTP after repeated failures | §8 | TODO | | | | Needs an outside service (e.g. Cloudflare Turnstile) — owner decision pending; rate limits + lockout cover it until then |

## Definition of Done (from the stage file)

- [ ] Client owner invites an agent, creates a custom role "Junior Agent" (search + book only), limits them to one branch; agent can't see other branches or orgs (tests prove)
- [ ] Hotel owner adds front-desk staff limited to one property
- [ ] Admin logs in with MFA, sees all orgs, uses view-as (read-only, audited)
- [ ] Every `/api/v1` route has a permission (CI)

## Mandatory tests (from the stage file)

- [ ] Authorization matrix (system roles × scopes)
- [ ] Permission coverage (every route declares one)
- [ ] Tenant isolation for every new collection
- [ ] Token rotation (reuse of an old refresh token revokes the family)
- [ ] OTP caps
- [ ] View-as read-only enforcement
