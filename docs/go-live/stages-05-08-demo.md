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

## 7. Roll back

- Everything new off: `B2B_ENABLED=false` → `docker compose up -d`. The website, apps and admin work exactly as before.
- Later, to switch on payments (₹1 test from Admin → Finance) or online booking, see the Stage 07 / 08 notes — not part of
  this demo.
