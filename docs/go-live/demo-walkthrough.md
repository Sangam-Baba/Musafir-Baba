# Demo walkthrough — the B2B system with sample data (local)

The full demo is for **local / test databases only** (`demo.js full` refuses production). Everything is named
"Demo — …", uses `@example.com` emails (never delivered) and is removed with one command.

```bash
cd backend
DEMO_PASSWORD='Demo-MusafirBaba-2026' node src/b2b/demo.js full     # add (run "remove" first if a demo is there)
node src/b2b/demo.js remove                                          # remove exactly the demo
node -r dotenv/config scripts/b2b/check-invariants.js                # safety checks (all ✓ expected)
```

To see bookings, wallets, plans and API pages in your **local** business area, these switches must be on in your local
`backend/.env` (local only — never copy to the server): `B2B_ORDERS_ENABLED=true`, `B2B_WALLET_ENABLED=true`, and if you
want to see them `B2B_BILLING_ENABLED=true`, `B2B_API_ENABLED=true`. Restart the local backend after changing them.

## What is in it

| Who | Login (password `Demo-MusafirBaba-2026`) | What it shows |
| --- | --- | --- |
| Demo — Sea Breeze Hotels (hotel) | `demo.hotel@example.com` | 3 properties (Mumbai, Goa, Jaipur), KYC approved with bank details, bookings to acknowledge, a finished stay, a **paid payout** |
| Demo — Himalayan Retreats (hotel) | `demo.hotel2@example.com` | 2 properties (Manali, Rishikesh), no KYC yet — its payouts would be **held** |
| Demo — Wanderlust Travels (B2B client) | `demo.client@example.com` | Wallet ₹2,00,000 top-up, 10 % markup, 4 bookings (1 cancelled with refund, 1 stay finished), Plan B with a paid plan invoice, an API key, a webhook address, a booking request |
| Demo — Skyline Corporate Travel (B2B client) | `demo.client2@example.com` | Wallet ₹50,000, a booking at the Rishikesh resort |
| Demo — Trailblazer Holidays (B2B client) | `demo.client3@example.com` | Waiting in the **verification queue** |

The demo hotels are visible only to the demo clients (hidden category "Demo (internal)") — never on the website or to
real clients.

## Where to look

| Area | Where | What you will see |
| --- | --- | --- |
| Partners | Admin → B2B admin → **Partners** → Verification | Trailblazer waiting for review |
| | Partners → Companies / People | the 5 demo companies and their owners |
| Services | **Services** → Orders | the demo bookings (one cancelled), timelines |
| | Services → Booking requests | Wanderlust's honeymoon request — take it and confirm it |
| | Services → Wallets & credit | Wanderlust and Skyline wallets |
| | Services → Plans / Usage | Wanderlust on Plan B, its invoice, its counted searches |
| Control | **Control** → Finance → Hotel payouts | payout run `PR-…` paid with NEFT-DEMO-0001 |
| | Finance → Accounts & corrections | the ledger after top-ups, bookings, refund, payout, plan invoice |
| | Finance → Reports / GST register / System health | sales, margin, payables; checks all green |
| | Control → Privacy | a demo data request |
| Hotel view | `/business` as `demo.hotel@example.com` | Bookings, Statement, **Payouts** (statement with the deduction lines) |
| Client view | `/business` as `demo.client@example.com` | Search Hotels (B2B price + your selling price), My Bookings, Wallet, Plan & Billing, Reports, Voucher Branding, **Developers** |
| Guide | Admin → B2B admin → **How it works**; business area → **How it works** | the whole system with a worked example |

## Buses (Stage 18, full demo only)

- Sign in to the business area as `demo.bus@example.com` (the printed password): **My Buses** (Demo Konkan Express,
  approved), **Routes & schedules** (Mumbai → Goa night, fares with weekend +₹100), **Trips & seats** (a counter block
  of U1–U2 three days out), **Bus Bookings** (the B2B booking and its manifest), **Bus Payouts**.
- As the demo client: **Search Buses** → Mumbai → Goa, three days from today → the seat map; the order page shows the
  e-ticket (cancel seats from there).
- Website: `/buses` (with `NEXT_PUBLIC_FEATURE_BUS=true`).
- The demo adds a bus margin rule and a **demo-only 5 % bus GST** so buses show in search — not a real rate.

