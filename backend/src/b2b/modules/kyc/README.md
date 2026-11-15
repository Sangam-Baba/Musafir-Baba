# Module: `kyc`

| | |
| --- | --- |
| **Collections (prefix)** | `kyc_applications`, `kyc_document_sets` (`kyc_`) |
| **Introduced** | Stage 02 (S02-T04 … T09) |
| **Public interface** | `index.js` only |

## Purpose

Verification of organisations (hotels in Stage 02, B2B clients in Stage 10): business details, GSTIN/PAN checks, document sets per org type (configuration), application state machine, review queue with a second approver for high risk.

Never stores files itself (files module) and never activates an org directly — approval is an event the organizations module reacts to.

Rules: `src/b2b/AGENTS.md`; plan: `docs/plan/stages/stage-02-hotel-onboarding-kyc.md`; decisions D29–D31 in `docs/plan/09-decisions-and-risks.md`.
