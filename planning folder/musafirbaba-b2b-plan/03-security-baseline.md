# 03 — Security Baseline

> Strong where it matters (accounts, tenancy, money, inventory, KYC data, API keys), proportionate everywhere else.
> Target: OWASP ASVS Level 2 overall; OWASP API Security Top 10 (2023) covered. Every stage file adds its own threats and tests.

---

## 1. Threat model

| Asset | Main threats | Controls |
| --- | --- | --- |
| Admin accounts | Takeover → control of all clients/hotels | Mandatory MFA (TOTP; passkeys optional), short sessions, step-up for sensitive actions, IP allow-list option, alerts on new device |
| Client/hotel accounts | Credential stuffing, phishing, session theft | bcrypt/argon2 hashing, breached-password check, rate limits, OTP, optional MFA (enforceable per org), session list & revoke |
| Tenant data | One client/hotel seeing another's data (BOLA/IDOR) | Tenant guard (repository + plugin), object-level checks, 404 for foreign ids, automated isolation tests |
| Inventory | Double booking via races, hold exhaustion | Atomic conditional updates in transactions, DB validator, per-org hold caps, rate limits (see `05-…`) |
| Wallet & payments | Tampered amounts, double spend, forged PayU callbacks, replay | Server-side prices, signed price tokens, idempotency, PayU response-hash verification, server-side status check with PayU's verify API, ledger checks, daily reconciliation |
| KYC data, PAN, bank details | Leak | Field-level encryption, private storage, short signed URLs, masked by default, access logged |
| API keys (Stage 14) | Leak, abuse, scraping | Hashed at rest, shown once, scopes, IP allow-list, rate limits, quotas, anomaly alerts, instant revoke |
| Webhooks to clients | SSRF, spoofing | URL validation + private-IP blocking after DNS resolution, no redirects, HMAC signatures with timestamp |
| Uploads | Malware, XSS via SVG | Type sniffing, virus scan, re-encode images, no SVG/Office/archives |
| Pricing & margins | Insider manipulation | Maker–checker approval, audit trail |
| MongoDB queries | **NoSQL injection** (`{ "$gt": "" }` in a login body) | zod strict validation, reject `$`/`.` keys, never pass raw request objects to queries (no global `sanitizeFilter` — see `02-…` §5) |

## 2. Authentication

| Control | Requirement |
| --- | --- |
| Password hashing | Keep existing bcrypt (cost ≥ 12) or move new accounts to **argon2id**; rehash on login |
| Password policy | Min 10–12 chars, block common/breached passwords, no forced composition rules |
| OTP | **Email OTP only in the new system** (no SMS provider — D26): 6 digits, 5 min expiry, single use, stored hashed, max 5 attempts, resend cool-down (30 s → 60 s → 5 min), daily caps per email and IP |
| MFA | TOTP **mandatory** for `Staff` users who get the new B2B/hotel admin permissions (roll out with an enrolment window — the `Staff` model also holds attendance/sales staff); optional for clients/hotels, enforceable by org owner; recovery codes (hashed) |
| Login protection | Generic errors, progressive delay, lock after 10 failures/hour (email notice), CAPTCHA after 3 failures from one IP |
| Sessions (portals) | httpOnly Secure SameSite cookie; server-side session or short JWT (15 min) + rotating refresh token with reuse detection; idle timeout 30 min (admin 15 min); "log out all devices" |
| Step-up | Re-enter MFA/password within 5 min for: bank details change, API key creation, role changes, payout approval, margin/plan changes, data export |
| Account recovery | Single-use email link (30 min); notify on password/email/phone change |

## 3. Authorization

- **Default deny.** Every route declares a permission (`requirePermission('hotel.booking.create')`); a CI test fails if any `/api/v1` route lacks one (or an explicit, reviewed `public()`).
- **RBAC + scope:** permission × scope (`OWN` records, `BRANCH`, `ORG`, `PLATFORM`).
- **Object-level checks** after loading every document.
- **Field-level:** net rates, margins, KYC fields, bank details hidden unless the permission allows.
- **Maker–checker** for: margin rules, plan prices, manual wallet credits/debits, credit limits, refunds above threshold, hotel payouts, high-risk KYC approvals.
- **Admin "view as client/hotel"**: needs permission + reason; read-only by default; 30 min; banner shown; every action audited; org owner notified.

## 4. Tenant isolation

See `01-architecture.md` §6. Plus:
- Cache keys always include `orgId` (or pricing context) when data differs per tenant.
- File paths in storage namespaced by org; checked when generating signed URLs.
- Realtime (self-hosted Socket.IO): `availability:property:*` carries only property id + dates; `b2b:user:*`/`b2b:org:*` carry only a notification id, category and short title (details fetched over the API with permission checks); connections need a short-lived realtime token and the **server** decides which rooms a socket joins (`11-notifications-and-realtime.md` §5).

## 5. API hardening (Express)

