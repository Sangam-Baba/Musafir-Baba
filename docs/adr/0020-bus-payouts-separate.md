# ADR-0020: Bus companies are paid in their own payout run

- **Status:** Accepted (owner decision, 25 Nov 2026 — supersedes the plan's "supplier-generic payables in the same run")
- **Date:** 2026-11-25

## Context
The Stage 18 plan (§8) proposed making hotel payables and payout runs supplier-generic so one weekly run pays hotels and
bus companies. That means changing the live hotel payout code (payables, run lines, deduction rules, bank file, ledger
account, notices, finance screens — all keyed on `hotelOrgId`). The owner chose zero risk to hotel payouts.

## Decision
- New module `bus-payouts` with its own `bus_payables` (one per bus booking), `bus_payout_runs` and `bus_payout_lines`.
  The hotel payables / payout-run code is not changed.
- Same rules as hotel runs, reusing the wallet module's pure pieces (`payoutLine`, `holdReasons`, `runTotals`,
  `runHash`): one open run; lines held for KYC / bank / recent bank change / open dispute; a different person approves;
  the bank file is checked against the approval hash (account numbers revealed through KYC, logged); paid → one journal
  entry per company (Dr `OPERATOR_PAYABLE`, Cr `BANK`), payables PAID and locked.
- Owed per booking = net fares of seats that travelled + the company's share of cancellation charges — always equal to
  what the booking left on the company's `OPERATOR_PAYABLE`. Eligible when the trip ended (bookings COMPLETED by an
  hourly job 2 h after arrival) or the booking is fully cancelled.
- Bus companies report trip problems; ops resolve them (refunds through the two-person ops cancellation, ADR-0019).

## Consequences
- Finance runs two weekly runs (hotels, buses). Same permissions (`wallet.payout.record` / `.approve`).
- No deductions on bus payouts until the CA confirms TDS / TCS for operators (DEF-047).
