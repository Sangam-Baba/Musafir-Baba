# Stage 09 — After Booking & Hotel Operations (end of Phase A → Pilot 1)

| | |
| --- | --- |
| **Phase** | A — hotels + website (working system) |
| **Duration** | ~2.5 weeks |
| **Depends on** | Stage 08 |
| **Modules** | `hotel-booking`, `orders`, `payments`, `wallet` (ledger), `documents`, `notifications`, `reporting` |
| **Apps** | `website` (hotel bookings in the existing customer bookings page), business area `/hotel` (bookings inbox, statements), `admin` (queues) |
| **Closes** | D5 (cancellation revenue/GST, with CA) |

## 1. Goal

The working system is complete: website customers find, cancel and get refunds for their bookings; hotels manage arrivals, no-shows and problems; ops handle exceptions; hotel payables are tracked so finance can pay hotels. **Pilot 1 (hotels + website customers) starts at the end of this stage.**

## 2. Scope

**In:** bookings read model (product-agnostic, used later by B2B), hotel bookings in the existing website dashboard, booking detail, cancellation quote + cancellation with PayU refund, credit notes, amendment tickets for website customers, hotel bookings inbox (arrivals, acknowledge, no-show with dispute window), hotel "cannot honour" flow, completion job, **basic hotel settlements** (payables + manually recorded payouts + statement CSV), admin queues.
**Out:** client My Bookings, wallet refunds, offline bookings for clients, exports for clients (Stage 12); formal payout runs, deductions, GST registers (Stage 15); automated amendments (DEF-004); partial cancellation (DEF-005).

## 3. Work breakdown

