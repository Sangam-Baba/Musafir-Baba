# Module: `notifications`

| | |
| --- | --- |
| **Collections (prefix)** | `ntf_inbox`, `ntf_preferences`, `ntf_email_templates`, `ntf_email_messages`, `ntf_escalations` (`ntf_`) |
| **Introduced** | Stage 02 (S02-T10, T14) |
| **Public interface** | `index.js` only |

## Purpose

In-app notifications (the bell) written from events, live pushes over the SSE stream, email through the `EmailPort`, preferences, escalations.

Never touches the existing app's notification code (Ably / Expo).

Rules: `src/b2b/AGENTS.md`; plan: `docs/plan/stages/stage-02-hotel-onboarding-kyc.md`; decisions D29–D31 in `docs/plan/09-decisions-and-risks.md`.
