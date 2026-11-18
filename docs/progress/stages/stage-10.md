# Stage 10 — B2B client onboarding & KYC · Progress

> Task list from `docs/plan/stages/stage-10-client-onboarding-kyc.md` §3, split so each task fits one reviewable change. Built right after Stage 06 (D36). Rules and status values: `docs/progress/README.md`.

| | |
| --- | --- |
| **Status** | IN_PROGRESS |
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
| S10-T03 | `POST /registrations/client` and `PUT /kyc` details for clients (owner account, org `CLIENT` ONBOARDING, draft application, email link) | §3.1, §5 | TODO | | | | |
| S10-T04 | Client categories `org_client_categories` (admin list, seeded Standard / Silver / Gold) + a client's category (admin sets it); search uses it for B2B prices and visibility | §3.4 | TODO | | | | |
| S10-T05 | On approval for clients: category Standard, welcome notification (repeat-safe); plan record → Stage 13, wallet → Stage 11 | §3.5 | TODO | | | | |
| S10-T06 | Admin: clients list and client detail (category, members, KYC history, suspend / reactivate, view as client) | §3.7 | TODO | | | | |
| S10-T07 | Business area for clients: registration wizard (client), menu and home by organisation type, verification page (client documents), team pages (existing) | §3.3, §3.6 | TODO | | | | |
| S10-T08 | Mandatory test suite: client KYC through configuration only, category assignment, approval listeners repeat-safe, team / role isolation between client orgs, view-as read-only | §8 | TODO | | | | |

Status: `TODO` · `DOING` · `REVIEW` · `DONE` · `BLOCKED` · `DEFERRED` (needs a `DEF-…` row) · `DROPPED` (reason in Notes)

## Definition of Done (copied from the stage file)

- [ ] Client registers → uploads → admin approves → owner sets password → logs in to the `/client` workspace
- [ ] Owner invites an agent, creates a custom role ("Junior Agent": search + book only), limits them to one branch
- [ ] Admin sees and manages every client; view-as works read-only with audit
- [ ] No change to the KYC engine code was needed (configuration only)

## Mandatory tests (copied from the stage file)

- [ ] Client KYC through the generic engine (no engine code changed)
- [ ] Client category assignment
- [ ] Approval listeners idempotent
- [ ] Team/roles isolation between client orgs
- [ ] View-as read-only
