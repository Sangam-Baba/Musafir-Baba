# Stage 01 — Organisations, Users, Roles & Permissions

| | |
| --- | --- |
| **Phase** | A — hotels + website (working system) |
| **Duration** | ~2.5 weeks |
| **Depends on** | Stage 00 |
| **Modules** | `identity`, `organizations`, `access`, `audit` |
| **Apps** | Business area in the existing Next.js app (new: login, team), `admin` (orgs, users, view-as) |
| **Closes** | D1 (admin login) — D14 and D18 already decided |

## 1. Goal

Every company (client or hotel) has an org; its owner can create **their own users** and **roles with chosen permissions**; MusafirBaba admins can manage **every** org; nobody can see another company's data.

## 2. Scope

**In:** business users (login: email/phone + password, OTP login, forgot password, optional TOTP MFA), orgs (`PLATFORM`, `CLIENT`, `HOTEL`), branches (clients) and property limits (hotel staff), invitations, permission catalogue, system roles, custom roles, permission checks, tenant guard on all new collections, admin permissions on existing admin login + mandatory MFA, admin "view as", audit.
**Out:** hotel registration & KYC (Stage 02), client registration & KYC (Stage 10), API keys (Stage 14).

## 3. Work breakdown

1. **identity**: `id_users`, password hashing (bcrypt cost 12 or argon2id), login with email or phone + password, **email OTP** request/verify (hashed codes, caps — no SMS in v1, D26), forgot/reset, lockout, sessions with rotating refresh tokens + reuse detection, "log out all", optional TOTP + recovery codes, step-up endpoint.
2. **organizations**: `org_organizations`, `org_branches`, `org_members`, `org_invitations` (signed single-use links, 7-day expiry); users may belong to more than one org → org switcher.
3. **access**: each module declares permissions in `permissions.ts` → seeded into `acl_permissions`; system roles per org type; **custom roles**: owner picks permissions from those allowed for the org type (sensitive ones locked); assign roles to members with scope (`OWN` records, specific `BRANCH`es, whole `ORG`; hotel staff limited to specific properties).
4. **Authorizer**: `authz.assert(ctx, permission, resourceOwnership)` — pure function, cached member permissions (60 s, busted on role change events).
5. **Request pipeline**: real authentication → `RequestContext` → org status check → `requirePermission` → CI test that every `/api/v1` route has a permission.
6. **Admin access (D1)**: existing `Staff` admin login stays; add MFA (TOTP) — mandatory for staff who get the new B2B/hotel admin permissions, with an enrolment window (the `Staff` model also holds attendance/sales staff); map admin users to platform roles (Super Admin, Operations, Finance, Contracting/Hotels, Support); admin endpoints under `/api/v1/admin` accept only platform context.
7. **View as client/hotel**: permission `admin.viewAs`; reason required; read-only unless `admin.viewAs.write` + step-up; 30 min; banner; audit; org owner emailed.
8. **audit**: log auth events, member/role changes, view-as sessions, org status changes (use existing `AuditLog` if suitable, else `aud_events`).
9. **Business area** (new route group in the existing Next.js app, served on `business.musafirbaba.com` via `proxy.ts`, own session cookie): login, OTP login, reset, MFA setup, org switcher, Team page (members, invitations, roles editor with grouped permissions and descriptions, branches). Business users are new `id_users` accounts — website customers and their dashboards are untouched (D18).
10. **Admin**: orgs list (filter type/status), org detail (members, roles, status), user search, audit viewer, view-as button.

## 4. System roles

| Org type | Role | Can do (scope) |
| --- | --- | --- |
| Platform | Super Admin | Everything (max 2 people) |
| Platform | Operations | Clients, hotels, KYC, bookings, amendments |
| Platform | Finance | Wallets, payments, refunds (approve), payouts (approve), plans, reports |
| Platform | Hotels/Contracting | Listings approval, margins (propose), hotel support |
| Platform | Support | Read most things, view-as (read-only) |
| Client | Owner | Everything in own org incl. wallet, plan, API keys, roles |
| Client | Admin | Team, branches, all bookings |
| Client | Booking Agent | Search, book, cancel own/branch bookings |
| Client | Accountant | Wallet, invoices, statements, read bookings |
| Client | Viewer | Read bookings (branch) |
| Hotel | Owner | Everything for own properties incl. bank details and payouts |
| Hotel | Manager | Listings, rooms, rates, calendar, bookings (assigned properties) |
| Hotel | Front Desk | Bookings inbox, acknowledge, no-show (assigned properties) |

## 5. API

`/auth/*`, `/me`, `/orgs/switch`, CRUD `/members`, `/invitations`, `/roles`, `/branches`; admin: `/admin/orgs`, `/admin/users`, `/admin/view-as`, `/admin/audit`.

## 6. Events

`organizations.member.invited|joined|removed`, `access.role.changed|assigned|revoked`, `identity.user.locked`, `admin.viewAs.started|ended`.

## 7. Rules & edge cases

- Email lowercase-unique; phone E.164; changing either needs re-verification and notifies the old one.
- Last Owner of an org can't be removed or downgraded.
- Branch-limited users see only orders/bookings of their branches; property-limited hotel staff only their properties.
- Suspended org → all sessions revoked, API keys blocked, login shows reason.
- Custom roles can never include `platform.*` or sensitive permissions without admin approval.

## 8. Security

| Threat | Control | Test |
| --- | --- | --- |
| Credential stuffing | Rate limits (IP + account), progressive delay, CAPTCHA, lockout | Automated attempts blocked |
| OTP abuse (email OTP) | Caps per email/IP/day, cool-downs, hashed codes | Cap tests |
| Refresh token theft | Rotation + reuse detection → revoke family | Replay test |
| Privilege escalation via custom role | Allowed-permission list per org type; sensitive locked | Matrix test |
| Cross-org access | Tenant guard + 404 | Isolation suite |
| NoSQL injection on login | zod strict + `$`-key rejection | `{"email":{"$gt":""}}` test |
| View-as abuse | Reason, TTL, read-only, audit, notify | Tests |

## 9. Mandatory tests

Authorization matrix (system roles × scopes), permission coverage, tenant isolation for every new collection, token rotation, OTP caps, view-as read-only enforcement.

## 10. Definition of Done

- [ ] Client owner invites an agent, creates a custom role "Junior Agent" (search + book only), limits them to one branch; agent can't see other branches or orgs (tests prove)
- [ ] Hotel owner adds front-desk staff limited to one property
- [ ] Admin logs in with MFA, sees all orgs, uses view-as (read-only, audited)
- [ ] Every `/api/v1` route has a permission (CI)

## 11. AI editor prompt

```
Read: AGENTS.md, 01-architecture.md §5–6, 03-security-baseline.md §2–3, this stage.
Task: §3.3–3.4 — access module: permission manifest seeding, system roles, custom roles (allowed list per org type),
role assignment with scope (OWN/BRANCH/ORG/property), authz.assert(), 60s cache busted by events.
Constraints: modules/access only + route wiring. No UI.
Tests first: matrix test for system roles; custom role cannot include sensitive permission; branch-scoped agent denied other branch;
revoked role effective immediately.
```
