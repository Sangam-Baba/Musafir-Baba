# Stage 07 — Payments (PayU) & Ledger Core

| | |
| --- | --- |
| **Phase** | A — hotels + website (working system) |
| **Duration** | ~2 weeks (can run in parallel with Stages 03–06 by a second developer) |
| **Depends on** | Stage 01 |
| **Modules** | `wallet` (ledger core — accounts, journal, derived balances), `payments` (PayU) |
| **Apps** | `admin` finance basics |
| **Closes** | D17 (PayU — decided), CA Q7 (chart of accounts) |

## 1. Goal

Every rupee from website bookings is recorded once, balanced and traceable. Website customers pay by PayU; refunds work; hotel payables are recorded; finance can prove the books match PayU daily. The client **wallet and credit line** are added on top of this in Stage 11.

## 2. Scope

**In:** chart of accounts and journal (ledger), derived balances, **PayU** integration (existing merchant account): payment requests, server-side verification (response hash + verify API), pending-payment poller, refunds, settlement reconciliation; admin finance basics.
**Out:** client wallet, top-ups, credit line, money holds (Stage 11); booking orchestration (Stage 08); formal hotel payout runs (Stage 15).

**Coexistence:** reuse the existing PayU merchant account/keys with **new** callback/webhook URLs for `/api/v1`; the existing PayU payment code (packages, memberships, etc.) is not modified; all new payment data lives in new collections.

## 3. Work breakdown

1. **Accounts** (`wal_accounts`): per hotel `PAYABLE`; platform `REVENUE_MARGIN`, `REVENUE_SAAS`, `TAX_PAYABLE_CGST/SGST/IGST`, `GATEWAY_CLEARING`, `BANK`, `GATEWAY_FEES`, `REFUNDS_CLEARING`, `SUSPENSE`. Client `WALLET`/`RECEIVABLE` account types are defined now but opened in Stage 11. Chart approved by CA (Q7). Hotel accounts opened on `organizations.org.activated` for hotel orgs. Platform and hotel accounts are `DERIVED` (see `04-…` §5).
2. **Journal** `wallet.post(entry, session)`: ≥ 2 lines, debits = credits, accounts active, idempotent by `(reference.type, reference.id, purpose)` unique index; **live** balances only for client accounts (Stage 11); derived account balances rolled up by the worker into `wal_balance_snapshots` (never written inside booking transactions).
3. **payments module**: `pay_intents` lifecycle (`CREATED → PENDING → SUCCEEDED | FAILED`, then `REFUNDED`); PayU adapter (payment request with hash, verify payment API, refund API, refund status, settlement report) — exact PayU fields verified in PayU's docs during this stage; endpoints `POST /api/v1/payments/payu/callback` (browser return) and `POST /api/v1/webhooks/payu` (server-to-server, if enabled on the account) — verify the reverse hash, dedupe by `txnId` + status, enqueue; the processor **always** calls PayU's verify API and checks amount and `txnId` against the intent before acting. **Pending poller** (every 2 min): intents `CREATED`/`PENDING` → verify API → resolve.
4. **Refunds**: to source (PayU refund API); partial; idempotent (our refund id sent to PayU); status polled until final. (Refunds to wallet arrive with Stage 11.)
5. **Reconciliation**: daily PayU settlement report ↔ `pay_intents`/refunds ↔ `GATEWAY_CLEARING` movements; fees posted; mismatches → `pay_recon_exceptions` + alert. Hourly: stuck intents → verify API.
6. **Admin**: account explorer, payments and refunds list, reconciliation workbench, manual adjustment (maker–checker, reason codes).

## 4. Collections

`wal_accounts`, `wal_transactions`, `wal_balance_snapshots`, `pay_intents`, `pay_refunds`, `pay_webhook_inbox`, `pay_settlements`, `pay_recon_exceptions`.

Hourly invariant job: every derived snapshot = Σ its journal lines; alert on any difference.

## 5. API

PayU: `POST /payments/payu/callback`, `POST /webhooks/payu`.
Admin: `/admin/accounts`, `/admin/payments`, `/admin/refunds`, `/admin/recon-exceptions`, `/admin/adjustments`.
Internal services: `wallet.post`, `payments.createIntent`, `payments.refund`, `payments.verify`.

## 6. Rules & edge cases

- Amount always from the server-side intent; callback amount ≠ intent → exception, nothing confirmed.
- Duplicate/out-of-order callbacks never move a state backwards.
- Never fix a balance with a direct update — post a correcting entry.

## 7. Security

| Threat | Control | Test |
| --- | --- | --- |
| Forged PayU callback | Reverse-hash check (constant time) + verify API before acting | Forged/bad hash tests |
| Callback replay | Inbox dedupe | Replay test |
| Insider adjustment | Maker–checker + step-up + audit + daily report | Tests |
| Refund abuse | Only to source; thresholds need checker | Tests |

## 8. Mandatory tests

Ledger invariants (property tests); PayU hash/replay/out-of-order; pending → poller resolves; success after window → refund once; refund idempotency; reconciliation with sample settlement files.

## 9. Definition of Done

- [ ] A test PayU payment (staging, PayU test mode) is verified server-side and posted as balanced journal lines
- [ ] Refund to source works and is tracked to completion
- [ ] Daily reconciliation on test data shows zero unexplained differences
- [ ] CA approved the chart of accounts

## 10. AI editor prompt

```
Read: AGENTS.md, 10-coding-standards.md, 04-domain-model.md §5 & §8.5, 03-security-baseline.md §7, this stage §3.2–3.3.
Task: wallet.post (balanced, idempotent journal) + PayU adapter (request hash, reverse-hash verify, verify API, refund) + pending poller.
Constraints: modules/wallet + modules/payments; Money type; no PayU calls inside transactions; existing PayU code untouched.
Tests first: unbalanced entry rejected; duplicate reference returns existing; bad hash rejected; amount mismatch → exception; pending resolved by poller; refund idempotent.
```