| Area | Control |
| --- | --- |
| Headers | `helmet` (HSTS, nosniff, frameguard, referrer policy), CSP on Next.js apps |
| CORS | Allow-list of first-party origins only; server-to-server API needs none |
| CSRF | SameSite cookies + CSRF token on cookie-authenticated mutations |
| Body | `express.json({ limit: '1mb' })`; uploads via presigned URLs |
| Validation | zod `.strict()`; reject `$`/`.` keys (no global `sanitizeFilter`) |
| Mass assignment | Map validated DTO → domain explicitly; never `Model.create(req.body)` |
| Rate limiting | Redis token buckets per IP, user, API key, org; stricter on login/OTP/search/booking; `429` + `Retry-After` |
| Resource limits | Pagination caps, query timeouts (`maxTimeMS`), max nights/rooms, max concurrent holds per org |
| Enumeration | Random public references; same 404 for "not yours" and "doesn't exist" |
| SSRF | Tenant-provided URLs (webhooks) only via a guarded HTTP client (resolve DNS → block private, loopback, link-local, metadata ranges; HTTPS only; no redirects) |
| ReDoS | No user input in `new RegExp()` without escaping; search uses prefix indexes/Atlas Search |

## 6. Data protection

| Class | Examples | Storage | Access |
| --- | --- | --- | --- |
| Secret | Passwords, OTPs, API key secrets, refresh tokens | Hashed | Never readable |
| Restricted | PAN, bank account, KYC files | **Field-level encryption** (AES-256-GCM with keys from KMS/secret manager, or MongoDB CSFLE/Queryable Encryption if on Atlas); private bucket | `kyc.viewSensitive`; masked by default; access logged |
| Confidential | Guest names/phones/emails, bookings, net rates, contracts | Encrypted at rest (Atlas default) + TLS | Tenant + permission scoped |
| Internal | Hotel content, rate plans | Standard | Role scoped |

- TLS everywhere (Mongo connections too). No production data in staging.
- **Do not collect Aadhaar.** Collect guest ID only if a hotel legally needs it, then encrypt.
- Data subject requests (access/correction/erasure) via an admin workflow, audited.

## 7. Payments & money

- Hosted PayU checkout → card data never touches our servers.
- **Amount always computed on the server** from the order; client never sends an amount.
- PayU callbacks/webhooks: verify the response hash (reverse SHA-512 with the merchant salt) in constant time, check amount and `txnid` against our intent, dedupe by `txnid` + status, and confirm the status with PayU's verify payment API before acting.
- Browser redirect/callback is never the source of truth.
- Wallet balance can't go below its floor (0, or −credit limit) — enforced in the conditional update.
- Manual money actions → maker–checker + step-up + audit. Daily reconciliation; mismatches alert finance.

## 8. Files

1. Presigned upload to a private "quarantine" prefix (type + size limits, 5 min expiry).
2. Worker: magic-byte check, virus scan (ClamAV), image re-encode (strips EXIF/GPS), PDF check.
3. Clean → final location; infected → deleted + security event.
4. Downloads via signed URLs (60 s for KYC, longer for public hotel photos via CDN).
5. Allowed: JPEG, PNG, WebP, PDF only.

## 9. Audit & monitoring

- Append-only audit records (existing `AuditLog` or `aud_events`): actor, org, action, target, before/after (sensitive fields masked), IP, user agent, time. App user has no update/delete rights on the audit collection (separate DB user/role).
- Security events: logins, failures, MFA changes, role changes, view-as, KYC access, exports, API key lifecycle, payout approvals, rate-limit blocks.
- Alerts: bursts of 404/403 per actor (probing), OTP send spikes, new-country API key use, large margin changes, reconciliation failures.
- **Log retention ≥ 180 days stored in India** (CERT-In); personal-data processing logs ≥ 1 year (DPDP Rules) — use the longer period.

## 10. Infrastructure

- Atlas (or self-hosted) with IP access list/VPC peering, no public open Mongo port; separate DB users per app role (app, worker, migrator, reporting read-only).
- Redis with TLS + auth, private network.
- Secrets in a secret manager; rotated (DB passwords 90 days, JWT keys 90 days).
- Backups: continuous (Atlas PITR) + daily snapshots; **restore tested monthly**.
- Dependency audit + `gitleaks` + Semgrep/CodeQL in CI; container image scan if containerised.
- Servers synced to NTP traceable to NIC/NPL (CERT-In).

## 11. Incident response

- Runbook: detect → triage → contain → fix → recover → post-mortem.
- **CERT-In:** report listed cyber incidents within **6 hours** of noticing; named point of contact.
- **DPDP:** report personal data breaches to the Data Protection Board and affected people without delay, detailed report within 72 hours (duties start 12 May 2027 — build the process now).
- Tabletop exercise before public launch.

## 12. Compliance register (confirm with a CA / lawyer — questions in `09-…` §3)

| Area | What it means for engineering | Owner |
| --- | --- | --- |
| CERT-In Directions (2022) | 6-h incident reporting, 180-day logs in India, NTP sync | Tech lead |
| DPDP Act 2023 + Rules (notified 13 Nov 2025, most duties from 12 May 2027) | Notice & consent, purpose limits, safeguards, breach notices, data principal rights, log retention ≥ 1 year | Legal + tech |
| GST | Per-night slabs, SAC 996311, place of supply = property state, invoice ≤ 16-char serials, credit notes | Finance + CA |
| Wallet (RBI) | Closed, non-transferable balance usable only for MusafirBaba services; refunds to source | Finance + lawyer |
| Payments | PayU handles card compliance; we store no card data | Finance |

## 13. Per-PR security checklist

- [ ] Every new route: permission + object-level check + rate limit
- [ ] Tenant isolation tests for new collections/endpoints
- [ ] zod `.strict()` validation, size limits, no raw request objects in queries
- [ ] Sensitive fields classified and protected; nothing sensitive in logs/URLs/errors
- [ ] Security/audit events for privileged actions
- [ ] Abuse cases considered: replay, race, enumeration, automation
