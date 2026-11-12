# Stage 02 — Hotel Onboarding & KYC (+ notifications foundation)

| | |
| --- | --- |
| **Phase** | A — hotels + website (working system) |
| **Duration** | ~2.5 weeks (incl. notifications foundation with in-app bell) |
| **Depends on** | Stage 01 |
| **Modules** | `organizations`, `kyc`, `files`, `notifications`, `audit` |
| **Apps** | Business area `/hotel` (registration wizard, status page), `admin` (KYC queue) |
| **Closes** | D15 (retention, preliminary), D20 (unregistered hotels — with CA), D25 sender setup |

## 1. Goal

A hotel registers itself, uploads KYC documents, and becomes active only after MusafirBaba verifies it from the admin panel: **Pending → Under Review → Approved / Rejected (resubmit)**. The KYC engine is built **generic by org type**, so B2B clients reuse it unchanged in Stage 10.

## 2. Scope

**In:** hotel registration wizard, GSTIN/PAN checks, secure uploads, generic KYC review workflow with maker–checker for high risk, approval side effects, notifications foundation (self-hosted in-app + realtime, email via `EmailPort` — D25; no WhatsApp/SMS), resubmission, admin queue, retention jobs.
**Out:** B2B client registration and its document set (Stage 10), listings (Stage 03).

## 3. Work breakdown

1. **Step 1 — Business details (hotel)**: legal entity name, contact person, mobile (stored, not OTP-verified in v1 — D26; checked by the reviewer), email (verification link), **GST registered? (yes/no)**, GSTIN (if registered), PAN, address, number of properties, commercial terms acceptance (net-rate contract). Unregistered hotels can register but stay flagged high-risk and not sellable until the CA answers D20. Creates org (`HOTEL`, `ONBOARDING`) + KYC application (`DRAFT`) + owner user + member (owner can use the onboarding area only until approved).
2. **Validation**: GSTIN format + checksum; GSTIN state code = selected state; PAN format; PAN inside GSTIN = PAN; PIN format; duplicate GSTIN flagged to reviewer. Optional GST verification API behind an adapter (off by default).
3. **Step 2 — Documents** (via `files`): GST certificate (if registered), PAN, trade licence/registration, cancelled cheque + bank details, signed contract (upload; e-sign later). PAN and bank account number stored **encrypted** (field-level), only last 4 shown. **Document sets are configuration per org type** (`HOTEL` now, `CLIENT` added in Stage 10).
4. **files module**: presigned upload → quarantine → virus scan + magic bytes + image re-encode → clean; signed download (60 s) for reviewers only; access log.
5. **Step 3 — Status page**: timeline, rejection reasons per document, resubmit.
6. **KYC workflow** (`kyc`, generic): reviewer takes an application from the queue (locked for 30 min), checks each document (verified / mismatch / unreadable), decides with notes; **high risk** (name mismatch, GST inactive/unregistered, duplicate GSTIN) needs a second approver.
7. **On approval** (events): org → `ACTIVE`; owner gets a "set your password" link (never email passwords); hotel can start listing (Stage 03). Event `organizations.org.activated` is generic — Stage 10/11 add listeners for clients.
8. **notifications foundation** (contract: `11-notifications-and-realtime.md`, all self-hosted): **in-app inbox** (`ntf_inbox`, written from outbox events, idempotent); **live push** via the self-hosted Socket.IO `realtime` server to `b2b:user:{id}` / `b2b:org:{id}` / `b2b:admin:{queue}`; catch-up API, unread count, acknowledge; preferences (critical categories locked); **bell UI** in the business area and admin with toast, sound, connection-status indicator and the `useRealtime` hook; **email** templates (versioned, variables schema), delivery log and retries through `EmailPort` (D25), admin template editor with preview/test send; escalation job framework (`ntf_escalations`). **No WhatsApp/SMS** (DEF-016). First users: hotel KYC submitted/approved/rejected and team invitations.
9. **Admin**: KYC queue (filters: org type, status, age, risk), review screen (documents side by side with typed data, GSTIN/PAN cross-check highlights), decision dialog, history.
10. **Retention jobs**: abandoned registrations reminded at 30 days, purged at 90 days (configurable).

## 4. Collections

`kyc_applications`, `kyc_document_sets` (per org type), `file_files`, `file_access_log`, `ntf_email_templates`, `ntf_email_messages`, `ntf_email_attempts`, `ntf_inbox`, `ntf_preferences`, `ntf_escalations`.

## 5. API

`POST /registrations/hotel`, `POST /registrations/{id}/verify-email`, `POST /files/upload-url`, `POST /files/{id}/complete`, `GET/PUT /kyc`, `POST /kyc/submit`; notifications endpoints (`06-api-and-events.md` §3.4a); admin: `GET /admin/kyc-applications`, `POST /admin/kyc-applications/{id}/assign`, `POST /{id}/decision`, `GET /admin/files/{id}/download-url`.

## 6. Events

`organizations.org.registered`, `kyc.application.submitted|approved|rejected|resubmitted`, `organizations.org.activated`, `files.file.clean|rejected`.

## 7. Rules & edge cases

- Bank details change after approval → re-verification + step-up MFA + email to owner; hotel payouts held 72 h.
- Same GSTIN registering twice → flagged; may become an additional property of the existing hotel org (admin decision), never auto-merged.
- All messages via templates; no hand-written emails in code.

## 8. Security

| Threat | Control | Test |
| --- | --- | --- |
| Bot/fake registrations | CAPTCHA, email verification, IP rate limits, KYC review | Automation blocked |
| Malicious files | Quarantine, AV, magic bytes, re-encode, no SVG | EICAR, polyglot, SVG tests |
| KYC data leak | Field encryption, masking, `kyc.viewSensitive`, 60 s URLs, access log | Unauthorised role → masked/404 |
| Insider approval fraud | Maker–checker for high risk; reviewer can't approve own org | Tests |
| Template injection | Escaped variables, schema-validated | HTML in company name test |

## 9. Mandatory tests

Upload safety; KYC state machine (all transitions); maker–checker; idempotent submit; document set per org type; notifications suite (`11-…` §15: inbox idempotency, catch-up, room security); isolation tests.

## 10. Definition of Done

- [ ] Hotel registers → uploads → admin approves → owner sets password → can start a listing
- [ ] Rejected hotel sees reasons, resubmits, gets approved
- [ ] Sensitive fields encrypted and masked; file access logged
- [ ] KYC notifications arrive live in the bell and by email; catch-up works with the realtime process stopped
- [ ] KYC engine accepts a second org type through configuration only (test with a dummy type)

## 11. AI editor prompt

```
Read: AGENTS.md, 10-coding-standards.md, 03-security-baseline.md §6 & §8, this stage, docs/modules/kyc.md.
Task: §3.6 — generic KYC workflow: queue assignment lock (30 min), per-document review, decision with notes, high-risk second approver, events.
Constraints: modules/kyc only; document sets from configuration per org type.
Tests first: state machine table; second approver required when riskLevel=HIGH; reviewer cannot approve own org; lock expiry releases application; events in outbox.
```

## 12. Note

Email uses the existing Resend account through the new `EmailPort` adapter (D25): add the business sender identity (verified subdomain) and SPF/DKIM records in week 1. No WhatsApp/SMS templates are needed (D26).
