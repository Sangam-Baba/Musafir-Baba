# Alerts — what each one means and what to do

Alerts come from three places: **System health** (Admin → B2B → Finance → System health, plus the email to `B2B_OPS_ALERT_EMAIL`), the server **error logs** (`docker logs musafirbaba-backend`), and **work queues** in the admin panel. The first column is the check name or log message.

| # | Alert | Means | Do |
| --- | --- | --- | --- |
| 1 | `inventory-night-counts` failing | A night's booked / held count doesn't match its entries — possible oversell | Stop selling that room type (calendar → stop sell); see incidents.md "Rooms oversold" |
| 2 | `inventory-hold-entries-have-a-live-hold` | Rooms still held for a hold that ended | The sweeper frees them within minutes; if it stays, restart the backend and check the reconciler log |
| 3 | `ledger-snapshots-match-journal` | Account balances don't match the journal | Stop money flows; incidents.md "Money looks wrong" |
| 4 | `orders-confirmed-gateway-orders-are-verified` | An order confirmed without PayU's verify | Stop orders; check the payment in PayU; finance decides refund |
| 5 | `orders-no-middle-step-past-its-deadline` | An order stuck between steps | The reconciler resumes it; if not within 10 min, look at the order's timeline (Admin → Orders) |
| 6 | `orders-every-paid-order-confirmed-or-refunded` | Money taken but no booking and no refund | Refund from Admin → Finance → Payments; tell the customer |
| 7 | `documents-invoice-and-credit-note-numbers-gap-free` | A gap in GST invoice numbers | Tell finance / CA before the month is filed; never re-use a number |
| 8 | wallet live checks failing | A client wallet balance differs from its journal | Stop the wallet switch; finance compares; corrections with two people |
| 9 | System health "Checks not running for 30+ minutes" | Background work stopped | Check `B2B_BACKGROUND=true` and the backend container; restart |
| 10 | `b2b database connection or background start failed` (log) | The B2B part can't reach MongoDB | `docker ps`; Mongo container logs; the website keeps working on its own connection |
| 11 | `b2b request failed` bursts (log) | Many 500 errors | Find the request ids; roll back the last deploy if it started with it |
| 12 | Payments → **Mismatches** queue growing | PayU and our records disagree (amount, late success, settlement) | Finance resolves each with a note |
| 13 | Payments not settled after 3 days | PayU hasn't settled a captured payment | Ask PayU with the txn id |
| 14 | Webhook address "Off — failed 24 h" (client notice) | A client's server stopped accepting updates | Client fixes and switches it on, then "Send again" from the log |
| 15 | "API key used from a new address" (client notice) | A key used from an unknown IP | Client checks; if not theirs → incidents.md "API key leaked" |
| 16 | Hotel not acknowledging a booking (ack overdue) | 60 min without the hotel confirming | Ops calls the hotel (Admin → Operations) |
| 17 | Hotel failure raised | A hotel can't honour a booking | Ops moves or refunds the guest (Admin → Operations → Hotel failures) |
| 18 | Billing: client suspended for unpaid plan | Searching / new bookings paused for a client | Accounts follow up; it reopens as soon as paid |
| 19 | Credit overdue | A client's credit is past due | Accounts follow up; bookings paused until paid |
| 20 | KYC queue older than 2 working days | Hotels / clients waiting for verification | Ops reviews (Admin → Verification) |
