# Stage 10 — B2B Client Onboarding & KYC

| | |
| --- | --- |
| **Phase** | B — B2B clients |
| **Duration** | ~1.5 weeks (reuses the Stage 02 KYC engine and Stage 01 teams/roles) |
| **Depends on** | Stages 01, 02 (Phase A complete for the pilot) |
| **Modules** | `organizations`, `kyc`, `files`, `notifications` (all existing — configuration + client screens) |
| **Apps** | Business area `/client` (registration wizard, status, team), `admin` (KYC queue, client categories) |

## 1. Goal

A travel company (B2B client) registers, uploads KYC, is verified by MusafirBaba from the admin panel, and gets a working client account where the owner can **create their own users and roles** (Stage 01 capabilities, now in the `/client` workspace).

## 2. Scope

**In:** client registration wizard, client document set (configuration of the generic KYC engine), client categories (tiers used by pricing), client approval side effects, client team management screens (members, invitations, custom roles, branches), admin client management.
**Out:** wallet and credit (Stage 11), search/booking in the dashboard (Stage 12), plans and billing (Stage 13 — a default plan record is created on approval), API keys (Stage 14).

## 3. Work breakdown

1. **Step 1 — Business details (client)**: company name, contact person, mobile (stored, not OTP-verified — D26; checked by the reviewer), email (verification link), GSTIN, PAN, address, city, state, PIN, company type. Creates org (`CLIENT`, `ONBOARDING`) + KYC application (`DRAFT`) + owner user + member. Same validation as Stage 02 (GSTIN/PAN checksum and cross-checks, duplicate GSTIN flagged — may become a branch of an existing client, never auto-merged).
2. **Client document set** (KYC configuration, no engine change): GST certificate, PAN card, company registration, address proof, cancelled cheque + bank details. PAN/bank fields encrypted, last 4 shown.
3. **Status page + resubmission**: same component as Stage 02.
4. **Client categories** (admin CRUD): e.g. Standard, Silver, Gold — used by margin rules (Stage 05) and plans (Stage 13).
5. **On approval** (event listeners on `organizations.org.activated` for `CLIENT`): org → `ACTIVE`; owner gets "set your password" link; client category assigned; default plan record (Stage 13 makes it billable); wallet accounts opened when Stage 11 is live; welcome notification (in-app + email).
6. **Client workspace shell**: `/client` navigation, dashboard home (KYC status, quick links), **Team** (members, invitations, roles editor with grouped permissions, branches — from Stage 01 services), notifications bell.
7. **Admin**: clients list (status, category, KYC, created), client detail (members, roles, KYC history, status changes, suspend/reactivate), "view as client" (Stage 01).

## 4. Collections

`kyc_document_sets` (+ `CLIENT` entry), `org_client_categories`; everything else from Stages 01–02.

## 5. API

`POST /registrations/client`, `POST /registrations/{id}/verify-email`, `GET/PUT /kyc`, `POST /kyc/submit`; team endpoints from Stage 01; admin: `/admin/orgs?type=CLIENT`, `/admin/client-categories`, KYC endpoints from Stage 02.

## 6. Rules & edge cases

- Last owner of a client org can't be removed or downgraded.
- Branch-limited users only see their branches' data (enforced from Stage 12 when bookings exist).
- Suspended client → sessions revoked, bookings blocked; existing bookings unaffected.

## 7. Security

Same controls as Stage 02 §8 (bots, malicious files, KYC data, insider approval, template injection) plus Stage 01 role controls (custom roles can't include sensitive/platform permissions).

## 8. Mandatory tests

Client KYC through the generic engine (no engine code changed); client category assignment; approval listeners idempotent; team/roles isolation between client orgs; view-as read-only.

## 9. Definition of Done

- [ ] Client registers → uploads → admin approves → owner sets password → logs in to the `/client` workspace
- [ ] Owner invites an agent, creates a custom role ("Junior Agent": search + book only), limits them to one branch
- [ ] Admin sees and manages every client; view-as works read-only with audit
- [ ] No change to the KYC engine code was needed (configuration only)

## 10. AI editor prompt

```
Read: AGENTS.md, 10-coding-standards.md, stage-02 (KYC engine), stage-01 (teams/roles), this stage.
Task: client registration wizard + CLIENT document set configuration + approval listeners + client workspace shell with Team pages.
Constraints: no changes to modules/kyc engine logic; configuration and new screens only.
Tests first: client KYC end to end via configuration; approval listeners idempotent; client A can't see client B's team.
```
