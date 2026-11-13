# Module: `identity`

| | |
| --- | --- |
| **Collections (prefix)** | `id_users`, `id_sessions`, `id_otp_codes`, `id_mfa`, `id_staff_mfa`, `id_view_as` (`id_`) |
| **Introduced** | Stage 01 (S01-T03 … T07, T12, T14, T15) |
| **Public interface** | `index.js` only |
| **Permissions / events** | `permissions.js`, `events.js` |

## Purpose

Business users (B2B clients' and hotels' team members): accounts, passwords, email OTP, MFA, sessions with rotating refresh tokens, step-up, view-as sessions. Also verifies the existing website-customer and admin tokens **read-only** for `/api/v1`.

Does **not** manage website customers (`users`) or admins (`staffs`) — those stay in the existing app; `legacy-read/` is used to check them.

Rules: `src/b2b/AGENTS.md`; plan: `docs/plan/stages/stage-01-orgs-users-roles.md`.
