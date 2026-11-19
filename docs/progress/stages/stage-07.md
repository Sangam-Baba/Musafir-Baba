# Stage 07 — Payments (PayU) & ledger core · Progress

> Task list from `docs/plan/stages/stage-07-payments-ledger.md` §3, split so each task fits one reviewable change. Rules and status values: `docs/progress/README.md`. Postings: `docs/plan/04-domain-model.md` §8.5.

| | |
| --- | --- |
| **Status** | IN_PROGRESS |
| **Phase · Track** | A · money |
| **Owner(s)** | |
| **Started** | 2026-11-19 |
| **Finished** | — |
| **Plan file** | `docs/plan/stages/stage-07-payments-ledger.md` |
| **Depends on** | Stage 01 |
| **Modules** | `wallet` (new — accounts, journal, derived balances), `payments` (new — PayU) |

## Defaults used for this stage (owner / CA can change any of them)

| Topic | Default |
| --- | --- |
| Gateway | **The existing PayU merchant account** (owner, 19 Nov 2026): the same `PAYU_KEY` / `PAYU_SALT` / `PAYU_ENV` settings the website already uses, **read only**. The existing PayU code (packages, memberships, rides …) is not touched or imported |
| PayU dashboard | **Never changed** — no merchant webhook set; the new system uses its own browser return address on the new API (`/api/v1/payments/payu/callback`) and always confirms with PayU's verify API |
| Transaction ids | Own prefixes nothing existing uses: `B2BH` (hotel orders), `B2BW` (wallet top-ups, Stage 11), `B2BS` (subscriptions, Stage 13) |
| Chart of accounts | As in the plan, plus `CUSTOMER_ADVANCES` (money received for orders not yet confirmed) — **CA to approve (Q7)** |
| Who pays | Nobody yet: payments start with bookings (Stage 08). This stage builds the services, the PayU connection, the ledger and the finance screens; an admin \"test payment\" proves PayU end to end in test mode |
| Money | Integer paise; balanced journal entries only; never a direct balance edit — correcting entries |

## Tasks

