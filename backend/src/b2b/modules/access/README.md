# Module: `access`

| | |
| --- | --- |
| **Collections (prefix)** | `acl_permissions`, `acl_roles`, `acl_assignments`, `acl_staff_roles` (`acl_`) |
| **Introduced** | Stage 01 (S01-T02, T10, T11, T14) |
| **Public interface** | `index.js` only |
| **Permissions / events** | `permissions.js`, `events.js` |

## Purpose

Permission catalogue (`acl_permissions`), system roles per org type, custom roles, role assignments with scope (`OWN` / `BRANCH` / `ORG` / properties), the authorizer `authz.assert()` and the member-permission cache.

Never imports feature modules: the catalogue is passed in from `src/b2b/permission-catalogue.js`.

Rules: `src/b2b/AGENTS.md`; plan: `docs/plan/stages/stage-01-orgs-users-roles.md`.
