# Module: `organizations`

| | |
| --- | --- |
| **Collections (prefix)** | `org_organizations`, `org_branches`, `org_members`, `org_invitations` (`org_`) |
| **Introduced** | Stage 01 (S01-T08, T09, T14) |
| **Public interface** | `index.js` only |
| **Permissions / events** | `permissions.js`, `events.js` |

## Purpose

Organisations (`PLATFORM`, `CLIENT`, `HOTEL`), branches, members (one user may belong to several orgs) and invitations.

Does **not** do registration or KYC (Stage 02 hotels, Stage 10 clients).

Rules: `src/b2b/AGENTS.md`; plan: `docs/plan/stages/stage-01-orgs-users-roles.md`.
