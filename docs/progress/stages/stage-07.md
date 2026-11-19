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
| S07-T02 | Chart of accounts `wal_accounts` (platform accounts seeded; hotel PAYABLE opened when a hotel is activated; client types defined for Stage 11) | §3.1 | TODO | | | | |
| S07-T03 | Journal `wallet.post` (`wal_transactions`): balanced, ≥ 2 lines, active accounts, idempotent by reference + purpose; property tests | §3.2 | TODO | | | | |
| S07-T04 | Derived balances `wal_balance_snapshots` (worker roll-up) + hourly invariant (snapshot = Σ journal lines) | §3.2, §4 | TODO | | | | |
| S07-T05 | PayU adapter: request hash, reverse hash (incl. additional charges), verify payment, refund, refund status, settlement report — pure hashes + HTTP client (fake PayU in tests) | §3.3 | TODO | | | | |
| S07-T06 | Payment intents `pay_intents` + `payments.createIntent` (PayU form fields) + `POST /payments/payu/callback` (reverse hash, inbox dedupe `pay_webhook_inbox`) + processor (always verify API; amount / txn id checked) → SUCCEEDED / FAILED + journal | §3.3, §6 | TODO | | | | |
| S07-T07 | Pending poller (every 2 min) and stuck-intent check (hourly); success after the window → refund once | §3.3, §3.5 | TODO | | | | |
| S07-T08 | Refunds `pay_refunds`: to source, partial, idempotent (our refund id to PayU), status polled to the end; journal | §3.4 | TODO | | | | |
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
