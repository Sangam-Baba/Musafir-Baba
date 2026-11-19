# Module: wallet

The ledger: chart of accounts, the journal (`wallet.post`) and balances (plan Stage 07; client wallets, holds and
credit lines in Stage 11). Every rupee is a balanced journal entry; balances are worked out from the journal.

| | |
| --- | --- |
| **Collections** | `wal_accounts`, `wal_transactions`, `wal_balance_snapshots` (Stage 11 adds `wal_holds`) |
| **Public interface** | `index.js` only |
| **Permissions** | `wallet.ledger.read`, `wallet.adjustment.propose / approve` |

## Rules that never change without an ADR

- A journal entry has ≥ 2 lines, debits = credits, only active accounts, integer paise, and is **one document** —
  atomic on its own. It is unique by `reference.type + reference.id + purpose`: posting it again returns the first.
- Balances are never edited directly. A mistake is fixed by a **correcting entry** (maker–checker).
- Platform and hotel accounts are DERIVED (worked out from the journal into snapshots by background work, never
  written by booking flows). Only client wallet / receivable accounts are LIVE (Stage 11).
