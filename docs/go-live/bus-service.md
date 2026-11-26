# Bus service (Stage 18) — going live

Everything for buses is built and tested locally, and **off** until each switch is turned on. Turning a switch off
again hides it at once (bookings already made keep working: they can still be paid, cancelled and paid out).

## 1. Before anything is switched on (owner / CA)

| Needed | Why | Where |
| --- | --- | --- |
| **Bus GST rate and SAC** from the CA (AC / non-AC, contract / stage carriage, ITC) | No bus is offered without an approved bus tax rule — nothing is priced at a guess | Admin → Services → Pricing → Tax rules → "Bus tickets" (a second person approves) |
| A **bus margin rule** | No bus is offered without a margin rule for buses | Admin → Pricing → Margin rules → Product **Buses** (₹ per seat or % of the operator's fare) |
| Default **cancellation slabs** confirmed (today a placeholder: any time 10 %, 24 h 25 %, 12 h 50 %, 4 h 100 %) | Used until an operator sets its own | Operators: Routes & schedules → Cancellation |
| Operator agreement signed | Net-fare contract, liability for cancelled trips | KYC documents |
| Decisions: bus search usage counting (DEF-045), moving a trip to another bus (DEF-044) | Not built until decided | — |
| CA: bus invoices / credit notes (DEF-046), TDS / TCS on bus payouts and bus report columns (DEF-047) | Not built until answered | — |

## 2. Release

1. Merge the bus pull request (owner reviews; humans must review orders / payments / wallet / pricing changes —
   ADR-0016 … 0020).
2. On the server: `ssh 3mongoose 'docker exec musafirbaba-backend node src/b2b/migrate.js'` — migrations **0083–0089**
   (only new `bus_` collections and indexes; nothing existing changes).
3. Check: `docker exec musafirbaba-backend node src/b2b/migrate.js --status` shows 0089 applied.

## 3. Switch on, one at a time

| Step | Switch | What opens | Check before the next step |
| --- | --- | --- | --- |
| 1 | `B2B_BUS_ENABLED=true` (backend) | Operator registration, KYC, buses, layouts, routes, trips, counter blocks, admin review, bus payouts | A real operator registers, adds a bus and a route; staff approve; trips appear (within 6 hours) |
| 2 | `B2B_BUS_SELLING_ENABLED=true` (backend; needs `B2B_ORDERS_ENABLED=true`) | Search, seat maps, bookings (B2B portal / API, website orders) | A B2B pilot client books and cancels one seat; the operator sees it in Bus Bookings and the manifest |
| 3 | `NEXT_PUBLIC_FEATURE_BUS=true` (website — rebuild) | "Bus operator" on registration, Search Buses in the business area, admin bus tabs, website `/buses` | A website test booking with PayU (small amount), then cancel it |

The old `/bus` address still redirects to the enquiry page (unchanged); the new pages are at `/buses`.

## 4. After the first trips

- Hourly: trips that ended become COMPLETED → operator payables ready to pay.
- Weekly: Admin → Control → **Bus payouts** (separate from hotel payouts, ADR-0020): propose, a second person approves,
  bank file, mark paid.
- Partners → Buses → **Trip problems** and **Reviews** for ops; Services → **Bus cancellations** for full refunds.

## 5. If something goes wrong

Turn the last switch off (backend env + restart, or website env + rebuild). Holds release themselves within 15 minutes;
confirmed bookings stay and can be cancelled / refunded by ops.

## 6. Try it locally first

```
backend/.env:   B2B_ORDERS_ENABLED=true  B2B_BUS_ENABLED=true  B2B_BUS_SELLING_ENABLED=true
frontend/.env.local:   NEXT_PUBLIC_FEATURE_BUS=true
cd backend && npm run b2b:migrate && node src/b2b/demo.js full      # local / test database only
```
The full demo adds a bus company (`demo.bus@example.com`, same printed password) with a Mumbai → Goa night route,
90 days of trips, a B2B bus booking and a counter block, plus **demo-only** bus pricing (5 % GST — not a real rate).
`node src/b2b/demo.js remove` deletes all of it.
