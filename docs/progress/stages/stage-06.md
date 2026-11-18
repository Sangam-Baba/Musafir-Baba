# Stage 06 — Search & availability (website first) · Progress

> Task list from `docs/plan/stages/stage-06-search-availability.md` §3, split so each task fits one reviewable change. Rules and status values: `docs/progress/README.md`. Budgets: `docs/plan/07-testing-strategy.md` §5.

| | |
| --- | --- |
| **Status** | IN_PROGRESS |
| **Phase · Track** | A · website |
| **Owner(s)** | |
| **Started** | 2026-11-18 |
| **Finished** | — |
| **Plan file** | `docs/plan/stages/stage-06-search-availability.md` |
| **Depends on** | Stages 03–05 (awaiting owner sign-off) |
| **Modules** | `hotel-search` (new) · reads `hotel-catalog` (a new search read model), `hotel-inventory` (`checkAvailability`), `pricing` (`quote`, price tokens), `kyc` (hotel GST status) through their public interfaces |

## Defaults used for this stage (owner can change any of them)

| Topic | Default |
| --- | --- |
| Channels | Website now; the same API answers B2B prices when called by a signed-in B2B client (tested, no screens until Stage 12) |
| Who may search | Website search, offers and price check are public (no sign-in), with stricter per-IP rate limits; B2B members are limited per user and per organisation |
| Destinations | Cities, areas and live property names held in memory per process (refreshed every 5 minutes and when a listing changes) — no new collection, no Atlas Search |
| Cache | None at first (plan §3.5); added only if the load test misses its budget |
| Website pages | New folder `/hotels` (search, results with map, hotel page). The home page's existing Hotels tab is turned on only through the approved edit E1, behind `NEXT_PUBLIC_FEATURE_HOTELS` (off by default) — **asked separately before it's touched** |
| Prices shown | Website: final price incl. GST only. Hotel rate and margin never leave the server for website or clients |

## Tasks

