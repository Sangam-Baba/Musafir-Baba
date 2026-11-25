# ADR-0018: Bus bookings in the order engine and the ledger

- **Status:** Accepted (Stage 18 B6, built locally 2026-11-25 — orders / payments / wallet: humans must review)
- **Date:** 2026-11-25

## Context
Bus seats are bought like hotel rooms: one order, held while paying, paid by PayU (website) or wallet / credit (B2B),
confirmed only after the payment is verified (plan Stage 18 B6). The order engine already had the plug-in point for this
(item handlers) but a few places assumed hotels.

## Decision
- **Orders (additive):** item type `BUS`; an item's `hotelOrgId` is required only for `HOTEL` items; a new optional
  `supplierOrgId` names the bus company (never put in `hotelOrgIds`, so hotel filters, owners and notices are unchanged);
  order creation uses the handler of the item's own type (it was fixed to `HOTEL`); the buyer-input check skips the
  room-name check when there are no rooms. Everything else in the engine (pay, confirm, rehold, expire, reconcile,
  refund when the item is lost after payment) already went through `item.type` and is unchanged.
- **The BUS handler** (`bus-booking`) prices on the server (passengers checked, ladies seats only for women, the buyer's
  expected total only guards against a changed price), holds seats through bus-inventory (15 minutes, the breakdown
  stored on the booking = the price lock), confirms the hold to BOOKING, holds again when paid late, gives back on
  expiry / failure / abandoned checkout. Cancellations are refused until B7.
- **Ledger:** new account type `OPERATOR_PAYABLE` (owner type `BUS_OPERATOR`) for the bus company's net fares, kept
  apart from the hotel `PAYABLE` so hotel payables, payout runs and reports never include bus money. A confirmed bus
  booking posts: payment debit (by the payment mode) = Cr operator payable + Cr GST payable + Cr margin.
- **Documents / emails:** bus orders don't get the hotel voucher / invoice / receipt (skipped by the documents jobs, no
  false "missing" alerts); the bus e-ticket is the order's bus view (printable). Hotel customer emails skip bus orders;
  bus buyers get their own e-ticket and "seats gone — refund" emails.
- **Routes:** `POST /client/bus-orders` (wallet / credit / PayU via the existing pay route) and `POST /bus-orders`
  (website customers and guests, PayU), behind `B2B_ORDERS_ENABLED` + `B2B_BUS_ENABLED` + `B2B_BUS_SELLING_ENABLED`.
  The BUS handler is always registered so orders already made can be finished or given back even if the switches go off.

## Consequences
- Bus GST invoices / receipts wait for the CA's answer on bus GST (DEF-046).
- Paying operators (payables per booking, payout runs) comes in B7 with supplier-generic payables.
