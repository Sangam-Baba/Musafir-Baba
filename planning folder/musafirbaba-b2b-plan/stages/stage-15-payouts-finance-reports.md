# Stage 15 — Hotel Payouts, Finance & Reports

| | |
| --- | --- |
| **Phase** | C — API, finance, launch |
| **Duration** | ~2.5 weeks |
| **Depends on** | Stages 07–13 (replaces the basic settlements from Stage 09) |
| **Modules** | `wallet` (payables, payouts), `payments` (payout adapter), `reporting`, `documents`, `organizations` (branding) |
| **Apps** | `admin` (finance, reports, branding), business area `/hotel` (statements, payouts), `/client` (reports, white-label) |
| **Closes** | D11 (payout cycle, TDS/TCS) |

## 1. Goal

Finance closes a month from the admin panel: hotels are paid correctly and on time with statements, GST data is ready for filing, profit is visible by client/hotel/destination, and customer-facing documents carry the right brand.

## 2. Scope

**In:** hotel payables, payout runs (maker–checker), bank file or payout API, statements & disputes, deductions (commission, TDS/TCS per CA), GST registers for filing, management reports, scheduled reports, accounting export, platform branding templates, white-label for clients.
**Out:** full accounting system (export to Tally/Zoho instead), e-invoicing (enable later if turnover requires — CA).

## 3. Work breakdown

1. **Payables** (upgrades Stage 09 basic settlements — manually recorded payouts become payout runs): on booking `COMPLETED` (or per contract), payable becomes eligible; cancellations, no-shows, hotel failures adjust; disputes hold.
2. **Payout runs** (weekly default, per-contract cycle): proposal (eligible − deductions) → maker edits/holds → checker approves with step-up (totals locked by hash) → bank bulk file (your bank's NEFT format) or payout API adapter → status → journal `HOTEL_PAYABLE → BANK` → remittance email.
3. **Holds**: bank details changed < 72 h → payout line held for verification (penny-drop adapter optional).
4. **Statements**: per cycle — bookings, cancellations, no-shows, deductions, net paid; PDF + CSV; hotel workspace finance pages; hotel can dispute a line → ops ticket → next cycle adjustment.
5. **GST registers**: invoices and credit notes by period; B2B (with GSTIN) vs B2C; place-of-supply-wise; SAC summary; export format agreed with CA; **period lock** after filing.
6. **Reports** (pre-aggregated collections, read from secondary): sales (by period, channel), client-wise, product-wise, destination-wise, profit/margin (client, hotel, city, star), commission, payments (method, success, refunds, fees), wallet balances & credit ageing, hotel payables ageing, look-to-book per client, cancellation rates, plan revenue & usage. Filters, drill-down, CSV/XLSX export, scheduled email.
7. **Client reports**: own bookings, spend, usage, statements.
8. **Accounting export**: daily journal export (Tally XML or CSV).
9. **Branding**: logo, colours, fonts; email and in-app notification templates; voucher/invoice/receipt/statement templates — editable with preview, versioned, invoice layout changes need approval.
10. **White-label for clients** (plan feature): client logo, name, contact, colours on client-branded vouchers and guest emails sent on their behalf.

## 4. Collections

`wal_payables`, `wal_payout_runs`, `wal_payout_lines`, `wal_deduction_rules`, `rpt_*` (daily facts), `doc_templates` (versions), `org_branding`, `bil_period_locks`.

## 5. API

Admin: `/admin/payables`, `/admin/payout-runs` (propose/edit/approve/submit), `/admin/reports/{name}`, `/admin/exports`, `/admin/gst-registers`, `/admin/periods/{id}/lock`, `/admin/templates`.
Hotel: `/hotel/statements`, `/hotel/payouts`, `/hotel/statement-disputes`.
Client: `/reports/{name}`, `/branding`.

## 6. Rules & edge cases

- Payout never exceeds eligible payables − deductions; negative balances carried forward, not auto-debited.
- Locked period → no new documents dated in it; corrections go in current period.
- Reports lag ≤ 5 minutes.

## 7. Security

| Threat | Control | Test |
| --- | --- | --- |
| Payout fraud via bank change | 72 h hold, step-up, checker, verification | Tests |
| Editing approved payouts | Totals hash locked; edits rejected after approval | Test |
| Report leakage | Org-scoped reports; exports audited, expiring links | Isolation |
| Template tampering | Versioning + approval + required-field validation | Test |

## 8. Mandatory tests

Payout totals = Σ lines; deduction rules; holds; postings balanced; GST register = Σ invoices − credit notes; period lock; reports tie to ledger for a seeded month.

## 9. Definition of Done

- [ ] A seeded month closes: payouts posted, statements sent, GST registers exported and tie to ledger
- [ ] All brief reports available with filters and export
- [ ] White-label voucher shows client brand and no MusafirBaba net/margin
- [ ] CA signed off GST exports and deductions

## 10. AI editor prompt

```
Read: AGENTS.md, 04-domain-model.md §8.5, this stage §3.2–3.3.
Task: payout run proposal + maker/checker approval + postings.
Constraints: modules/wallet + payout adapter interface; no real bank calls in tests.
Tests first: Σ lines = total; deduction precedence; bank-change hold; maker cannot approve; post-approval edit rejected; journal balanced.
```
