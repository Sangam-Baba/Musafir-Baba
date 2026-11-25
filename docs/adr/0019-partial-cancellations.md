# ADR-0019: Cancelling part of a booking (bus seats)

- **Status:** Accepted (Stage 18 B7, built locally 2026-11-25 — orders / wallet: humans must review)
- **Date:** 2026-11-25

## Context
Bus passengers cancel some seats of a ticket, at the operator's slabs; MusafirBaba ops cancel a booking or a whole trip
with a full refund (plan Stage 18 B7). The order engine's cancellation (Stage 09) cancels a whole booking once: one
ledger reference and one refund key per booking — a second partial cancellation would collide.

## Decision
- **Orders (additive):** `createPartCancellations` — a cancellation is a *part* with its own id: item `partStart` →
  `finishPart` (seats back, one ledger entry `part-cancel/<part id>` = the part's reversal + the refund to the buyer's
  side, refund to the source with key `part:<part id>`, item `partDone`, order CANCELLED when every item is). The
  handler steps are optional (`part*`); hotels keep the Stage 09 whole-booking cancel unchanged. `cancelPart` always
  reloads the stored order (its payment decides where the refund goes). A reconciler job finishes parts left PENDING.
- **Bus terms:** each operator sets slabs ("within N hours of departure → P %"), default placeholder until it does;
  a booking keeps the slabs it was sold with. Charge = P % of what was paid for the seats (sell + GST); refund = the
  rest. The bus company keeps its share of the charge (its net ÷ paid — same rule as hotels, D5); GST and margin are
  reversed pro rata. The per-booking fee is refunded only when ops cancel every seat. Buyers can't cancel after the bus
  left their boarding stop.
- **Ops full refunds:** one booking or a whole trip; proposer ≠ approver; runs once (the trip is cancelled first, then
  each confirmed booking); results per booking are kept.

## Consequences
- Bus credit notes come with the bus invoices (DEF-046).
- Operator payables follow the cancellations (B7 payouts).
