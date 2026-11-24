# Incident runbook — B2B + hotel system

> Have a lawyer confirm the legal steps below before launch. They are a checklist, not legal advice.

## Who

| Role | Person | Phone | Backup |
| --- | --- | --- | --- |
| Incident lead (decides, talks to the owner) | | | |
| Tech on call | | | |
| CERT-In point of contact (registered with CERT-In) | | | |
| Data protection contact (DPDP) | | | |
| Payments (PayU account manager) | | | |

## First 30 minutes — any incident

1. Open a log (time, what you saw, what you did). Keep writing in it.
2. **Contain**: switch off what is affected — `B2B_API_ENABLED=false` (all API keys and webhooks stop), `B2B_ORDERS_ENABLED=false`, `B2B_WALLET_ENABLED=false`, `B2B_BILLING_ENABLED=false`; revoke sessions / keys; block an IP in Cloudflare.
3. Keep evidence: don't delete logs or records; copy the relevant server logs.
4. Decide if it is **reportable** (below). The clock for CERT-In starts when you notice.

## Reporting

| To | When | What |
| --- | --- | --- |
| **CERT-In** (incident@cert-in.org.in, form on cert-in.org.in) | **within 6 hours** of noticing a reportable cyber incident (e.g. data breach / leak, unauthorised access, compromise of systems or accounts, attacks on servers or apps) | What happened, when noticed, systems affected, what was done. Send what you know — update later |
| **Data Protection Board** and every affected person (DPDP Act 2023 / Rules) | personal data breach: **without delay**, a detailed report within **72 hours** | Nature, extent, time, likely impact, what you did, what people should do, a contact |
| PayU | at once if payment data, callbacks or keys may be involved | |
| Affected B2B clients / hotels | as soon as the facts are clear | Plain words; what they must do (e.g. rotate keys) |

Logs that CERT-In may ask for are kept **at least 180 days, in India** (set on the server — go-live checklist).

## Playbooks

### A client's API key leaked
1. The client (or MusafirBaba) revokes the key in **Business → Developers** — stops within 5 seconds. If the client can't be reached: an admin uses *View as* (write) to revoke it, or switch `B2B_API_ENABLED=false` for everyone.
2. Look at what it did: its usage (Business → Usage, "API key …"), the client's orders and bookings created through `B2B_API`, the key's last IP and new-IP notices.
3. Cancel bookings the client did not make (refunds go to their wallet); check the wallet statement.
4. Client makes a new key, limited to their server IPs.
5. Personal data of guests read with the key → treat as a data breach (DPDP).

### Data exposure (another company's or a guest's data shown / downloaded)
1. Switch off the feature involved; find the request ids in the logs.
2. List exactly which records and whose. Fix and add a test that proves the fix (tenant isolation).
3. CERT-In within 6 h if reportable; DPDP Board + affected people.

### Webhook / outbound abuse
The guarded sender only calls public HTTPS addresses. If an address misbehaves: switch it off (Business → Developers, or the client's page through *View as*) or `B2B_API_ENABLED=false`.

### Money looks wrong (System health: ledger check failing)
1. Switch off orders, wallet and billing. Don't "fix" balances by hand — the ledger is the truth.
2. `node scripts/b2b/check-invariants.js` against a copy; finance compares with PayU and the bank.
3. Corrections only through **Finance → Accounts & corrections** (two people).

### Rooms oversold (System health: inventory check failing)
1. Call the hotel; keep the guest who booked first; move or refund the other (hotel failure flow).
2. Save the night's record for the root cause; add a test.

## After

Within 5 working days: what happened, why, what changed, how we'll notice sooner. Update this runbook.

## Tabletop exercise (before launch)

Scenario: *a client's live API key is posted on a public forum on a Saturday night; within an hour 40 bookings appear.* Walk through the playbook with the incident lead, tech on call and the CERT-In contact; time each step; write down what was missing.
