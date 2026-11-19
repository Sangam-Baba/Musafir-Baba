# Stage 08 — Booking engine (website first) · Progress

> Task list from `docs/plan/stages/stage-08-booking-engine.md` §3, split so each task fits one reviewable change. Rules and status values: `docs/progress/README.md`. Must read: `docs/plan/05-inventory-and-no-double-booking.md`.

| | |
| --- | --- |
| **Status** | IN_PROGRESS |
| **Phase · Track** | A · hotels + website |
| **Owner(s)** | |
| **Started** | 2026-11-19 |
| **Finished** | — |
| **Plan file** | `docs/plan/stages/stage-08-booking-engine.md` |
| **Depends on** | Stages 04 (holds), 05 (price tokens), 06 (price check), 07 (PayU, ledger) |
| **Modules** | `orders` (new), `hotel-booking` (engine added beside booking requests), `documents` (new), `notifications` (new templates) |

## Defaults used for this stage (owner / CA can change any of them)

| Topic | Default |
| --- | --- |
| Who books | Website visitors — signed in to their existing website account **or as a guest** (no account needed). A guest gets a private link to the order (secret key in the link, only its fingerprint stored) |
| Payment | PayU only (existing merchant account, Stage 07). Wallet / credit plug in at Stage 12 part B through the same payment-mode interface |
| Hold and payment window | Rooms held 15 min when the order is created; PayU window = `min(12 min, hold end − 2 min)`; extended once by 10 min if < 5 min remain when payment starts (`05-…` §6) |
| Paid after the rooms were released | One new hold is tried; if the rooms are gone the order fails and the payment is **refunded automatically** to the source (once) and the customer told |
| Ledger at confirmation (principal, D4) | customer advances (total) → hotel payable (hotel rate + hotel's GST on it) + GST payable (CGST / SGST or IGST on our price) + margin revenue (the rest). **CA to review** — the hotel's GST might instead be input tax credit |
| Documents | **Voucher, GST tax invoice and receipt as printable HTML pages** (escaped, no outside resources, SHA-256 stored, new version on regeneration — never overwritten); "Download" opens the page and the browser's **Save as PDF** makes the file. Server-side PDF would need a headless Chrome inside the existing server — **deferred (DEF row)**, no new package |
| Invoice numbers | Gap-free series per financial year, e.g. `MB/25-26/000123` (≤ 16 characters) from the Delhi registration (Stage 05 issuer `07`) |
| Safety limits | At most 3 open orders per buyer (customer / guest) and 5 per IP; order value above ₹5,00,000 refused online ("call us"); booking endpoints rate-limited |
| Hotel alert | In-app (sound, stays until acknowledged) + email to the hotel's people; not acknowledged in 15 min → again; 30 min → hotel owner; 60 min → MusafirBaba operations queue |

## Tasks

| ID | Task | Plan ref | Status | Owner | PR | Tests | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S08-T01 | `orders` module: `ord_orders` (multi-party owners, statuses, `MBO-…`), item-handler registry, payment-mode strategy interface (GATEWAY now) | §3.1 | DONE | AI (Claude) | | 1 ✅ | Module `orders`: pure rules (statuses `HOLDING → AWAITING_PAYMENT → (PAYMENT_PENDING) → CONFIRMING → CONFIRMED`, `EXPIRED`, `FAILED`, `CANCELLED`, `COMPLETED`; timers of `05-…` §6 as `paymentPlan`; buyer input checks — names letters / spaces / `.'-`), `ord_orders` (migration `0051`; owners `clientOrgId` / `customerId` / `guestKey` + `hotelOrgIds`; reference `MBO-…`; unique idempotency key), **item-handler and payment-mode registries** (a WALLET mode registers without changing orders code — tested), PayU `GATEWAY` mode (intent window ≤ hold, debit = customer advances, refund to source). Permissions `orders.admin.read / act` (Operations; Finance and Support read) |
| S08-T02 | `hotel-booking` engine: `hbk_bookings` + `hbk_status_history` (rooms, guests, nightly breakdown, price / policy / property snapshots), hotel item handler (prepare = token + re-price + hold; confirm; release) | §3.2 | DONE | AI (Claude) | | with T03 | `hbk_bookings` (`0052`, owners hotel + buyer, reference `MBH-…`, one per order) + `hbk_status_history` (`0053`). Hotel item handler: `price` (Stage 06 **booking quote** — the same token re-check as the price check, plus the full breakdown; changed price / sold out refused before anything is taken), `prepare` (hotel-inventory `holdRooms`, booking `HELD` with copies of the property — address, time zone, check-in time —, room / plan names, **full cancellation terms** and the price breakdown), `confirm`, `rehold` (paid late), `release`, `extend`, `abandon`, ledger lines (hotel payable = rate + its GST, GST payable, margin = the rest; the hotel's payable account opened if missing), buyer / admin views. Small additions beside existing code: catalogue `bookingFacts`, plan terms `policyOf`, hold `holdOfOrder`, payments intent `windowMinutes` (default unchanged). Permissions `hotel-booking.booking.read / acknowledge` |
| S08-T03 | `POST /orders` (Idempotency-Key, guests, contact, requests; duplicate guard; HOLDING reconciler) + `GET /orders/{ref}` (owner or guest link) | §3.3, §7 | DONE | AI (Claude) | | 7 ✅ | `POST /orders` (public — guests with an `X-Guest-Session` browser id, or signed-in website customers; `Idempotency-Key` required → `withIdempotency`; search gateway per-IP limit; B2B members → 403 `USE_BOOKING_REQUESTS` until Stage 12 B): price check → order `HOLDING` → rooms held + booking `HELD` → `AWAITING_PAYMENT` (+ `orders.order.created`), 15-min hold; returns the buyer view (no hotel rate / margin) and the **order link key** (derived from the server secret + reference — nothing secret stored). Same key ×5 at once → 1 order, 1 hold; same token + new key within 2 min → 409 `DUPLICATE_ORDER_SUSPECTED` (+ `confirmDuplicate`). `GET /orders/:ref`: same guest session, link key or signed-in customer; others 404. Reconciler `orders-holding` (> 1 min) → rooms back, order + booking FAILED. Orders and bookings added to the event relay |
| S08-T04 | Pay with PayU: `POST /orders/{ref}/payments`, `extend-hold`; payment verified → confirm rooms → ledger → CONFIRMED; pending; rooms lost → refund; CONFIRMING reconciler | §3.4 | DONE | AI (Claude) | | 4 ✅ | `POST /orders/:ref/payments` (the buyer; Idempotency-Key; only `AWAITING_PAYMENT`; < 5 min of hold left → extended once first; window = min(12 min, hold end − 2 min) — the intent's own window too; ≤ 5 attempts) → the PayU form for the server's amount, returning to `/hotels/booking/<ref>?key=…`. `POST /orders/:ref/extend-hold` (once, +10 min). PayU's answers as **events** (never the browser): `payments.intent.succeeded` → order `CONFIRMING` (verified) → rooms booked → **one ledger entry** (Dr customer advances; Cr hotel payable, GST payable, margin — tested against the table) → `CONFIRMED` (+ `orders.order.confirmed`); repeats change nothing; a second successful payment → refunded (`extra:<txn>`). New payments events `payments.intent.pending` (once → order `PAYMENT_PENDING`, hold extended once) and failed → back to `AWAITING_PAYMENT`. Reconciler `orders-confirming` (> 30 s) finishes forward. Consumers and rules registered at background start |
| S08-T05 | Late payment: success after the hold expired → re-hold once → confirm, else refund + tell the customer | §3.5 | DONE | AI (Claude) | | 3 ✅ | Paid after the hold was given back: the booking waits as `EXPIRED`, one new hold is tried → confirmed; rooms gone → items and order `FAILED` (`ROOMS_LOST`), refund to the source once (`rooms-lost`, key recorded in the order before PayU is asked). A payment for an order that already failed → refunded (`order-failed`). Stage 07 change: an **order's** payment confirmed after its window no longer refunds at once — `payments.intent.paid-late` lets the order try the rooms first (other purposes unchanged; Stage 07 test updated). Two workers holding again at once never give back the winner's hold. Customer notice comes with S08-T09 |
| S08-T06 | Sweeper / reconciler / alerts: expired orders, pending orders, refunds followed, paid-but-not-confirmed alert, invariants (no confirmed gateway order without a verified payment; booked nights belong to confirmed bookings) | §3.6 | DONE | AI (Claude) | | 3 ✅ | Sweeper `orders-sweeper` (every 30 s, lease-locked): unpaid orders whose hold ended → `EXPIRED` (+ `orders.order.expired`), rooms back, booking `EXPIRED` (a later payment goes the late path); failed paid orders whose refund was never asked → asked once (`payment.refundRequested`). Checks every 10 min: no confirmed gateway order without a verified payment; no order stuck in a middle step (> 5 min); no PayU order payment older than 10 min that is neither its order's confirmed payment nor refunded. Pending orders: the Stage 07 poller (already running). The "booked nights belong to confirmed bookings" inventory check moves to S08-T12 with the race suite |
| S08-T07 | Safety limits: open orders per buyer / IP, order value limit, rate limits, velocity alert | §3.7 | TODO |  | |  |  |
| S08-T08 | `documents`: voucher, GST tax invoice (gap-free series), receipt — HTML, versioned, hashed; `GET /orders/{ref}/documents`, `GET /documents/{id}/download` | §3.8 | TODO | | | | |
| S08-T09 | Notifications: customer email (with documents), hotel in-app alert + email, acknowledge (`/hotel/bookings/{ref}`), escalation 15 / 30 / 60 min | §3.9 | TODO | | | | |
| S08-T10 | Website checkout: guest / customer details → review → PayU → confirmation page (processing state, safe to refresh, hold countdown, duplicate question) | §3.10 | TODO | | | | |
| S08-T11 | Admin order explorer: search, timeline, actions (release, refund — maker–checker) | §3.11 | TODO | | | | |
| S08-T12 | Mandatory test suite (`05-…` §12 for website + admin channels, late payment, pending, duplicate guard, ledger table, invoice numbers under concurrency) | §9 | TODO | | | | |

Status: `TODO` · `DOING` · `REVIEW` · `DONE` · `BLOCKED` · `DEFERRED` (needs a `DEF-…` row) · `DROPPED` (reason in Notes)

## Definition of Done (copied from the stage file)

- [ ] Website customer books and pays via PayU; voucher + invoice emailed; booking visible in their existing website dashboard (Stage 09 adds the list)
- [ ] Race suite green; no orphan holds; no confirmed gateway order without a verified payment
- [ ] Hotel receives the booking alert live and acknowledges; escalation fires when it doesn't
- [ ] Admin sees the full timeline and can act with maker–checker
- [ ] A wallet payment strategy can be registered without changing `orders` code (stub test)

## Mandatory tests (copied from the stage file)

- [ ] All of `05-inventory-and-no-double-booking.md` §12 (website + admin channels)
- [ ] PayU success-after-expiry refund path
- [ ] PayU pending path
- [ ] Duplicate-order guard
- [ ] Ledger postings for a PayU booking match the expected table
- [ ] Invoice numbering gap-free under concurrency
