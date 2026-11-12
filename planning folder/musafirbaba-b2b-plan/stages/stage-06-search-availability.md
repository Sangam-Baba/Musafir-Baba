# Stage 06 — Search & Availability (website first)

| | |
| --- | --- |
| **Phase** | A — hotels + website (working system) |
| **Duration** | ~2 weeks |
| **Depends on** | Stages 03–05 |
| **Modules** | `hotel-search`, gateway rate limiter (`src/core/http`) |
| **Apps** | `website` (search, results, map, hotel detail) |

## 1. Goal

Website visitors search the hotels we list, **fast and with live availability and correct website prices**. The search API is built channel-aware, so the B2B dashboard (Stage 12) and the API (Stage 14) reuse it without changes.

## 2. Scope

**In:** destination autocomplete, city/area/near-me search, filters, sort, offers (rooms & rates with price tokens), price check, caching + invalidation, live "availability changed" (self-hosted Socket.IO), rate limiting, website search UIs, load test.
**Out:** B2B dashboard search UI and B2B prices on screen (Stage 12), usage counting for clients (Stage 12), API keys (Stage 14).

## 3. Work breakdown

1. **Autocomplete** `GET /hotels/destinations?q=`: cities, areas, property names; Atlas Search autocomplete if on Atlas, else normalised-name prefix index + collation; ranked by popularity; < 150 ms.
2. **Search** `POST /hotels/search`: `{ destination | propertyRefs | near {lat,lng,radiusKm}, checkIn, checkOut, rooms:[{adults, childrenAges[]}], filters {star[], priceRange, mealPlans[], refundableOnly, amenities[]}, sort (recommended|price|star|distance), cursor, limit ≤ 50 }`.
   Flow: validate → candidate LIVE properties visible to the caller's **channel** (Mongo query / `$geoNear`) → `checkAvailability` (batched, ≤ 200 properties) → `pricing.quote` cheapest plan per property for that channel → price filter/sort → page. Response has "from" prices; **no tokens** in search results.
3. **Offers** `POST /hotels/{ref}/offers`: all sellable room type × rate plan options with breakdown (per permission), cancellation summary and **price token** each.
4. **Price check** `POST /hotels/offers/price-check`: verify token → re-check availability + re-price → `OK` (fresh token) | `PRICE_CHANGED` (old/new) | `SOLD_OUT`.
5. **Cache**: Redis key `(propertyId, stay, occupancyHash, pricingContextHash)`, TTL 30–60 s; deleted by the inventory change stream (Stage 04) and pricing rule events (bump pricing version); single-flight to avoid stampedes.
6. **Real time**: website hotel page joins `availability:property:{id}` with the `useRealtime` hook (self-hosted Socket.IO); on `availability:changed` show "Availability or price updated" and refresh offers.
7. **Gateway middleware (built now, used by all `/api/v1` routes)**: auth → context → org active? → **rate limiter** (Redis token bucket per user, per org, per IP; stricter for anonymous website traffic) → permission → handler. Hooks for entitlement checks and usage recording are left as no-ops, filled in Stage 12/13.
8. **Website UIs**: search bar, results list + map, filters, sort, hotel detail with gallery, room cards with **final price incl. GST**, cancellation summary, price check before checkout; SEO-friendly server rendering for hotel content pages; mobile-first.
9. **Load test** to the budgets in `07-testing-strategy.md` §5.

## 4. Collections / stores

Redis cache keys and rate-limit buckets; `htl_destinations` popularity weights (or a view over `htl_cities`/areas).

## 5. Rules & edge cases

- **Search is advisory, booking is authoritative** — UI never promises a room before checkout.
- Limits: 30 nights, 9 rooms, 4 children/room (ages 0–17), check-in ≥ today (hotel local) and ≤ max advance days.
- Properties with no sellable plan don't appear (unless searched by ref → "sold out for these dates").
- Price sort uses total for the stay and requested occupancy.
- Only properties with `visibility.website = true` are returned to the website channel.

## 6. Security

| Threat | Control | Test |
| --- | --- | --- |
| Scraping | Rate limits per IP, bot protection on heavy use, monitoring | Tests |
| Cross-channel price leak via cache | Pricing context hash (channel, client category) in keys | Two-channel test |
| Net rate leak | DTO per permission | Contract test |
| Expensive queries | Caps on rooms/nights/radius/page, `maxTimeMS` | Tests |
| Realtime data leak | Only property id + dates in `availability:property:*` messages; only real LIVE properties can be joined | Test |

## 7. Mandatory tests

Search contract tests; cache invalidation on inventory and rule change; rate limiter atomic under concurrency; channel visibility filter; performance budgets.

## 8. Definition of Done

- [ ] Website shows LIVE hotels with correct website prices (incl. GST) and live availability
- [ ] A booking or calendar change updates an open hotel page within ~2 s
- [ ] Search API returns B2B prices when called with a B2B channel context (tested, no UI yet)
- [ ] p95 budgets met on staging data

## 9. AI editor prompt

```
Read: AGENTS.md, 10-coding-standards.md, 01-architecture.md §5, 06-api-and-events.md §3.2, this stage §3.2–3.5.
Task: search + offers + price check services with channel-aware pricing and Redis cache with invalidation.
Constraints: modules/hotel-search (+ facades of hotel-inventory and pricing only).
Tests first: channel visibility; cache key includes pricing context; invalidation on ari change and rule activation; no token in search results; price-check PRICE_CHANGED and SOLD_OUT paths.
```
