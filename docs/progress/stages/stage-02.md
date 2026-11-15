# Stage 02 — Hotel onboarding & KYC (+ notifications) · Progress

> Task list from `docs/plan/stages/stage-02-hotel-onboarding-kyc.md` §3, split so each task fits one reviewable change. Rules and status values: `docs/progress/README.md`.

| | |
| --- | --- |
| **Status** | NOT_STARTED |
| **Phase · Track** | A · hotels |
| **Owner(s)** | |
| **Started** | 2026-11-15 |
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
| S02-T01 | Stage setup: `files`, `kyc`, `notifications` module skeletons (permissions, events, README) | §3 | DONE | AI (Claude) | | matrix ✅ | `files`, `kyc`, `notifications` modules (README, permissions, events, index) in the catalogue. KYC permissions: `kyc.application.read`, `kyc.application.submit` (**sensitive** — bank details: Owner only by default), `platform.kyc.read / review / approve` (Operations gets all three; Support sees the queue only). New event `organizations.org.activated`. Matrix test extended |
| S02-T02 | `files`: storage port (local disk / existing R2 private folder), encryption at rest, upload through the backend with content checks (type, size, PDF safety) | §3.4, D29, D30 | DONE | AI (Claude) | | 14 ✅ | `file_files` (migration `0018`). Content checks: type from magic bytes (PDF/PNG/JPEG), 10 MB, empty refused, PDFs with JavaScript / launch / embedded files / rich media / XFA / form submission refused. Each file encrypted with its own AES-256-GCM key, sealed with `B2B_FILE_KEY` (falls back to `B2B_AUTH_SECRET`); random 48-hex storage names; sha256 checked on read. Stores: local disk (`~/.musafirbaba-b2b-files`, dev default) or the existing R2 bucket under `b2b-private/` via the existing `@aws-sdk/client-s3` (tested with a stand-in client — the real bucket is untouched). `POST /files?purpose=kyc-document` (raw body ≤ 10 MB, `kyc.application.submit`) |
| S02-T03 | `files`: signed 60-second download for authorised staff/owners, `file_access_log`, delete | §3.4 | DONE | AI (Claude) | | 4 ✅ | 60-second signed links (HMAC with the master key, own purpose — can't be forged, edited or reused later): `POST /files/:id/link` (org members with `kyc.application.read`), `POST /admin/files/:id/link {orgId}` (`platform.kyc.read`), `GET /files/download?t=` (the link is the permission; always `attachment`, `nosniff`, CSP `sandbox`). `file_access_log` (migration `0019`) records every link issued and every download (who, IP, when); `GET /admin/files/:id/access`. Deleting a document is done through KYC (S02-T06), which knows whether it is attached to a submitted application |
| S02-T04 | `kyc` domain: document sets per org type (configuration), GSTIN checksum + state code, PAN format, PAN inside GSTIN, PIN, unregistered-hotel path, risk flags | §3.2, §3.3, D31 | DONE | AI (Claude) | | 11 ✅ | Pure rules in `kyc/domain/`: GSTIN shape + state code + mod-36 check character (verified against 3 real published GSTINs; one-character typos caught), PAN format + holder type, PAN inside GSTIN = PAN, GSTIN state = address state, PIN, mobile/email; all problems reported at once (`KYC_DETAILS_INVALID`). Document sets are configuration per org type (`DOCUMENT_SETS`; hotels without GST give a below-threshold declaration instead of the GST certificate — D31); a dummy second org type works through configuration only (Definition of Done item). Risk flags → second approver: `GST_UNREGISTERED`, `DUPLICATE_GSTIN`, `PERSONAL_PAN_FOR_BUSINESS` |
| S02-T05 | Hotel registration: `POST /registrations/hotel` (user + org ONBOARDING + KYC application), email verification link, duplicate GSTIN flag | §3.1 | DONE | AI (Claude) | | 7 ✅ | One public form (`X-B2B-Auth`, 10/hour per IP, strict input): details checked by the S02-T04 rules → owner account (or the signed-in user adds another hotel; an existing email must sign in first — `ACCOUNT_EXISTS_SIGN_IN`) → hotel org `ONBOARDING` → draft `kyc_applications` row with risk flags (`DUPLICATE_GSTIN` → second approver) → signed-in session (`registration` method). No transaction: every step is repeat-safe and `ensureApplication` creates a missing draft later. Verification link `musafirbaba.com/business/verify-email#token=…` (signed, 48h, sealed email job). The login account carries no phone (a shared front-desk number must not block sign-ups; it stays in the KYC details). Refused during view-as. `GET /kyc` needs `kyc.application.read` (Owner). Migration `0020-kyc-applications` |
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
- [x] KYC engine accepts a second org type through configuration only (test with a dummy type)

## Mandatory tests (from the stage file)

- [ ] Upload safety
- [ ] KYC state machine (all transitions)
- [ ] Maker–checker
- [ ] Idempotent submit
- [x] Document set per org type
- [ ] Notifications suite (inbox idempotency, catch-up, room security)
- [ ] Isolation tests
