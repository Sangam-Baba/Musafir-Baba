# Stage 15 — Hotel payouts, finance & reports · Progress

> Task list from `docs/plan/stages/stage-15-payouts-finance-reports.md` §3, split so each task fits one reviewable change. Rules and status values: `docs/progress/README.md`.

| | |
| --- | --- |
| **Status** | IN_PROGRESS |
| **Phase · Track** | C · finance |
| **Owner(s)** | |
| **Started** | 2026-11-23 |
| **Finished** | — |
| **Plan file** | `docs/plan/stages/stage-15-payouts-finance-reports.md` |
| **Depends on** | Stages 07–13 (ledger, payables and recorded payouts from Stage 09, SaaS invoices from Stage 13) |
| **Modules** | `wallet` (payout runs, deductions), `documents` / `billing` (GST registers, period locks), `reporting` (reports, exports), `organizations` (client branding) |

## Defaults used for this stage (owner / CA can change any of them — **placeholders until D11 is signed off**)

| Topic | Default |
| --- | --- |
| Payout cycle (D11) | Weekly, proposed every Monday (India) for every hotel with payables ready to pay; finance can propose any time |
| Deductions (D11) | **None until the CA sets them** — rules per hotel or for all hotels (percent or fixed, e.g. TDS under 194-O), posted to a new "TDS / deductions payable" account; never more than the payable |
| Negative balances | Carried to the next run, never taken from the hotel automatically |
| Holds | A line is held when the hotel's bank details changed in the last 72 hours, its KYC is not approved, or it has an open statement dispute |
| Approval | One finance person prepares the run (hold / release lines), a different one approves — totals locked by a hash; an approved run cannot be edited |
| Paying | A bank file (generic NEFT CSV until MusafirBaba's bank format is known; every account-number view is logged), then the run is marked paid with the bank reference → journal per hotel: hotel payable → bank (+ deductions payable) → payables PAID → remittance notice. Payout API adapter later (DEF) |
| GST registers | Hotel tax invoices, credit notes and SaaS invoices by month; B2B (with GSTIN) vs B2C; by place of supply; SAC summary; CSV (format to agree with the CA). A month can be **locked** after filing — no new documents dated in it |
| Reports | Computed on request from the booking summaries, ledger and invoices (no extra copies yet); CSV export; scheduled emails later (DEF) |
| Branding | Client white-label: name, contact, colour and logo link on the client voucher; platform template editing later (DEF) |

## Tasks

| ID | Task | Plan ref | Status | Owner | PR | Tests | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S15-T01 | Setup: task list, placeholder defaults (D11) | §3 | DONE | AI (Claude) | | — | |
| S15-T02 | Deduction rules + "TDS / deductions payable" account + payout run proposal (`wal_payout_runs`, `wal_payout_lines`): eligible − deductions per hotel, negatives carried, holds (bank changed < 72 h, KYC, disputes) | §3.1–3.3 | TODO | | | | |
| S15-T03 | Prepare → approve (a different person, totals hash) → bank file (logged) → paid (journal per hotel, payables PAID) → remittance; approved runs locked | §3.2 | TODO | | | | |
| S15-T04 | Hotel statements per run + disputes (`wal_statement_disputes`): hotel raises on a line, ops resolves, hold / adjustment next run | §3.4 | DONE | AI (Claude) | | payout-disputes.test.js | migration 0075 `wal_statement_disputes` (one open per payable); statement per paid payout (bookings, deductions, net, bank reference); hotel raises a dispute on its own payable → next payout line held (STATEMENT_DISPUTE_OPEN) → MusafirBaba accepts / rejects with a note; corrections via adjustment / recorded payout. Routes / screens: T09 |
| S15-T05 | GST registers (tax invoices, credit notes, SaaS invoices; B2B / B2C; place of supply; SAC) + period locks (`bil_period_locks`) enforced when documents are issued | §3.5 | DONE | AI (Claude) | | gst-registers.test.js | tax invoices and credit notes now keep their amounts (`tax`: taxable, CGST / SGST / IGST, place of supply, SAC, buyer GSTIN); register per month = hotel invoices − credit notes + SaaS invoices, summaries by type, B2B / B2C, place of supply, SAC; CSV (simple layout until the CA agrees one); migration 0076 `bil_period_locks` (one per month, totals kept); only a finished month can be locked; SaaS invoices refused in a locked month. Documents are always dated today and the current month can never be locked, so hotel documents need no separate check. Documents issued before this change have no amounts → they show as 0 in the register. Routes / screens: T09 |
| S15-T06 | Admin reports: sales, client, destination, profit / margin, payments, wallet & credit ageing, payables ageing, cancellations, plan revenue & usage — CSV | §3.6 | DOING | AI (Claude) | |  |  |
| S15-T07 | Client reports (bookings, spend, usage) + accounting export (journal CSV by day) | §3.7, §3.8 | TODO | | | | |
| S15-T08 | Client white-label (`org_branding`: name, contact, colour, logo link) on the client voucher | §3.9, §3.10 | TODO | | | | |
| S15-T09 | Screens: admin payout runs, GST registers, reports, exports; hotel payouts & disputes; client reports & branding | §5 | TODO | | | | |
| S15-T10 | Mandatory tests: payout totals = Σ lines, deductions, holds, balanced postings, GST register = invoices − credit notes, period lock, a seeded month ties to the ledger | §8 | TODO | | | | |