| ID | Task | Plan ref | Status | Owner | PR | Tests | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S07-T01 | Stage setup: modules `wallet` and `payments` (permissions, events, README), role matrix, defaults recorded | §3 | DONE | AI (Claude) | | matrix ✅ | `wallet`: `wallet.ledger.read`, `wallet.adjustment.propose`, `wallet.adjustment.approve` (sensitive). `payments`: `payments.payment.read`, `payments.recon.manage`, `payments.refund.create` (sensitive), `payments.test.run` (sensitive). Finance gets read / propose / reconciliation via its `wallet.**` / `payments.**` patterns; sensitive ones only Super Admin (or a role listing the exact code — the plan's "refunds (approve)" for Finance can be given that way); Support reads; the Hotels team has no payment access. Events: payment succeeded / failed, refund succeeded / failed, reconciliation exception; adjustment posted, invariant broken. READMEs with the fixed money rules |
| S07-T02 | Chart of accounts `wal_accounts` (platform accounts seeded; hotel PAYABLE opened when a hotel is activated; client types defined for Stage 11) | §3.1 | DONE | AI (Claude) | | 1 ✅ | `domain/accounts.js` — chart (CA to approve, Q7): MusafirBaba `GATEWAY_CLEARING`, `BANK`, `GATEWAY_FEES`, `REFUNDS_CLEARING`, `SUSPENSE` (debit side), `CUSTOMER_ADVANCES` (**new** — paid, booking not yet confirmed), `REVENUE_MARGIN`, `REVENUE_SAAS`, `TAX_PAYABLE_CGST / SGST / IGST` (credit side); hotel `PAYABLE`; client `WALLET`, `RECEIVABLE` (defined, opened with Stage 11). `wal_accounts` (migration `0043`, tenant `ownerOrgId` — MusafirBaba's own under `platform`; one per owner + type). MusafirBaba accounts opened at background start; consumer `wallet-hotel-payable` opens a hotel company's payable on `organizations.org.activated` (repeat-safe upserts, existing accounts never changed). Platform / hotel accounts are DERIVED |
| S07-T03 | Journal `wallet.post` (`wal_transactions`): balanced, ≥ 2 lines, active accounts, idempotent by reference + purpose; property tests | §3.2 | DONE | AI (Claude) | | 6 ✅ | `domain/journal.js` `checkEntry` (all problems at once): reference type / id, purpose, 2–50 lines, each a debit **or** a credit of whole positive paise (≤ ₹10 crore), debits = credits. `createLedger().post(entry, by)`: every account must exist and be ACTIVE; one document per entry (`wal_transactions`, migration `0044`, unique reference + purpose, lines-by-account index); posting again → the first (`created: false`), the same reference with other lines → `JOURNAL_REFERENCE_REUSED`. Append-only. Tests: rules, accounts once, repeat / reuse, closed / unknown account refused, **10 parallel posts → 1 entry**, **300 random entries → every entry and the total balanced** |
| S07-T04 | Derived balances `wal_balance_snapshots` (worker roll-up) + hourly invariant (snapshot = Σ journal lines) | §3.2, §4 | DONE | AI (Claude) | | 4 ✅ | `wal_balance_snapshots` (migration `0045`, one per account + a journal cursor row). Schedule `ledger-balances-rollup` (every minute, lease-locked — one process at a time): reads the next 1 000 journal entries in id order, adds each account's lines to its snapshot **only for entries newer than that snapshot's own `asOf`** (conditional on the version read) → a run cut short and run again never counts twice; then moves the cursor. `balancesOf` (admin explorer): balance on each account's normal side + as-of time. Invariant `ledger-snapshots-match-journal` (with the other checks, every 10 min — the plan said hourly; more often is cheap now): recomputes each snapshot from the journal up to its `asOf` and reports differences. Tests: balances, cut-short run, batches of 1 000, a hand-edited balance reported |
| S07-T05 | PayU adapter: request hash, reverse hash (incl. additional charges), verify payment, refund, refund status, settlement report — pure hashes + HTTP client (fake PayU in tests) | §3.3 | DONE | AI (Claude) | | 7 ✅ | `domain/payu.js` (pure): paise ↔ PayU rupees ("997.50"), **request hash identical to the existing website integration** (tested against the same template the existing controller builds — read, never imported), response (reverse) hash incl. additional charges, **constant-time** check, API hash `key|command|var1|SALT`, PayU status words → SUCCESS / PENDING / FAILURE / UNKNOWN, prefixes `B2BH` / `B2BW` / `B2BS`. `payu-client.js`: merchant from the **existing** `PAYU_KEY` / `PAYU_SALT` / `PAYU_ENV` (read only; none set → payments stay off), live `secure.payu.in` / `info.payu.in` or test `test.payu.in`; `verify` (verify_payment), `refund` (cancel_refund_transaction with **our** refund id), `refundStatus` (check_action_status), `settlements` (get_settlement_details) — 15 s timeout, answers reduced to the fields we use. PayU's API field names are to be **confirmed in test mode** (S07-T10 test payment); they live only in this file |
| S07-T06 | Payment intents `pay_intents` + `payments.createIntent` (PayU form fields) + `POST /payments/payu/callback` (reverse hash, inbox dedupe `pay_webhook_inbox`) + processor (always verify API; amount / txn id checked) → SUCCEEDED / FAILED + journal | §3.3, §6 | DONE | AI (Claude) | | 8 ✅ | `pay_intents` (migration `0046`), `pay_webhook_inbox` + `pay_recon_exceptions` (`0047`). `createIntent` (internal — orders use it in Stage 08; admin test payment in T10): our amount, txn id `B2BH` / `B2BW` / `B2BS` / `B2BT` (tests) + 12 characters, PENDING with a 30-minute window, the hosted PayU form (`test.payu.in` / `secure.payu.in`) signed like the existing integration, `surl` = `furl` = the new API's return address (`B2B_API_PUBLIC_URL` + `/payments/payu/callback`), `udf1` = intent id. **`POST /payments/payu/callback`** (public, form post, own parser): message kept once per `txnId + status`, hash checked (bad hash → kept, not acted on); `processIntent` **always asks PayU's verify API** — SUCCESS with our amount and txn id → SUCCEEDED (+ `payments.intent.succeeded`) and the ledger entry **gateway clearing ← customer advances** (once; `journalPosted`); another amount → FAILED + `AMOUNT_MISMATCH` exception, no entry; FAILURE → FAILED; PENDING → counted for the poller; unpaid after the window → FAILED (abandoned). Final statuses never move back. Browser → the page that started it with `?payment=…&txn=…` (303). Without `PAYU_KEY` / `PAYU_SALT` / `B2B_API_PUBLIC_URL` payments answer 503 and nothing else changes |
| S07-T07 | Pending poller (every 2 min) and stuck-intent check (hourly); success after the window → refund once | §3.3, §3.5 | DONE | AI (Claude) | | 2 ✅ | `pollPayments` — schedule `payments-poller`, every 2 min, lease-locked, on the process's PayU settings: open intents at least a minute old (by **our** clock — the payment window, not database timestamps) not checked for 2 min → `processIntent` (verify API); successes whose ledger entry was cut short → posted (once); payments abandoned in the last 72 h re-checked hourly → **paid late = money recorded, `LATE_SUCCESS` exception, refunded to the source once** (refund key `late-success`; a late browser return takes the same path); refunds followed (`followRefunds`). One failing item never stops the others. The plan's separate hourly stuck-intent sweep is covered by the 2-minute checks plus the 72-hour re-check |
| S07-T08 | Refunds `pay_refunds`: to source, partial, idempotent (our refund id to PayU), status polled to the end; journal | §3.4 | DONE | AI (Claude) | | 4 ✅ | `pay_refunds` (migration `0048`; unique refund id, unique per payment + key). `refundPayment`: (1) refund document REQUESTED — the same key again returns it; (2) amount **reserved on the payment** in one conditional update (never above what was paid; refund id recorded once); (3) PayU refund API with **our** refund id → PENDING, or refused → FAILED with the amount freed and a `REFUND_FAILED` exception; (4) poller follows to SUCCEEDED → ledger **customer advances → gateway clearing** (once) and the payment REFUNDED when fully refunded. Cut short before step 3 → the poller asks PayU once (no second reservation). Only confirmed payments (or paid-late ones) can be refunded. Refunds to wallet come with Stage 11 |
| S07-T09 | Reconciliation: settlement report → `pay_settlements`, match with intents / refunds, fees and bank posted, mismatches → `pay_recon_exceptions` + alert | §3.5 | TODO | | | | |
| S07-T10 | Admin finance basics: accounts explorer, payments and refunds lists, reconciliation exceptions, manual adjustment (maker–checker, reason codes), test payment in PayU test mode | §3.6 | TODO | | | | |
| S07-T11 | Mandatory test suite: ledger invariants (property), hash / replay / out-of-order, pending → poller, success after window → refund once, refund idempotency, reconciliation with sample files | §8 | TODO | | | | |

Status: `TODO` · `DOING` · `REVIEW` · `DONE` · `BLOCKED` · `DEFERRED` (needs a `DEF-…` row) · `DROPPED` (reason in Notes)

## Definition of Done (copied from the stage file)

- [ ] A test PayU payment (staging, PayU test mode) is verified server-side and posted as balanced journal lines
- [ ] Refund to source works and is tracked to completion
- [ ] Daily reconciliation on test data shows zero unexplained differences
- [ ] CA approved the chart of accounts

## Mandatory tests (copied from the stage file)

- [ ] Ledger invariants (property tests)
- [ ] PayU hash/replay/out-of-order
- [ ] Pending → poller resolves
- [ ] Success after window → refund once
- [ ] Refund idempotency
- [ ] Reconciliation with sample settlement files
