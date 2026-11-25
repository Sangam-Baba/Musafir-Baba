# Module: bus-payouts

Paying bus companies (plan `docs/plan/stages/stage-18-bus-service.md` B7). **Separate from hotel payouts** (owner's
decision, 25 Nov 2026): the hotel payables / payout-run code is not touched; the pure payout rules are reused from the
wallet module.

| | |
| --- | --- |
| **Collections** | `bus_payables` (one per bus booking), `bus_payout_runs`, `bus_payout_lines` |
| **Depends on** | `bus-booking` (bookings), `wallet` (ledger, `payoutLine` / `holdReasons` / `runTotals` / `runHash`); company facts (KYC, bank) passed in by the wiring |
| **Ledger** | paid line: Dr `OPERATOR_PAYABLE` (the company) gross · Cr `BANK` net — once per line |

- Owed per booking = net fares of seats still travelling + the company's share of each cancellation charge; ELIGIBLE
  when the trip ended (booking COMPLETED) or the booking is fully cancelled; PAID only through a run (locked).
- Runs: one open at a time; lines held for KYC / bank / recent bank change / open dispute; a second person approves;
  bank file checked against the approval hash; no deductions until the CA confirms TDS / TCS for operators.