| ID | Task | Plan ref | Status | Owner | PR | Tests | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S06-T01 | Stage setup: `hotel-search` module skeleton (permissions, README), permission catalogue + role matrix | §3 | DONE | AI (Claude) | | matrix ✅ | Permission `hotel-search.search.use` (clients): Owner (`**`), Admin and Booking Agent (`hotel-search.**` added to their role patterns — additive), not Accountant / Viewer, not hotels. Website routes will be public with per-IP limits (T07). README with the module's fixed rules (search advisory, no tokens in search, channel visibility, caps) |
| S06-T02 | Catalogue search read model (hotel-catalog, new service): LIVE properties visible on the caller's channel by city / area / near (`$geoNear`) / references, with the facts search needs (time zone, room types with guest limits, state, city, stars, amenities) — capped, `maxTimeMS` | §3.2 | DONE | AI (Claude) | | 6 ✅ | New service in hotel-catalog (additive file) `createSearchCatalog().candidates({ channel, clientCategory, where })`: LIVE only, channel switches filtered in the query, sell-from date (hotel's own date) and client categories by the same `isVisible` rule as the public hotel page; `where` = city (+ area) on the existing `status_city` index, `near` = `$geoNear` on the existing 2dsphere index (radius ≤ 50 km, distance returned, nearest first), or public references (spelling-tolerant parsing). Returns per property: ids, ref, slug, name, city / area / state, stars, time zone, amenities, type, location, distance, cover photo address and ACTIVE room types with guest limits. Never: contacts, GSTIN, review, history. ≤ 200 properties, `maxTimeMS` 2 s, logged routine system scope. No new index needed |
| S06-T03 | Destination autocomplete `GET /hotels/destinations?q=` (cities, areas, live property names; normalised prefix; ranked) | §3.1 | DONE | AI (Claude) | | 7 ✅ | `domain/destinations.js` (pure): normalised prefix (accents / punctuation ignored) of the whole name or of any word; exact → name prefix → word prefix, cities → areas → hotels, then popularity (live hotels in the city / area), then name; ≥ 2 letters, ≤ 10 results. `createDestinationsService`: in-memory index per channel from hotel-catalog's new `destinationSource` (active cities + areas, LIVE channel-visible property names, sell-from respected), kept 5 min, dropped at once by consumer `hotel-search-cache-evict` on listing published / updated / suspended / archived. **No new collection** (plan mentioned optional `htl_destinations` weights — popularity is counted instead). `GET /hotels/destinations?q=` (public, `Cache-Control: public, max-age=60`). **Search gateway** (`routes/search-gateway.js`, built now for all search routes — T07 completes it): anonymous / staff → WEBSITE, per-IP limit (120 / min light, 40 heavy); member of an ACTIVE client org with `hotel-search.search.use` → B2B (per user + per org); hotels, clients without the permission → 403; not-active org → `ORG_NOT_ACTIVE`; RateLimit headers; entitlement / usage hooks no-op. Search routes are mounted **before** Stage 03 so `/hotels/destinations` isn't read as `/hotels/:ref` (a hotel slug literally "destinations" would be shadowed). Tests: ranking, word / accent matching, website vs B2B visibility, hidden / draft never, 403s, 125 parallel requests → exactly 120 allowed |
| S06-T04 | Search `POST /hotels/search`: candidates → `checkAvailability` (batched ≤ 200) → cheapest plan per property priced for the channel → filters (stars, price, meal plans, refundable, amenities) → sort (recommended / price / stars / distance) → cursor page; "from" prices, no tokens | §3.2, §5 | TODO | | | | |
| S06-T05 | Offers `POST /hotels/{ref}/offers`: every sellable room type × plan with the price the caller may see, cancellation summary and a price token; sold out for these dates | §3.3 | TODO | | | | |
| S06-T06 | Price check `POST /hotels/offers/price-check`: token → availability + re-price → `OK` (fresh token) / `PRICE_CHANGED` / `SOLD_OUT` | §3.4 | TODO | | | | |
| S06-T07 | Gateway for the search routes: rate limits per IP (stricter for anonymous), per user, per organisation; org active check; caps (nights, rooms, children, radius, page); no-op hooks for entitlements / usage (Stage 12 / 13) | §3.7, §6 | TODO | | | | |
| S06-T08 | Live availability for hotel pages: public rooms only for LIVE properties, signal carries ids and dates only | §3.6, §6 | TODO | | | | |
| S06-T09 | Website pages (new `/hotels` folder): search bar with autocomplete, results list + map, filters, sort, hotel page (gallery, rooms with final price incl. GST, cancellation summary, live "availability changed"), price check before checkout; server-rendered hotel content, mobile-first | §3.8 | TODO | | | | |
| S06-T10 | Approved edit E1a: Hotels tab on the home page behind `NEXT_PUBLIC_FEATURE_HOTELS` (off by default) — **needs the owner's OK** | §3.8, `12-…` E1 | TODO | | | | |
| S06-T11 | Load test script and budgets (autocomplete, city search, offers); cache only if a budget is missed | §3.5, §3.9 | TODO | | | | |
| S06-T12 | Mandatory test suite: search contract, channel visibility, prices per channel, no token in search, price-check paths, rate limiter under concurrency, results follow inventory and rule changes | §7 | TODO | | | | |

Status: `TODO` · `DOING` · `REVIEW` · `DONE` · `BLOCKED` · `DEFERRED` (needs a `DEF-…` row) · `DROPPED` (reason in Notes)

## Definition of Done (copied from the stage file)

- [ ] Website shows LIVE hotels with correct website prices (incl. GST) and live availability
- [ ] A booking or calendar change updates an open hotel page within ~2 s
- [ ] Search API returns B2B prices when called with a B2B channel context (tested, no UI yet)
- [ ] p95 budgets met on staging data

## Mandatory tests (copied from the stage file)

- [ ] Search contract tests
- [ ] Cache invalidation on inventory and rule change
- [ ] Rate limiter atomic under concurrency
- [ ] Channel visibility filter
- [ ] Performance budgets
