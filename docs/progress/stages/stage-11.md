# Stage 11 — Client wallet & credit · Progress

> Task list from `docs/plan/stages/stage-11-client-wallet-credit.md` §3, split so each task fits one reviewable change. Rules and status values: `docs/progress/README.md`.

| | |
| --- | --- |
| **Status** | AWAITING_SIGN_OFF |
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
| S11-T05 | Top-up via PayU (`POST /wallet/top-ups`), late success credits once | §3.4 | DONE | AI (Claude) | | wallet-topups.test.js, payments-refunds.test.js | GET /wallet, GET/POST /wallet/top-ups (Idempotency-Key, ₹100–₹5,00,000); PayU paid → `wallet-topup-paid` consumer credits once (advances → wallet); paid late → credited, never auto-refunded (payments `lateSuccess` lets TOPUP decide); new switch `B2B_WALLET_ENABLED` (off → 503 WALLET_NOT_ENABLED); permissions `wallet.account.read` / `.topup` (Owner, Accountant) |
| S11-T06 | Bank-transfer top-ups `wal_manual_topups`: client submits, one finance person checks, another approves | §3.5 | DONE | AI (Claude) | | wallet-manual-topups.test.js | migration 0066; client submits (UTR once, no future bank date) → `wallet.topup.check` → a different person with `wallet.topup.approve` (sensitive) → bank → wallet once; cut-short credits finished by the job; bank details from `B2B_TOPUP_BANK_DETAILS` (owner to give the account); proof upload deferred (DEF-037) |
| S11-T07 | Credit lines `wal_credit_lines`: limit + due days (two people), dues, overdue blocking, `GET /credit` | §3.6 | DONE | AI (Claude) | | wallet-credit.test.js | migration 0067 (one open proposal per client); `wallet.credit.propose` → a different person with `wallet.credit.approve` → limit + due days on the wallet; dues from when the wallet went below zero; overdue → DEBIT and new holds refused (CREDIT_OVERDUE), top-ups still accepted; GET /credit; GET /admin/wallet/credit-overdue. Monthly credit statement comes with the wallet statement (T09) |
| S11-T08 | Refund to wallet (service) + wallet adjustments (two people, reason codes); corrections blocked on live accounts | §3.7, §3.9 | DONE | AI (Claude) | | wallet-adjustments.test.js | `refundToWallet` (instant, once per reference — for Stage 12B cancellations); wallet adjustments in `wal_adjustments` (kind WALLET, reason codes + GOODWILL_CREDIT / TOPUP_CORRECTION): `wallet.adjustment.propose` → a different person approves → PROPOSED → POSTING → POSTED; uncovered debit refused and stays open; Stage 07 entries touching a live wallet refused (LIVE_ACCOUNT_NEEDS_WALLET_ADJUSTMENT) |
| S11-T09 | Client wallet API + page: balance, transactions, statement (CSV), low-balance alerts | §3.8 | DONE | AI (Claude) | | wallet-statement.test.js (+ frontend tsc) | GET /wallet/statement(.csv) — opening, entries with running balance, closing from the journal (Indian dates, ≤ 1 year, no CSV formulas); PATCH /wallet/settings (threshold, default ₹10,000, 0 = off); events on the wallet document (migration 0068, relay source): `wallet.topup.credited`, `wallet.account.low-balance` (once until back above), `wallet.credit.overdue` (once until paid) → bell + owners' email; page /business/wallet (balance cards, PayU, bank transfer, top-ups, statement, setting) + menu item for `wallet.account.read` |
| S11-T10 | Admin: client accounts explorer, top-up approvals, credit lines, wallet adjustments, daily manual-credits report | §3.9 | DONE | AI (Claude) | | wallet-admin.test.js (+ frontend tsc) | GET /admin/wallet/clients (names, balance, held, credit, overdue first), /admin/wallet/clients/:orgId/statement, /admin/wallet/manual-credits?date (bank transfers approved + adjustments posted, who checked / approved) — `wallet.ledger.read`; admin tab Wallets: clients + statement, approvals (bank transfers, credit lines, adjustments), manual credits report |
| S11-T11 | Mandatory test suite | §8 | DONE | AI (Claude) | | stage-11-mandatory.test.js (+ all wallet-*.test.js) | randomised: 20 rounds × 40 concurrent top-ups / spends / holds / captures / releases with credit — never past the floor, live balances = journal, held = HELD holds, ledger invariants clean; index of where each §8 test lives in the file header. Full suite 1 033 tests ✅ (one Stage 01 expectation updated: a client Admin can no longer invite an Accountant — the Accountant holds wallet powers the Admin doesn't; the Owner can) |

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
