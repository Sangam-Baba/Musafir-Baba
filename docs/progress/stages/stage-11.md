# Stage 11 — Client wallet & credit · Progress

> Task list from `docs/plan/stages/stage-11-client-wallet-credit.md` §3, split so each task fits one reviewable change. Rules and status values: `docs/progress/README.md`.

| | |
| --- | --- |
| **Status** | IN_PROGRESS |
| **Phase · Track** | B · clients |
| **Owner(s)** | |
| **Started** | 2026-11-21 |
| **Finished** | — |
| **Plan file** | `docs/plan/stages/stage-11-client-wallet-credit.md` |
| **Depends on** | Stage 07 (ledger, PayU), Stage 10 (client companies) |
| **Modules** | `wallet` (client accounts with live balances, money holds, top-ups, credit lines, wallet adjustments), `payments` (top-ups through PayU) |

## Defaults used for this stage (owner / lawyer / finance can change any of them)

| Topic | Default |
| --- | --- |
| Wallet (D6) | **Closed and non-transferable**: usable only for MusafirBaba services, no client-to-client transfers; unused balance refunded only to the source / the client's own bank after checks. **Lawyer to confirm** no RBI licence is needed (L1) |
| Credit (D9) | **None unless MusafirBaba sets one**: a limit and due days per client, set by one finance person and approved by another. Credit used = the wallet below zero (down to minus the limit); dues are counted from when the wallet went below zero; past the due days → alerts and new bookings blocked; top-ups pay dues first |
| Top-ups | PayU (transaction ids `B2BW…`, the existing merchant account) — a payment PayU confirms after its window **still credits the wallet** (no rooms at risk); bank transfer (NEFT / RTGS / IMPS): the client gives the UTR, one finance person checks it against the bank, a different one approves |
| Staff step-up | MusafirBaba staff sign in through the existing admin login, which has no app code — approvals rely on two different people, a permission given by exact code, and the activity log. A step-up for staff is **deferred** (DEF row) |
| Corrections | Wallet balances are never edited: a wallet adjustment (two people, reason code) moves the live balance and posts the journal entry; Stage 07 corrections can no longer touch live wallet accounts |
| Low balance | Each client's owner sets a threshold (default ₹10,000); falling below it sends one notice (bell + email) until topped up again |

## Tasks

| ID | Task | Plan ref | Status | Owner | PR | Tests | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S11-T01 | Setup: task list, defaults (D6, D9), staff step-up deferral | §3 | DONE | AI (Claude) | | — | |
| S11-T02 | Client accounts: opened when a client is activated (+ back-fill), live balance fields, available = balance − held + credit limit | §3.1 | DONE | AI (Claude) | | wallet-live.test.js | wallet opened on `organizations.org.activated` (CLIENT) + every-minute back-fill for active clients (routes/wallet-wiring.js); no migration needed (no validator on wal_accounts) |
| S11-T03 | Live balance engine: conditional updates with op ids, journal once, reconciler, hourly check (balance = Σ lines + pending ops) | §3.2 | DONE | AI (Claude) | | wallet-live.test.js | op id guarded by pending `ops` + last 500 `doneOps` + journal reference checked first; 30 concurrent spends never overdraw; crash → reconciler after 60 s; hourly check `wallet-live-balances-match-journal` |
| S11-T04 | Money holds `wal_holds`: holdFunds / captureHold (≤ held) / releaseHold / expiry sweeper; 100 concurrent holds never break the floor | §3.3 | DONE | AI (Claude) | | wallet-holds.test.js | migration 0065 `wal_holds`; PLACING/CAPTURING/RELEASING finished by the every-minute job after 60 s; orphan HOLD ops freed; 100 concurrent holds (with credit) → exactly what fits |
| S11-T05 | Top-up via PayU (`POST /wallet/top-ups`), late success credits once | §3.4 | TODO | | | | |
| S11-T06 | Bank-transfer top-ups `wal_manual_topups`: client submits, one finance person checks, another approves | §3.5 | TODO | | | | |
| S11-T07 | Credit lines `wal_credit_lines`: limit + due days (two people), dues, overdue blocking, `GET /credit` | §3.6 | TODO | | | | |
| S11-T08 | Refund to wallet (service) + wallet adjustments (two people, reason codes); corrections blocked on live accounts | §3.7, §3.9 | TODO | | | | |
| S11-T09 | Client wallet API + page: balance, transactions, statement (CSV), low-balance alerts | §3.8 | TODO | | | | |
| S11-T10 | Admin: client accounts explorer, top-up approvals, credit lines, wallet adjustments, daily manual-credits report | §3.9 | TODO | | | | |
| S11-T11 | Mandatory test suite | §8 | TODO | | | | |

Status: `TODO` · `DOING` · `REVIEW` · `DONE` · `BLOCKED` · `DEFERRED` (needs a `DEF-…` row) · `DROPPED` (reason in Notes)

## Definition of Done (copied from the stage file)

- [ ] Client tops up ₹50,000 via PayU; balanced entries; wallet updates live
- [ ] Manual top-up needs two different finance users with step-up
- [ ] Credit-line client can spend up to its limit; statement shows dues; overdue blocks bookings
- [ ] Lawyer confirmed the wallet design (D6)

## Mandatory tests (copied from the stage file)

- [ ] Ledger invariants including live balances
- [ ] 100 concurrent holds never break the floor (incl. credit)
- [ ] Capture > held rejected
- [ ] Expiry releases
- [ ] Top-up late success credits once
- [ ] Manual top-up needs two finance users
