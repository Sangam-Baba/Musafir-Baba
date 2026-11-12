# ADR-0007: Random public references with a check character

| | |
| --- | --- |
| **Status** | Accepted |
| **Date** | 2026-11-12 |
| **Deciders** | Owner + tech lead |
| **Stage** | Stage 00 |

## Context

Sequential ids leak volume and are guessable; customers type references over the phone.

## Decision

References like `MBH-7K3Q-9X2D`: crypto-random Crockford base32 (no I/L/O/U) with a Luhn mod 32 check character; `parseReference` accepts lower case and look-alikes. Only GST invoice numbers are sequential (gap-free series).

## Options considered

| Option | Pros | Cons |
| --- | --- | --- |
| Random + check char (chosen) | Unguessable, typo-safe | Not sortable |
| Sequential | Short | Guessable, leaks volume |
| ObjectId | Free | Long, unfriendly |

## Consequences

- Positive: typos are detected.
- Trade-off: none significant.
- Follow-up: invoice series in Stage 07.

## Validation

`tests/b2b/core-ids.test.js` (500/500 single-character typos caught).
