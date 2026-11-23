# Module: reporting

Read models for fast lists (plan Stage 09 §3.1): `rpt_booking_summaries` — one row per booking, every product and channel.

| | |
| --- | --- |
| **Collections** | `rpt_booking_summaries` |
| **Public interface** | `index.js` only |
| **Permissions** | `reporting.bookings.read` (MusafirBaba) |

## Rules that never change without an ADR

- Rows are copies; the order and booking documents are the truth. A row is replaced from the current order on every
  event, so repeats, late or out-of-order events and a full rebuild all give the same rows.
- This module never reads other modules' collections: the order's rows come from a function wired at start-up.
