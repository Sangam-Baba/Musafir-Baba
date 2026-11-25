# ADR-0017: Bus pricing in the shared pricing module

- **Status:** Accepted (Stage 18 B5, built locally 2026-11-25 — humans must review pricing / GST before go-live)
- **Date:** 2026-11-25

## Context
Buses are sold like hotels: the operator's net fare + MusafirBaba's margin + GST (plan Stage 18 §2, §8). The pricing
module (margin rules, tax rules, settings) is shared and already prices hotels in production; it must not change how
hotels are priced, and a bus must never be priced by a rule written for hotels (or the other way round).

## Decision
- **Margin rules get an optional `match.productType`** (`HOTEL` | `BUS`). Absent = `HOTEL`, so every existing rule stays
  a hotel rule. A rule matches only buyers of its own product. Bus rules may also match `operatorOrgId` and `routeId`;
  hotel-only fields (`hotelOrgId`, `propertyId`, `starRating`) are refused on bus rules and bus fields on hotel rules.
  For buses the "per night" amounts mean **per seat** (one trip); the per-booking fee is added once.
- **Tax kind `BUS_TRANSPORT`** is added to the tax rules. **No starter rate is seeded** — the CA confirms rate / SAC /
  ITC, and staff add it through the existing two-person approval. Until then no bus is offered (no tax rule → not
  sellable). Place of supply = the state where the passenger boards.
- The bus price build-up lives in `bus-booking` (`busBreakdown`), composed from the pricing module's exported pieces
  (`nightMargin`, `bookingFee`, `findTaxRule`, `issuerFor`, `splitGst`). `buildBreakdown` / `gstForNight` for hotels
  are not touched. Principal model like hotels; the operator is paid its net fare.
- **Price lock for buses = the seat hold** (B6): the server prices the seats when it places the 15-minute hold and stores
  that breakdown on the hold; payment charges the stored amount. The hotel price token (shaped around stays) is not
  reused or changed. The browser's amount is still never trusted.
- The search gateway takes an optional permission and rate-limit name prefix (defaults = hotel search, unchanged), so
  bus search has its own permission (`bus-booking.search.use`) and its own limits, and is not counted as hotel usage.

## Consequences
- Staff must create at least one BUS margin rule and an approved BUS_TRANSPORT tax rule before any bus is offered.
- Existing pricing tests stay green; new tests prove hotel rules never price buses and bus rules never price hotels.
- Bus usage is not yet counted for client billing (DEF-045).
