# ADR-0006: Money in integer paise; stay dates as calendar strings

| | |
| --- | --- |
| **Status** | Accepted |
| **Date** | 2026-11-12 |
| **Deciders** | Owner + tech lead |
| **Stage** | Stage 00 |

## Context

Floating-point money and time-zone shifts of stay dates cause real-money errors.

## Decision

`Money` holds integer paise, rates in basis points, half-up rounding, no negatives. Stay dates are `YYYY-MM-DD` strings; deadlines are computed in the hotel's time zone (`hotelDeadline`).

## Options considered

| Option | Pros | Cons |
| --- | --- | --- |
| Integer paise + date strings (chosen) | Exact; no TZ drift | Conversion at the edges |
| Decimal128 | Exact | Awkward in JS |
| JS numbers in rupees / Date objects | Easy | Rounding and TZ bugs |

## Consequences

- Positive: exact totals; nights never shift.
- Trade-off: formatting helpers needed in the UI.
- Follow-up: GST rules use basis points (Stage 05).

## Validation

`tests/b2b/core-money.test.js`, `core-dates.test.js`.
