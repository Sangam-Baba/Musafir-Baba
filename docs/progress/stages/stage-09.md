# Stage 09 — After booking & hotel operations · Progress

> Task list from `docs/plan/stages/stage-09-after-booking-hotel-ops.md` §3, split so each task fits one reviewable change. Rules and status values: `docs/progress/README.md`. Pilot 1 starts at the end of this stage.

| | |
| --- | --- |
| **Status** | IN_PROGRESS |
| **Phase · Track** | A · hotels + website |
| **Owner(s)** | |
| **Started** | 2026-11-21 |
| **Finished** | — |
| **Plan file** | `docs/plan/stages/stage-09-after-booking-hotel-ops.md` |
| **Depends on** | Stage 08 |
| **Modules** | `hotel-booking` (cancellations, amendments, no-shows, hotel failures, inbox), `orders`, `payments`, `wallet` (payables, recorded payouts), `documents` (credit notes), `notifications`, `reporting` (new — booking summaries) |

## Defaults used for this stage (owner / CA can change any of them)

| Topic | Default |
| --- | --- |
| Cancellation charge (D5) | **Owner, 21 Nov 2026:** split **pro rata** — the hotel keeps its share of the charge (hotel payable ÷ booking total), MusafirBaba the rest; the refunded part's GST reversed with a credit note. Buffer hours 0. CA to review |
| Where customers see hotel bookings | **Owner, 21 Nov 2026:** a **new page `/hotels/my-bookings`** (signed-in customers: their bookings; guests: through the order link from the email). The existing website bookings page is **not** touched (approved edit E2 waits for the owner's yes) |
| Charge rules | As `04-…` §8.4: the strictest rule whose deadline has passed (hotel time, check-in time) — percent of what was paid, the first N nights, or a fixed amount — never more than paid. A signed quote valid 5 minutes |
| Online cancel | Until the check-in day (hotel time); after that, a request ticket only. Partial cancellation deferred (DEF-005 in the plan) |
| Amendments | Tickets with messages on the website and in admin; email notices go out. **Replies by email (inbound mail) are deferred** — it needs a mail-receiving setup on the existing email account |
| No-show | Marked by the hotel from 12:00 on the check-in day (hotel time) until check-out day; 72-hour dispute window; ops resolve |
| Hotel payouts | Recorded by finance after a bank transfer (amount, UTR, date) with a second person; never more than the eligible payables; formal payout runs in Stage 15 |

## Tasks

| ID | Task | Plan ref | Status | Owner | PR | Tests | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S09-T01 | Setup: task list, defaults, D5 recorded | §3 | DONE | AI (Claude) | | — | D5 (owner, for now): pro rata. Customer page separate from the existing bookings page (E2 not used) |
| S09-T02 | Read model `rpt_booking_summaries` from events (+ rebuild) | §3.1 | DONE | AI (Claude) | | 1 ✅ | Module `reporting` (`rpt_booking_summaries`, migration `0058`; permission `reporting.bookings.read`): one row per booking — order and booking references, product, channel, buyer (customer / guest / client, branch and created-by for Stage 12), hotel, property, destination, lead guest, dates, booking / order status, payment state (unpaid / paid / partly refunded / refunded), total, refunded. Every order or booking event replaces the order's rows from the current order (repeats, late or out-of-order events → same rows); a full rebuild (daily, in batches) gives the same rows (tested). Indexes per plan incl. text search on guest and references. The module never reads order or booking collections — the rows come from a function wired at start-up |
| S09-T03 | Customer bookings: `GET /bookings/hotels`, detail (policy deadline in hotel and viewer time, payments / refunds, documents); website page `/hotels/my-bookings` | §3.2, §3.3 | DONE | AI (Claude) | | 4 ✅ + tsc ✅ | `GET /bookings/hotels` (the signed-in website customer — their **existing website login**, read only — or this browser's guest id; from the booking summaries) and `GET /bookings/hotels/:ref` (the buyer only: customer, guest id or the order link key; others 404): the booking, the order, **cancellation terms** from the policy copy — check-in moment, free-until and each step as a moment and in hotel time, what cancelling now would cost, whether online cancel is still open (confirmed, before the check-in day in hotel time) —, payments and refunds (no internal ids), documents. Both behind the online-booking switch. Charge rules (pure, shared with T04): strictest rule whose deadline has passed (only after its exact moment), percent / first N nights (price + GST) / fixed, capped at what was paid, buffer hours (0 for now), non-refundable = 100 %; D5 split helper (hotel's share = payable ÷ total). Website: **`/hotels/my-bookings`** and **`/hotels/my-bookings/<ref>`** (deadlines in hotel time and the viewer's time); website calls now carry the customer's existing login when signed in, so their orders belong to their account (guests unchanged). The existing bookings page is untouched |
| S09-T04 | Cancellation quote: charge table (percent / nights / fixed, buffer, deadline), signed quote (5 min) | §3.4 | DONE | AI (Claude) | | 3 ✅ (+ quote) | Charge table (`04-…` §8.4) as pure rules: deadline = check-in (hotel date + check-in time, default 14:00, in the hotel's time zone) − rule hours − buffer; the strictest rule whose deadline has passed — only **after** its exact moment (tested at −1 s / 0 / +1 s in `Asia/Kolkata`); PERCENT of what was paid, the first N nights (price + GST, all rooms of a night), FIXED; capped at what was paid; non-refundable = 100 %; charge + refund = paid. `POST /bookings/hotels/:ref/cancellation-quote` (the buyer only): **signed quote valid 5 minutes** (HMAC, own derived key) carrying the booking, charge, refund and the booking's status time — refused if edited, for another booking, expired, or the booking changed since; only for confirmed bookings before the check-in day (hotel time) → else `CANCEL_ONLINE_CLOSED`. D5 split helper ready for the ledger (hotel's share of the charge = its payable ÷ total) |
| S09-T05 | Cancel: `CANCELLING` → rooms back → ledger reversal (pro rata) → refund to source → `CANCELLED`; reconciler; customer + hotel notices; website cancel screen | §3.4 | DOING | AI (Claude) | |  |  |
| S09-T06 | Credit notes: gap-free series linked to the invoice | §3.10 | TODO | | | | |
| S09-T07 | Amendment tickets: types, messages, ops queue with SLA, guest-name change applied | §3.5 | TODO | | | | |
| S09-T08 | Hotel inbox views (arrivals, upcoming, departures, cancellations, arrival list) + no-show with 72 h dispute | §3.6 | TODO | | | | |
| S09-T09 | Hotel cannot honour → `HOTEL_FAILED` → ops relocate or refund; payable adjustment | §3.7 | TODO | | | | |
| S09-T10 | Completion job + payables `wal_payables` (pending → eligible → paid, adjustments) | §3.8, §3.9 | TODO | | | | |
| S09-T11 | Recorded payouts (two people, journal payable → bank, payables locked) + hotel statement with CSV | §3.9 | TODO | | | | |
| S09-T12 | Admin queues: cancellations, amendments (SLA), no-show disputes, hotel failures, payables, payouts | §3.11 | TODO | | | | |
| S09-T13 | Mandatory test suite | §8 | TODO | | | | |

Status: `TODO` · `DOING` · `REVIEW` · `DONE` · `BLOCKED` · `DEFERRED` (needs a `DEF-…` row) · `DROPPED` (reason in Notes)

## Definition of Done (copied from the stage file)

- [ ] Website customer sees, cancels and gets refunded for a hotel booking from the existing website dashboard (owner: a separate page for now)
- [ ] Amendment round trip via website form and email
- [ ] Hotel inbox: acknowledge, no-show, cannot-honour flows work
- [ ] Completed bookings make payables eligible; finance records a payout; hotel downloads its statement
- [ ] Pilot 1 checklist (§10) complete

## Mandatory tests (copied from the stage file)

- [ ] Cancellation table tests (all penalty types, buffer, `Asia/Kolkata` deadline ± 1 s)
- [ ] Cancellation returns rooms exactly once
- [ ] Refund + charge = paid
- [ ] Credit note numbering
- [ ] Read-model rebuild from events gives same rows
- [ ] Payables adjust correctly on cancel / no-show / failure
- [ ] Recorded payout can't exceed eligible payables