1. **Read model** `rpt_booking_summaries` (from events): order ref, product type, booking ref, lead guest, destination, property, check-in/out, booking status, payment status, total, channel, client/branch/created-by (filled from Stage 12). Fast lists for every product and channel later.
2. **Website customers**: hotel bookings appear in the **existing** website bookings page (`(user)/bookings`) next to their other bookings — via `GET /api/v1/bookings/hotels` with the customer's existing token; guests use the signed link from their email. Documents and cancel from there. No new customer dashboard (D18).
3. **Booking detail**: summary, guests, rooms, policy (deadline in hotel time and viewer's time), price breakdown per permission, payments/refunds timeline, documents, history, tickets.
4. **Cancellation**:
   - `POST /bookings/hotels/{ref}/cancellation-quote` → charge/refund per `04-domain-model.md` §8.4 → signed quote (5 min).
   - `POST /bookings/hotels/{ref}/cancel` (Idempotency-Key + quote) → one transaction: state `CONFIRMED → CANCELLED` (optimistic lock), `returnRooms`, journal reversal per D5, refund record → after commit: PayU refund to source; credit note; notifications (customer, hotel).
   - Non-refundable → quote shows 100 % charge; explicit confirmation.
   - After check-in date → online cancel off; request only.
5. **Amendments** (tickets): types `MODIFY_DATES`, `MODIFY_GUESTS`, `UPGRADE_ROOM`, `REFUND_REQUEST`, `OTHER`; customer form + email thread (unique reply-to per ticket, inbound email attached via `files` scan); ops queue with SLA; guest-name changes applied directly (audited); date/room changes = guided cancel + rebook with price difference handled by ops (maker–checker). (Client tickets added in Stage 12 — same module.)
6. **Hotel inbox**: today's arrivals, upcoming, departures, cancellations; acknowledge; print arrival list; **no-show** after check-in day (hotel time) → `NO_SHOW` with penalty per policy, 72 h dispute window, ops resolves.
7. **Hotel cannot honour** (overbooked/closed): hotel or ops marks `HOTEL_FAILED` → ops relocates (new booking via engine, price difference absorbed per contract) or full refund; adjustment/penalty against hotel payable; notifications.
8. **Completion job**: daily after check-out (hotel time) → `COMPLETED` → payable becomes **eligible**.
9. **Basic hotel settlements** (until Stage 15): `wal_payables` per booking (`PENDING → ELIGIBLE → PAID`, adjusted by cancellations/no-shows/failures); finance **records** a payout made by bank transfer (amount, UTR, date — maker–checker) → journal `HOTEL_PAYABLE → BANK`; hotel sees a statement (bookings, adjustments, paid) with CSV download.
10. **Credit notes**: gap-free series `C2627DL000045`, linked to original invoice.
11. **Admin queues**: cancellations monitor, amendments (SLA colours), no-show disputes, hotel failures, payables due, manual refunds (maker–checker).

## 4. Collections

`rpt_booking_summaries` (indexes: `{customerId, createdAt:-1}`, `{hotelOrgId, checkInDate}`, `{clientOrgId, createdAt:-1}`, text on lead guest + reference), `hbk_cancellations`, `hbk_amendments`, `hbk_no_shows`, `hbk_hotel_failures`, `wal_payables`, `wal_manual_payouts`.

## 5. API

Website: `GET /bookings/hotels`, `GET /bookings/hotels/{ref}`, `POST /{ref}/cancellation-quote`, `POST /{ref}/cancel`, `POST /{ref}/amendments`, `GET/POST /amendments/{id}/messages`.
Hotel: `GET /hotel/bookings?view=…`, `POST /{ref}/acknowledge`, `POST /{ref}/no-show`, `POST /{ref}/cannot-honour`, `GET /hotel/statements`.
Admin: `/admin/amendments`, `/admin/no-show-disputes`, `/admin/hotel-failures`, `/admin/cancellations`, `/admin/payables`, `/admin/manual-payouts`.

## 6. Rules & edge cases

- Two cancellations at once → one wins (version check), the other sees current state.
- Refund to source per PayU refund timelines (shown to the customer).
- No-show marking only from check-in day 12:00 hotel time (configurable) until check-out day.
- A payable is never paid twice: recorded payouts are matched to eligible payables and locked.

## 7. Security

| Threat | Control | Test |
| --- | --- | --- |
| Cancelling others' bookings | Ownership checks, signed guest links | Isolation |
| Refund manipulation | Signed quote; server computes; checker above threshold | Tamper test |
| Email ticket spoofing | Per-ticket reply token, SPF/DKIM check, attachment scan | Tests |
| False no-show by hotel | Dispute window, ops review | Workflow test |
| Payout recording fraud | Maker–checker, step-up, audit, bank-change 72 h hold | Tests |

## 8. Mandatory tests

Cancellation table tests (all penalty types, buffer, `Asia/Kolkata` deadline ± 1 s); cancellation returns rooms exactly once; refund + charge = paid; credit note numbering; read-model rebuild from events gives same rows; payables adjust correctly on cancel/no-show/failure; recorded payout can't exceed eligible payables.

## 9. Definition of Done

- [ ] Website customer sees, cancels and gets refunded for a hotel booking from the existing website dashboard
- [ ] Amendment round trip via website form and email
- [ ] Hotel inbox: acknowledge, no-show, cannot-honour flows work
- [ ] Completed bookings make payables eligible; finance records a payout; hotel downloads its statement
- [ ] Pilot 1 checklist (§10) complete

## 10. Pilot 1 checklist — hotels + website (2–3 weeks)

- [ ] 15–30 contracted hotels LIVE with 90 days of rooms and rates (allotment agreed in contract)
- [ ] Website hotel booking enabled for pilot cities (feature flag)
- [ ] Race suite and invariant checker green on production data nightly
- [ ] Ops trained: hotel KYC, listings, amendments, refunds, hotel failures, recording payouts
- [ ] Daily review of bookings, failures, support tickets; weekly fix release
- [ ] CA answers for Q1–Q3 applied (D4, D10, D20)

## 11. AI editor prompt

```
Read: AGENTS.md, 10-coding-standards.md, 04-domain-model.md §7.4 & §8.4, 05-inventory-and-no-double-booking.md §5.3, this stage §3.4.
Task: cancellation quote (signed) + cancel transaction (state change, returnRooms, journal reversal, refund record) + post-commit PayU refund + credit note event.
Constraints: hotel-booking + orders; payments/wallet/documents via services/events.
Tests first: charge table (PERCENT/NIGHTS/FIXED/buffer/deadline ±1s); expired quote rejected; concurrent cancel → one wins; rooms returned once; refund + charge = paid.
```
