# Module: hotel-booking

Hotel bookings for every channel. **Today it holds only booking requests (D37)** — B2B clients ask, MusafirBaba
arranges the stay offline and records the outcome. The booking engine (Stage 08) and dashboard booking (Stage 12
part B) are added here later; requests stay as history.

| | |
| --- | --- |
| **Collections** | `hbk_booking_requests` |
| **Tenant** | `clientOrgId` (tenant guard on); MusafirBaba reads with a logged system scope |
| **Public interface** | `index.js` only |
| **Permissions** | `hotel-booking.request.create / read` (clients), `hotel-booking.admin.read / handle` (MusafirBaba) |
| **Events** | `hotel-booking.request.submitted / confirmed / declined / cancelled` |

## Rules that never change without an ADR

- A booking request **never takes rooms and never moves money**. Only the booking engine (`05-…`) takes rooms.
- A request is accepted only for an unchanged price (the price token is checked again); it stores the client's own
  price view — never the hotel rate or the margin.
