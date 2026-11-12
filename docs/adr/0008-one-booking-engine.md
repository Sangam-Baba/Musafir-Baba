# ADR-0008: One booking engine for all channels

| | |
| --- | --- |
| **Status** | Accepted |
| **Date** | 2026-11-12 |
| **Deciders** | Owner + tech lead |
| **Stage** | Stage 00 |

## Context

Website, B2B dashboard, B2B API and admin offline bookings all sell the same rooms.

## Decision

All channels call the same orders engine and the same inventory primitives; no channel has its own shortcut. Payment modes plug in as strategies (gateway now, wallet/credit in Stage 12).

## Options considered

| Option | Pros | Cons |
| --- | --- | --- |
| One engine (chosen) | No double booking across channels | Engine must stay channel-agnostic |
| Engine per channel | Faster per channel | Inventory drift, double booking |

## Consequences

- Positive: one place to make correct.
- Trade-off: careful interface design (Stage 08).
- Follow-up: mixed-channel race tests (Stage 12).

## Validation

Mixed-channel last-room race (Stage 12 §8).
