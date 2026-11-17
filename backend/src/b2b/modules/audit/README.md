# Module: `audit`

| | |
| --- | --- |
| **Collections (prefix)** | `aud_events` (`aud_`) |
| **Introduced** | Stage 01 (S01-T13) |
| **Public interface** | `index.js` only |
| **Permissions / events** | `permissions.js`, `events.js` |

## Purpose

Append-only activity log (`aud_events`) written from events: logins, member and role changes, view-as sessions, org status changes; read API for org owners and admins.

Never uses the existing `AuditLog` model or its global plugin.

Rules: `src/b2b/AGENTS.md`; plan: `docs/plan/stages/stage-01-orgs-users-roles.md`.
