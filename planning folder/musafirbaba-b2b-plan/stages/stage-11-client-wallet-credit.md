# Stage 11 — Client Wallet & Credit

| | |
| --- | --- |
| **Phase** | B — B2B clients |
| **Duration** | ~2 weeks (can run in parallel with Stage 10) |
| **Depends on** | Stage 07 (ledger, PayU), Stage 10 (client orgs) |
| **Modules** | `wallet` (client accounts, live balances, holds, top-ups, credit), `payments` |
| **Apps** | Business area `/client` wallet, `admin` finance |
| **Closes** | D6 (wallet design, lawyer), D9 (credit line) |

## 1. Goal

Each B2B client has a prepaid **wallet** (and optionally an approved **credit line**) that it tops up by PayU or bank transfer and spends on bookings in seconds — with every rupee balanced and traceable on top of the Stage 07 ledger.

## 2. Scope

**In:** client `WALLET` and `RECEIVABLE` accounts with **live** balances, conditional balance updates, money holds (hold/capture/release/expire), top-up via PayU, manual bank-transfer top-up (maker–checker), credit line (limit, due days, statements, overdue blocking), refunds to wallet, statements, low-balance alerts.
**Out:** booking checkout with wallet (Stage 12), plan fee debits (Stage 13).

## 3. Work breakdown

1. **Client accounts**: opened on `organizations.org.activated` for `CLIENT` (and back-filled for clients approved before this stage); `balanceMode: LIVE`.
2. **Balance updates** — conditional, so the wallet can't go below its floor:
   ```js
   updateOne(
     { _id: walletId, $expr: { $gte: [ { $add: [{ $subtract: ['$balancePaise', '$heldPaise'] }, '$creditLimitPaise'] }, amount ] } },
     { $inc: { heldPaise: amount, version: 1 } }, { session })   // 0 modified → INSUFFICIENT_WALLET_BALANCE
   ```
3. **Money holds** (`wal_holds`): `holdFunds`, `captureHold` (posts journal, ≤ held amount), `releaseHold`, expiry sweeper.
4. **Top-up via PayU**: intent (`txnId`, purpose `TOPUP`) → PayU checkout → callback/webhook hash verified → PayU verify API confirms success and amount → post `GATEWAY_CLEARING → WALLET`. Late success always credits the wallet (no inventory risk).
5. **Manual top-up** (NEFT/RTGS/IMPS): client submits UTR, amount, proof → finance maker records → checker approves with step-up → post `BANK → WALLET`.
6. **Credit line**: admin sets limit + due days per client (maker–checker); usage tracked on `RECEIVABLE`; monthly statement; overdue → alerts, then booking block; top-ups settle dues first.
7. **Refunds to wallet**: instant, idempotent; used by Stage 12 cancellations.
8. **Statements & alerts**: wallet statement (opening, entries, closing; CSV + PDF via documents); low-balance threshold → notification (in-app + email).
9. **Admin**: client account explorer, top-up approvals, credit limits, wallet adjustments (maker–checker, reason codes), daily manual-credits report.

## 4. Collections

`wal_holds`, `wal_manual_topups`, `wal_credit_lines` (+ client entries in `wal_accounts`, journal in `wal_transactions`).

Hourly invariant job: every live client balance = Σ its journal lines.

## 5. API

Client: `GET /wallet`, `GET /wallet/transactions`, `POST /wallet/top-ups`, `POST /wallet/manual-top-ups`, `GET /wallet/statements`, `GET /credit`.
Admin: `/admin/client-accounts`, `/admin/manual-top-ups/{id}/approve`, `/admin/credit-lines`, `/admin/wallet-adjustments`.
Internal services: `wallet.holdFunds`, `captureHold`, `releaseHold`, `refundToWallet`.

## 6. Rules & edge cases

- **Wallet is closed and non-transferable**: usable only for MusafirBaba services; no client-to-client transfers; refunds of unused balance only to source/bank after verification (lawyer to confirm, D6).
- Holds count against available balance; wallet never negative unless credit limit.
- Never fix a balance with a direct update — post a correcting entry.

## 7. Security

| Threat | Control | Test |
| --- | --- | --- |
| Double spend | Conditional balance update | 100 concurrent holds test |
| Insider credit | Maker–checker + step-up + audit + daily report | Tests |
| Refund abuse | Only to source or own wallet; thresholds need checker | Tests |
| Forged top-up callback | Stage 07 controls (hash + verify API) | Forged/bad hash tests |

## 8. Mandatory tests

Ledger invariants including live balances; 100 concurrent holds never break the floor (incl. credit); capture > held rejected; expiry releases; top-up late success credits once; manual top-up needs two finance users.

## 9. Definition of Done

- [ ] Client tops up ₹50,000 via PayU; balanced entries; wallet updates live
- [ ] Manual top-up needs two different finance users with step-up
- [ ] Credit-line client can spend up to its limit; statement shows dues; overdue blocks bookings
- [ ] Lawyer confirmed the wallet design (D6)

## 10. AI editor prompt

```
Read: AGENTS.md, 10-coding-standards.md, 04-domain-model.md §5 (balance modes) & §8.5, this stage §3.2–3.3.
Task: live client balances with conditional updates + holdFunds/captureHold/releaseHold + sweeper.
Constraints: modules/wallet; Mongo transactions; Money type; platform/hotel accounts stay DERIVED.
Tests first: 100 concurrent holds never exceed available (incl. credit); capture > held rejected; expiry releases; live balance == Σ lines.
```
