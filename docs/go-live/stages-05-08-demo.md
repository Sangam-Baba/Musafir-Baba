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

## 8c. Stage 12 part B (B2B booking) — with the next push

Migration `0069` (usage counting: `mtr_usage_events`, daily and monthly counters). Nothing new to set:

- B2B clients book from the dashboard (**Book now** on a room) only when **both** booking switches are on — server
  `B2B_ORDERS_ENABLED=true` (also covers `/client/orders`, `/client/bookings` and admin offline bookings) and frontend
  `NEXT_PUBLIC_FEATURE_HOTEL_BOOKING=true`. Paying from the wallet also needs `B2B_WALLET_ENABLED=true` (Stage 11).
- **My Bookings** and **Usage** appear in the client menu for the roles allowed; admin gets **Orders → Offline booking**
  (`orders.offline.book`) and a **Usage** tab (`metering.admin.read`, given to Finance).
- Usage is counted from the first search after this push (website traffic under `platform`, never billable); nothing is
  charged until plans (Stage 13).

## 8d. Stage 13 (plans and billing) — with the next push

Migrations `0070` … `0073` (plan versions and settings, subscriptions and overrides, SaaS invoices, dunning). The
placeholder plans (Starter trial, A, B, C) and the query weights are added at start-up, only if missing.

**Switched off by default**: nothing below happens until `B2B_BILLING_ENABLED=true` is set on the server (client plan pages say "coming soon"; admin can already prepare the plans). **When switched on** (only verified B2B clients — the website is never affected):
- every verified client gets a subscription on the Starter trial (clients verified earlier are caught up within 10
  minutes); searching is counted against its limit and BLOCK plans stop at the limit (bookings are never blocked);
- after the trial / on upgrade, plan fees are invoiced (series `S2627DL…`) and **taken from the client's wallet**;
  unpaid → reminders, and after 10 days searching and new bookings pause until paid.

Before real clients rely on it: the owner confirms the plan numbers (D7) in **Admin → B2B → Plans** (a second person
publishes), the CA confirms the SAC (placeholder 998314) and the invoice layout, and MusafirBaba's GSTIN is set in the
pricing settings (invoices show it). A demo of a full month: `node scripts/b2b/simulate-billing.js` (in-memory, touches
nothing real).

## 8e. Stage 15 (hotel payouts, GST registers, reports, branding) — with the next push

Migrations `0074` … `0077` (payout runs / lines / deduction rules, statement questions, period locks, client
branding). **Nothing runs by itself** — no new background job; every action is a person clicking in the admin panel.

Before finance uses it, give the finance staff these permissions (Admin → B2B → Staff access):
- `wallet.payout.record` — prepare payout runs, hold / release hotels, see statement questions;
- `wallet.payout.approve` — approve runs (must be a different person), bank file, mark paid, deduction rules, answer questions;
- `reporting.reports.read` — GST register, reports, accounting export;
- `reporting.period.lock` — lock a month after the GST return is filed (only a finished month, once).

Where: **Admin → B2B → Finance → Hotel payouts · GST register · Reports & exports**. Hotels see **Payouts** (owners);
clients see **Reports** and **Voucher Branding** in the business area.

Before the first real payout: the CA sets deductions (TDS — none until then), MusafirBaba's bank confirms its bulk
transfer file format (the bank file is a generic CSV until then), and hotels' KYC is approved with bank details (lines
are held otherwise, and for 72 hours after a bank change). The CA confirms the GST register layout before filing.

## 8f. Stage 14 (API keys and webhooks) — with the next push

Migrations `0078` … `0080` (API keys, webhook endpoints, webhook deliveries). **Switched off by default**: nothing
changes until `B2B_API_ENABLED=true` is set on the server. While off, `mb_…` keys get 401 `API_NOT_ENABLED`, the
Developers page says "not switched on", no webhook is queued or sent. The API description
(`/api/v1/openapi.json`) and the guides page (`/business/developers/docs`) are public either way.

**When switched on** (verified B2B clients only — the website is never affected):
- client Owners see **Developers** in the business area: keys (shown once, 2 at a time, IP limits, rotate, revoke) and
  webhook addresses; a key acts for its creator within its scopes, at the dashboard's B2B prices, counted in the same
  usage / plan pool (per key on the Usage page);
- booking updates are sent signed to the clients' HTTPS addresses every 15 seconds (retries ~22 h; an address failing
  24 h is switched off and the Owner emailed).

Optional server settings: `B2B_API_KEY_PEPPER` (a long random value for key hashing — falls back to `B2B_AUTH_SECRET`;
set it once and never change it, or every key stops), `B2B_API_ENV=test` only on a staging server (test keys).
With plans switched on (Stage 13), keys need a plan with `api` and webhooks a plan with `webhooks` (placeholder plans:
B and C / C).

## 8g. Stage 16 (hardening) — with the next push

Migrations `0081` (safety-check runs) and `0082` (DPDP consents, data requests). New, all optional:
- `B2B_OPS_ALERT_EMAIL` — where safety-check alerts go (once per check per day). Without it, problems are only logged
  and shown in **Admin → B2B → Finance → System health**.
- `B2B_PILOT_ORGS` — comma-separated client company ids: switched-on client features work only for them. Unset =
  everyone (as today).
- Grant `reporting.health.read` (System health) and `platform.privacy.manage` (Admin → B2B → Privacy) to the staff
  who need them.
- Website hotel checkout now has a required privacy checkbox (only when hotel booking on the website is switched on).
- Runbooks: `docs/go-live/runbooks/` — alerts, incidents (CERT-In / DPDP), disaster recovery drill, support replies
  and training, go-live checklist. Scripts: `backend/scripts/b2b/backup-b2b.sh`, `check-invariants.js`,
  `load-test.js`, `race-at-scale.js` (staging only).

## 9. Roll back

- Everything new off: `B2B_ENABLED=false` → `docker compose up -d`. The website, apps and admin work exactly as before.
- Later, to switch on payments (₹1 test from Admin → Finance) or online booking, see the Stage 07 / 08 notes — not part of
  this demo.
