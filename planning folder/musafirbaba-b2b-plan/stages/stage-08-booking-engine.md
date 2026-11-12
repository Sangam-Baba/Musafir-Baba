# Stage 08 — Booking Engine (website first)

| | |
| --- | --- |
| **Phase** | A — hotels + website (working system) |
| **Duration** | ~2.5 weeks |
| **Depends on** | Stages 04–07 |
| **Modules** | `orders`, `hotel-booking`, `documents`, `notifications` |
| **Apps** | `website` (checkout), business area `/hotel` (new booking alerts), `admin` (order explorer) |
| **Closes** | D13 (instant confirmation) |
| **Must read** | **`05-inventory-and-no-double-booking.md`** |

## 1. Goal

A website customer books a hotel, pays by PayU, and gets a confirmed booking with voucher, GST invoice and receipt; the hotel is alerted immediately. **No double booking, no lost money**, under concurrency and failures. The engine is built **for all channels from day one** (one engine, `OrderItemHandler`, payment modes as strategies), so B2B dashboard bookings with wallet/credit (Stage 12) and API bookings (Stage 14) plug in without changing it.

## 2. Scope

**In:** order + hotel booking aggregates, item-handler interface, checkout flow (create order with hold → pay → confirm), **PayU payment path**, timers from `05-…` §6, late-payment handling, sweeper/reconciler, safety limits, documents (voucher, tax invoice, receipt), notifications (customer, hotel) with escalation, website checkout UI, admin order explorer.
**Out:** wallet/credit payment path and client-branded vouchers (Stage 12), cancellation & amendments (Stage 09), webhooks (Stage 14 — events already emitted).

## 3. Work breakdown

