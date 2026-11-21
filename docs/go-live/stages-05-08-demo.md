# Go-live runbook — Stages 05–08 with hidden demo data

> For whoever runs the production server. Owner decisions (20 Nov 2026): **hidden demo data** (never shown on the public
> website or to real clients) and **payments off**. Every step is reversible; nothing existing is changed.

## What goes live

On top of Stages 00–04 (already live):

| Area | What people can do |
| --- | --- |
| Pricing & GST (05) | Admin → Pricing: margin rules with approval, price simulator, GST rates and settings |
| Search (06) | Hotel search and hotel pages with live rooms and prices (website pages exist but aren't linked from the home page) |
| B2B clients (10) | Clients register, get verified, are put in a category |
| B2B dashboard (12 A) | Clients search hotels with B2B prices and their own selling price, set their markup, **send booking requests**; admin → Requests handles them |
| Payments & ledger (07) | Admin → Finance: accounts, corrections (two people), payments, refunds, reconciliation. **Payments stay switched off** |
| Booking engine (08, half built) | The code is there but **switched off** (`B2B_ORDERS_ENABLED` not set): nobody can hold rooms or book online yet |

## 0. Before you start

- [ ] Owner OK to push the branch and merge (each push needs an explicit OK).
- [ ] A fresh production database backup exists.
- [ ] A quiet time (the backend restarts once when `main` changes).

## 1. Get the code onto `main`

- Push `b2b/stage-00` and merge it into `main` (fast-forward). The backend workflow rebuilds the server; Vercel deploys
  the website from `main`.
- Smoke check the existing system: `/api/app-home` → 200, website home and package pages, admin login, MBGO / MBConnect.

## 2. Server settings — nothing new

Leave these **unset** for this demo:

| Setting | Effect while unset |
| --- | --- |
| `B2B_API_PUBLIC_URL` | Payments stay off (503 `PAYMENTS_NOT_CONFIGURED`); no PayU checkout can start |
| `B2B_ORDERS_ENABLED` | Online booking stays off (503 `ORDERS_NOT_ENABLED`) |

The existing `PAYU_*` settings are only read. One daily read-only call asks PayU for yesterday's settlement report; with no
B2B payments it finds nothing.

## 3. New collections (once)

```bash
docker exec musafirbaba-backend node src/b2b/migrate.js
```

Expect "applied: 0035 … 0053" (pricing, client categories, booking requests, ledger, payments, orders, bookings). Only new
prefixed collections and indexes; existing collections are never touched. On start the server also adds the starter GST
rates, margin rules, pricing settings, client categories and MusafirBaba's ledger accounts (adds only what is missing).

Check: `curl -s https://musafirbabaserver.3mongoose.online/api/v1/health` → `"status":"ok"`.

## 4. Add the demo data

```bash
docker exec musafirbaba-backend node src/b2b/demo.js add
```

It prints two logins and one password (keep it):

| Login | What it is |
| --- | --- |
| `demo.hotel@example.com` | Owner of **Demo — Sea Breeze Hotels**: 3 live properties (Mumbai, Goa, Jaipur), 2 room types, 2 rate plans each, 90 days of rooms and prices |
| `demo.client@example.com` | Owner of **Demo — Wanderlust Travels**, a verified B2B client in the hidden category **Demo (internal)** |

Who sees the demo hotels: the demo client and MusafirBaba admins only — **not** the public website, **not** real clients.
Everything is named "Demo — …"; the `@example.com` emails never receive mail.

## 5. Try it

1. `musafirbaba.com/business` → sign in as the **demo client** → Search Hotels → Mumbai / Goa / Jaipur → a hotel → rooms
   with B2B price + GST; switch on **My selling price** after setting **My Markup**; **Request booking**.
2. Admin `/admin/b2b` → **Requests**: take → confirm with a hotel confirmation number (the demo client sees it, and the bell).
3. Admin → **Pricing**: propose a margin change, approve it with a second admin, see the simulator and the demo client's
   price change.
4. Admin → **Finance**: accounts (all zero — no payments yet), corrections need a second person.
5. Sign in as the **demo hotel** → Rooms & rates: change a price or close a date → the client's hotel page updates live.
6. Public check: `musafirbaba.com/hotels` search for Mumbai — **no demo hotel** appears.

## 6. Remove the demo data (any time)

```bash
docker exec musafirbaba-backend node src/b2b/demo.js remove
```

Deletes exactly the two demo companies and what belongs to them (properties, rooms, prices, requests, markups, logins) and
switches the Demo category off. Nothing else is touched. Running `add` again recreates it.

## 7. Later: switch on online booking (when the owner says so)

1. Push the Stage 08 commits made after this demo deploy; run `docker exec musafirbaba-backend node src/b2b/migrate.js`
   (expect 0054 … 0057).
2. Admin → Pricing → GST & settings: fill MusafirBaba's GSTIN for the Delhi registration (without it no tax invoice is
   issued; voucher and receipt still are).
3. Server `.env`: `B2B_API_PUBLIC_URL=https://musafirbabaserver.3mongoose.online/api/v1` (payments) and
   `B2B_ORDERS_ENABLED=true` (online booking) → `docker compose up -d`.
4. Vercel: `NEXT_PUBLIC_FEATURE_HOTEL_BOOKING=true` (with `NEXT_PUBLIC_FEATURE_HOTELS=true`) → redeploy.
5. Try a ₹1-priced demo room end to end (book → PayU → confirmed → voucher / invoice / receipt → hotel bell and
   acknowledge), then refund it from Admin → Finance. Demo hotels stay hidden from the public website.

Turning either switch off again stops new bookings at once; paid orders still finish (reconciler, poller, refunds).

## 8. Stage 09 (after booking) — with the next push

Migrations `0058` … `0064` (booking summaries, cancellations, change requests, no-shows, hotel failures, payables, recorded
payouts). Nothing new to set. Behind the same online-booking switch for customers; hotel and admin screens appear for the
roles that have the permissions (hotel Owner: Statement; Front Desk: no-shows; Finance: payouts — approving needs the
exact permission `wallet.payout.approve` or Super Admin).

## 8b. Stage 11 (client wallets & credit) — with the next push

Migrations `0065` … `0068` (money holds, bank-transfer top-ups, credit lines, wallet indexes). Client wallets open by
themselves for verified clients (a job every minute). **Switched off for clients** until the owner decides:

| Setting (new, server env) | Meaning |
| --- | --- |
| `B2B_WALLET_ENABLED=true` | clients see `/business/wallet` working (off → "the business wallet opens soon") |
| `B2B_TOPUP_BANK_DETAILS` | MusafirBaba's bank account shown to clients for NEFT / RTGS / IMPS (plain text, e.g. `HDFC Bank · A/c 00000000 · IFSC HDFC0000001 · MusafirBaba Pvt Ltd`) — the owner gives it |

PayU top-ups also need the Stage 07 PayU settings (`B2B_API_PUBLIC_URL`). Admin → B2B → **Wallets**: approvals need two
different people — checking a bank transfer (`wallet.topup.check`), approving it (`wallet.topup.approve`), credit lines
(`wallet.credit.propose` / `wallet.credit.approve`), wallet adjustments (`wallet.adjustment.propose` / `.approve`).
Approve permissions are never given by wildcards: Super Admin, or a role listing the exact code.

## 9. Roll back

- Everything new off: `B2B_ENABLED=false` → `docker compose up -d`. The website, apps and admin work exactly as before.
- Later, to switch on payments (₹1 test from Admin → Finance) or online booking, see the Stage 07 / 08 notes — not part of
  this demo.
