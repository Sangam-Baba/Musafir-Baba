# Module: hotel-search

Search, offers and price check for every channel (plan Stage 06): the website (public), the B2B dashboard
(Stage 12) and the API (Stage 14) all use the same services, so a B2B caller gets B2B prices with no extra code.

| | |
| --- | --- |
| **Collections** | none of its own (reads through `hotel-catalog`, `hotel-inventory`, `pricing`, `kyc` public interfaces) |
| **Public interface** | `index.js` only |
| **Permissions** | `hotel-search.search.use` (B2B clients); website routes are public with per-IP rate limits |

## Rules that never change without an ADR

- **Search is advisory, booking is authoritative.** Search shows "from" prices and never issues price tokens; offers
  issue a token per option; booking re-checks rooms and price.
- Only LIVE properties visible on the caller's channel appear (`hotel-catalog` `isVisible`).
- Hotel rates and margins never reach website or client responses (`pricing` `priceView`).
- Caps on nights (30), rooms (9), children per room (4, ages 0–17), radius, page size; database reads use `maxTimeMS`.
