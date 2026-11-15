# Stage 02 — Hotel onboarding & KYC (+ notifications) · Progress

> Task list from `docs/plan/stages/stage-02-hotel-onboarding-kyc.md` §3, split so each task fits one reviewable change. Rules and status values: `docs/progress/README.md`.

| | |
| --- | --- |
| **Status** | NOT_STARTED |
| **Phase · Track** | A · hotels |
| **Owner(s)** | |
| **Started** | — |
| **Finished** | — |
| **Plan file** | `docs/plan/stages/stage-02-hotel-onboarding-kyc.md` |
| **Depends on** | Stage 01 (awaiting owner sign-off) |
| **Modules** | `files`, `kyc`, `notifications` (new) · `organizations`, `identity`, `audit` |

## Owner decisions for this stage (15 Nov 2026)

| Topic | Decision |
| --- | --- |
| KYC document storage (D29) | Existing R2 bucket, private folder `b2b-private/`; **every file encrypted before upload** (AES-256-GCM), random names, read back only through the backend (60 s signed links, access logged). Local dev: files on disk (`B2B_FILE_STORAGE=local`) |
| Upload checks (D30) | No separate virus scanner: content-based type check (PDF/JPG/PNG), size limit, PDFs with scripts / launch actions / embedded files refused; files stay encrypted and private |
| Unregistered hotels (D31) | Allowed with PAN + below-threshold declaration; higher risk → second approver; tax treatment confirmed with the CA before Stage 05 |
| New settings (B5) | `B2B_FILE_STORAGE` (`local` default / `r2`), `B2B_FILE_KEY` (encryption key), `B2B_FILE_DIR` (local path); reads the existing `R2_*` variables in production |

## Tasks

| ID | Task | Plan ref | Status | Owner | PR | Tests | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S02-T01 | Stage setup: `files`, `kyc`, `notifications` module skeletons (permissions, events, README) | §3 | TODO | | | | |
| S02-T02 | `files`: storage port (local disk / existing R2 private folder), encryption at rest, upload through the backend with content checks (type, size, PDF safety) | §3.4, D29, D30 | TODO | | | | |
| S02-T03 | `files`: signed 60-second download for authorised staff/owners, `file_access_log`, delete | §3.4 | TODO | | | | |
| S02-T04 | `kyc` domain: document sets per org type (configuration), GSTIN checksum + state code, PAN format, PAN inside GSTIN, PIN, unregistered-hotel path, risk flags | §3.2, §3.3, D31 | TODO | | | | |
| S02-T05 | Hotel registration: `POST /registrations/hotel` (user + org ONBOARDING + KYC application), email verification link, duplicate GSTIN flag | §3.1 | TODO | | | | |
| S02-T06 | KYC application: save details, attach documents, submit (idempotent), state machine Pending → Under review → Approved / Rejected → Resubmitted | §3.5, §3.6 | TODO | | | | |
| S02-T07 | Sensitive fields encrypted per field (PAN, bank account) and masked (last 4) | §3.3 | TODO | | | | |
| S02-T08 | Admin KYC review: queue (filters), take for review (30-min lock), per-document verdicts, decision with notes, second approver for high risk | §3.6, §3.9 | TODO | | | | |
| S02-T09 | Approval / rejection effects: org ACTIVE + `organizations.org.activated`, owner notified; reasons per document, resubmission | §3.7 | TODO | | | | |
| S02-T10 | `notifications`: `ntf_inbox` from events (idempotent), bell API (list, unread count, read, acknowledge), live push over SSE, preferences, email templates | §3.8 | TODO | | | | |
| S02-T11 | Retention jobs: remind abandoned registrations at 30 days, purge at 90 days | §3.10 | TODO | | | | |
| S02-T12 | Business area: hotel registration wizard (details → documents → submit) and status page | §3.1, §3.5 | TODO | | | | |
| S02-T13 | Admin pages: KYC queue and review screen (documents beside typed data, GSTIN/PAN cross-check highlights) | §3.9 | TODO | | | | |
| S02-T14 | Notification bell in the business area and B2B admin | §3.8 | TODO | | | | |
| S02-T15 | Mandatory test suite: upload safety, KYC state machine, maker–checker, idempotent submit, document set per org type, notifications, isolation | §9 | TODO | | | | |

## Definition of Done (from the stage file)

- [ ] Hotel registers → uploads → admin approves → owner sets password → can start a listing
- [ ] Rejected hotel sees reasons, resubmits, gets approved
- [ ] Sensitive fields encrypted and masked; file access logged
- [ ] KYC notifications arrive live in the bell and by email; catch-up works with the signal reader stopped
- [ ] KYC engine accepts a second org type through configuration only (test with a dummy type)

## Mandatory tests (from the stage file)

- [ ] Upload safety
- [ ] KYC state machine (all transitions)
- [ ] Maker–checker
- [ ] Idempotent submit
- [ ] Document set per org type
- [ ] Notifications suite (inbox idempotency, catch-up, room security)
- [ ] Isolation tests