1. **orders module**: `ord_orders` (multi-party ownership: `channel`, `clientOrgId` or `customerId`/`guestSessionId`, plus `hotelOrgId`s of items), statuses per `04-domain-model.md` §7.3, references `MBO-…`, item-handler registry, **payment-mode strategy interface** (`GATEWAY` implemented now; `WALLET`/`CREDIT` in Stage 12).
2. **hotel-booking module**: `hbk_bookings` with rooms, guests, nightly breakdown, snapshots (price, policy, property), statuses §7.4; implements `OrderItemHandler` (prepare = verify token + re-price + `holdRooms`; confirm = `confirmHold`; release = `releaseHold`).
3. **Create order** `POST /orders` (Idempotency-Key required): price token(s) + guests per room (lead guest name required) + contact + special requests (≤ 500 chars) + payment mode. In **one transaction**: verify token → re-price (mismatch → `PRICE_CHANGED`) → create order `AWAITING_PAYMENT` → create booking `HELD` → `holdRooms` (15 min) → outbox. Returns payable + next step.
4. **Pay — PAYU** `POST /orders/{ref}/payments`: extend hold if < 5 min left; intent with window `min(12 min, holdExpiresAt − 2 min)`; return PayU checkout data. On callback/webhook: verify hash → PayU verify API confirms success, amount and `txnId` → one transaction: `confirmHold` + order `AWAITING_PAYMENT → CONFIRMED` + journal (gateway clearing → hotel payable + margin revenue + GST). PayU `pending` → order `PAYMENT_PENDING`, hold extended once, poller resolves. Rooms lost → order `FAILED` + **automatic PayU refund** (idempotent, tracked to completion). A gateway order is never `CONFIRMED` before its payment is verified.
5. **Late payment** (PayU success after the hold expired): try `holdRooms` again → if OK confirm; else refund + notify "rooms sold out — your payment of ₹X is being refunded" (with PayU's refund timeline).
6. **Reconciler & sweeper**: every minute — expired holds (Stage 04 sweeper); orders in `AWAITING_PAYMENT` past window with no payment → `EXPIRED`; `PAYMENT_PENDING` orders → PayU verify API (Stage 07 poller); `FAILED` orders → refund status tracked until final; any successful PayU payment without a confirmed or refunded order → alert.
7. **Safety limits**: max concurrent held orders per customer/session and per IP; max order value without admin approval (config); booking endpoint rate limits; velocity alerts.
8. **documents**: HTML templates → PDF in worker (headless Chromium, network disabled); types: `VOUCHER` (MusafirBaba), `TAX_INVOICE` (GSTINs, place of supply, SAC, taxable value, rate, CGST/SGST/IGST, number from gap-free series ≤ 16 chars), `RECEIPT`. Stored with SHA-256; regenerated as new version, never overwritten. Failure to generate never fails a booking (retried, alert after 5 min). (`VOUCHER_CLIENT_BRANDED` added in Stage 12.)
9. **Notifications** (via the notifications service, `11-notifications-and-realtime.md`): customer (email with voucher; in their existing website account), hotel (**in-app with sound**, persistent until acknowledged, + email: new booking, guests, dates, room, special requests, "acknowledge" button). **Escalation** (`11-…` §8): 15 min → repeat alert + email; 30 min → hotel owner; 60 min → ops queue alert so staff call the hotel.
10. **Website checkout UI**: guest/customer details → review (hotel, room, dates, guests, policy, total incl. GST) → PayU → confirmation page; guest checkout allowed; login optional; "processing" state with polling; safe to refresh; hold countdown.
11. **Admin**: order explorer (search by reference, customer, hotel, status), timeline (hold, payment, confirm, documents), actions (release, refund — maker–checker).

## 4. Collections

`ord_orders`, `hbk_bookings`, `hbk_status_history`, `doc_documents`, `doc_number_series`, `doc_templates`.

## 5. API

`POST /orders`, `GET /orders/{ref}`, `POST /orders/{ref}/payments`, `POST /orders/{ref}/extend-hold`, `GET /orders/{ref}/documents`, `GET /documents/{id}/download`; hotel: `GET /hotel/bookings/{ref}`, `POST /hotel/bookings/{ref}/acknowledge`; admin: `/admin/orders`, `/admin/orders/{ref}/timeline`, `/admin/orders/{ref}/actions/*`.

## 6. Events

`orders.order.created|confirmed|failed|expired`, `hotelBooking.booking.confirmed`, `payments.payment.succeeded|pending|failed`, `payments.refund.processed`, `documents.document.generated`, `hotelInventory.inventory.changed`.

## 7. Rules & edge cases

- Same Idempotency-Key → same order. Different key, same token, same buyer within 2 min → `409 DUPLICATE_ORDER_SUSPECTED` with the existing order; the UI asks "You already have an identical booking in progress — create another?" and resends with `confirmDuplicate: true`.
- Hold countdown shown in UI; "extend" only once.
- Customer closes browser during payment → callback/poller still completes; status visible on return and by email.
- Snapshots (price, policy, property name/address/time zone/check-in time) are immutable once confirmed.
- Lead guest names: letters, spaces, `.'-`; length limits.
- Instant confirmation (inventory is ours). On-request hotels later (DEF-003).

## 8. Security

| Threat | Control | Test |
| --- | --- | --- |
| Double booking | `05-…` rules | Full race suite (§9) |
| Price tampering | Token + re-price | Tamper test |
| Double charge | Idempotency keys + verify-before-confirm + idempotent refunds | Replay tests |
| Seeing others' orders | Multi-party ownership checks; guest order access via signed link | Isolation tests |
| Hold exhaustion | Per-session/IP caps, rate limits | Cap test |
| PDF template injection | Escaped templates, no network in renderer | HTML-in-name test |
| Guest PII to wrong hotel | Hotel sees only its own bookings, minimal fields | Isolation |

## 9. Mandatory tests (go-live blockers)

All of `05-inventory-and-no-double-booking.md` §12 (website + admin channels now; B2B channels re-run in Stage 12); PayU success-after-expiry refund path; PayU pending path; duplicate-order guard; ledger postings for a PayU booking match the expected table; invoice numbering gap-free under concurrency.

## 10. Definition of Done

- [ ] Website customer books and pays via PayU; voucher + invoice emailed; booking visible in their existing website dashboard (Stage 09 adds the list)
- [ ] Race suite green; no orphan holds; no confirmed gateway order without a verified payment
- [ ] Hotel receives the booking alert live and acknowledges; escalation fires when it doesn't
- [ ] Admin sees the full timeline and can act with maker–checker
- [ ] A wallet payment strategy can be registered without changing `orders` code (stub test)

## 11. AI editor prompt

```
Read: AGENTS.md, 10-coding-standards.md, 05-inventory-and-no-double-booking.md, 04-domain-model.md §7.3–7.4 & §8.5, this stage §3.1–3.6.
Task: create order (with hold) + PayU payment path (verify server-side, then confirm; refund if rooms lost; pending handling) behind a payment-mode strategy interface.
Constraints: orders uses OrderItemHandler, payments and wallet (ledger) services only; no hotel-catalog imports; no PayU calls inside transactions.
Tests first: PayU happy path; 50 concurrent orders for last room → 1 confirmed; PayU success after hold expiry with rooms gone → refund once; duplicate callback no-op; same idempotency key ×5 → 1 order.
```
