# Module: `files`

| | |
| --- | --- |
| **Collections (prefix)** | `file_files`, `file_access_log` (`file_`) |
| **Introduced** | Stage 02 (S02-T02, T03) |
| **Public interface** | `index.js` only |

## Purpose

Private document storage for the B2B system: content checks on upload (D30), **encryption before storage** (D29 — the existing R2 bucket, private folder, or local disk in development), signed short-lived downloads, access log.

Decides nothing about *who* may see a file — the owning module (kyc, …) checks that and asks files for the bytes.

Rules: `src/b2b/AGENTS.md`; plan: `docs/plan/stages/stage-02-hotel-onboarding-kyc.md`; decisions D29–D31 in `docs/plan/09-decisions-and-risks.md`.
