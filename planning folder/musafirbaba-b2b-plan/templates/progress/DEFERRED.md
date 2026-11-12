# Deferred — Things Left Out on Purpose

> Anything we decide **not** to build now is recorded here — never silently skipped. Each row says what, why, who decided, and when we come back to it.
> Pre-filled with the deferrals already decided in plan v2.1. Add new rows as `DEF-<next number>`; never renumber or delete rows (change the status instead).

| ID | What | Why it's deferred | Decided by · date | Revisit when | Risk if never done | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEF-001 | Channel-manager connection (AxisRooms / STAAH / eZee) | Allotment + stop-sell is enough for the pilot; certification takes time | Plan v2 · 2026-11-12 | After launch — Stage 17 P1 | Overbooking when hotels also sell on other OTAs | OPEN |
| DEF-002 | Bedbank adapter (TBO or similar) | Pilot uses self-listed hotels | Plan v2 · 2026-11-12 | Stage 17 P2, or earlier if inventory is thin (risk K4) | Thin inventory at launch | OPEN |
| DEF-003 | On-request hotels (manual confirmation) | Inventory is ours → instant confirmation (D13) | Plan v2 · 2026-11-12 | Stage 17 P3 | Can't list hotels that won't commit allotment | OPEN |
| DEF-004 | Automated amendments (date / room / name changes) | Ops handles them as tickets in v1 | Plan v2 · 2026-11-12 | Stage 17 P4, when ticket volume is known | Ops workload | OPEN |
| DEF-005 | Partial cancellation (some rooms of a booking) | Whole-booking cancellation only in v1 | Plan v2 · 2026-11-12 | Stage 17 P5 | Common agent request | OPEN |
| DEF-006 | Sub-agents (clients reselling to their own agents) | Not in the requirements for v1 | Plan v2 · 2026-11-12 | Stage 17 P6 | Slower distribution growth | OPEN |
| DEF-007 | Promotions / coupons | Kept separate from margin rules | Plan v2 · 2026-11-12 | Stage 17 P7 | Lower conversion | OPEN |
| DEF-008 | SDK packages, OAuth client credentials, separate public sandbox | Docs + code samples + staging test keys are enough for first clients | Plan v2 · 2026-11-12 | First client asks — Stage 17 P8 | Slower client integrations | OPEN |
| DEF-009 | Other products (flights, packages, transfers, activities, visa) | v1 = hotels only; My Bookings shows "coming soon" tabs | Requirements · 2026-11-12 | Stage 17 P9 | — | OPEN |
| DEF-010 | E-invoicing (IRN) | Only needed above the turnover threshold | Plan v2 · 2026-11-12 | When the CA says it applies | Non-compliance if turnover crosses the threshold | OPEN |
| DEF-011 | Full accounting system | Daily journal export to Tally/Zoho instead | Plan v2 · 2026-11-12 | Only if exports prove insufficient | — | OPEN |
| DEF-012 | Multi-currency / international clients | INR only in v1; `Money` type is currency-aware | Plan v2 · 2026-11-12 | When international demand appears | — | OPEN |
| DEF-013 | Mandatory passkeys (WebAuthn) and staff SSO | TOTP MFA is proportionate for v1 | Plan v2 · 2026-11-12 | After launch, security review | Weaker phishing resistance for admins | OPEN |
| DEF-014 | Separate search cluster (OpenSearch etc.) | MongoDB indexes / Atlas Search are enough at this scale | Plan v2 · 2026-11-12 | If search budgets in `07-…` §5 are missed | Slow search at scale | OPEN |
| DEF-015 | Business area as its own Next.js app | Lives inside the existing app (D14) | Business · 2026-11-12 | If the app becomes too large or needs separate deploys | — | OPEN |
| DEF-016 | WhatsApp and SMS notifications | Every option needs an outside provider; decision: no third-party services for new notification features (D26) | Business · 2026-11-12 | After the pilot, if hotels miss bookings despite escalation (risk K16) | Hotels away from the dashboard notice bookings later | OPEN |
| DEF-017 | Splitting modules into separate services | Modular monolith first | Plan v2 · 2026-11-12 | Stage 17 P10, when scale requires | — | OPEN |
| DEF-018 | Browser push notifications (when the tab is closed) | Web Push is delivered through the browser makers' push servers (Google/Mozilla/Apple), which conflicts with D26 | Business · 2026-11-12 | If D26 is relaxed for browser push | Alerts only reach users with the dashboard open (plus email) | OPEN |
| DEF-019 | Phone-number verification by OTP | Needs an SMS provider (D26); phone numbers are stored and checked during KYC review | Business · 2026-11-12 | Together with DEF-016 | Unverified phone numbers | OPEN |

Status: `OPEN` (still deferred) · `SCHEDULED` (has a stage/task — note it in "Revisit when") · `DONE` · `CANCELLED` (won't do — reason in "Why").
