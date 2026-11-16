# Stage 03 — Hotel listings · Progress

> Task list from `docs/plan/stages/stage-03-hotel-listings.md` §3, split so each task fits one reviewable change. Rules and status values: `docs/progress/README.md`.

| | |
| --- | --- |
| **Status** | IN_PROGRESS |
| **Phase · Track** | A · hotels |
| **Owner(s)** | |
| **Started** | 2026-11-15 |
| **Finished** | — |
| **Plan file** | `docs/plan/stages/stage-03-hotel-listings.md` |
| **Depends on** | Stage 01, Stage 02 (both awaiting owner sign-off) |
| **Modules** | `hotel-catalog` (new) · `files`, `notifications`, `organizations`, `audit` |

## Owner decisions for this stage (15 Nov 2026)

| Topic | Decision |
| --- | --- |
| Hotel photos (D32) | **Existing setup**: the existing R2 bucket served at `https://cdn.musafirbaba.com/…` (as the website's newer uploads do), own public folder `b2b-public/hotels/`. The hotel's browser makes the WebP sizes (thumb, card, gallery, hero) and the blur placeholder; the backend checks each file (WebP from its content, sizes, minimum width 1200 px for the large size) and refuses any file still carrying location/camera data. No new package, no Cloudinary usage |
| Maps (default) | The Google Maps key the website already uses (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, existing `@googlemaps/js-api-loader`) for the location pin |
| Masters (default) | MusafirBaba admins create cities / areas, amenities, property types, bed types and meal plans; a starter list is seeded by migration so hotels can begin |

## Tasks

| ID | Task | Plan ref | Status | Owner | PR | Tests | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S03-T01 | Stage setup: `hotel-catalog` module skeleton (permissions, events, README); D32 recorded | §3 | DONE | AI (Claude) | | matrix ✅ | Module `hotel-catalog` (README, permissions, events, index; generator sample code removed). Permissions: hotel `hotel-catalog.property.read / manage` (Owner; Manager limited to assigned properties; not Front Desk, not clients); MusafirBaba `hotel-catalog.listing.read` (Operations, Support), `hotel-catalog.listing.review` and `hotel-catalog.master.manage` (Hotels team, Super Admin). Events: property submitted / changes-requested / published / updated / suspended / archived, revision submitted / decided. D32 (photos: existing R2 + cdn.musafirbaba.com, browser makes the sizes) in `09-decisions-and-risks.md`. Matrix test extended |
| S03-T02 | Masters: cities / areas (coordinates, state code), amenities (property / room level, grouped, icon), property types, bed types, meal plans — admin API + starter seed | §3.1 | DONE | AI (Claude) | | 5 ✅ | Platform-wide collections `htl_cities` (centre point + radius for the pin check, 2dsphere, areas), `htl_amenities` (level PROPERTY / ROOM / BOTH, group, lucide icon), `htl_property_types`, `htl_bed_types`, `htl_meal_plans` (EP / CP / MAP / AP) — migration `0022-hotel-masters`. Starter lists (30 tourist cities, 29 amenities, 10 property types, 7 bed types, 4 meal plans) loaded at background start, repeat-safe, only adding what is missing (admin edits and switch-offs survive). `GET /catalog/masters` (public reference data, active only); admin `GET /admin/masters` (listing.read, incl. switched-off), create / change / switch off per kind, cities with areas (`master.manage`); keys never change, nothing is deleted; city centres must be in India (catches swapped lat / lng). Dev Atlas: 0022 applied, lists loaded |
| S03-T03a | Several GSTINs per business (same PAN, one per state, each verified on its own) and "Add another business" for a different PAN (D33) | D33 | DONE | AI (Claude) | | 6 ✅ | `kyc_applications.gstRegistrations[]` (state, GSTIN, certificate file, PENDING / VERIFIED / REJECTED, duplicate flag) — the main GSTIN and existing data unchanged. Hotel: `POST /kyc/gst-registrations` (valid GSTIN, PAN inside = the business's PAN — read from the sealed PAN server-side, one per state incl. the main one, own KYC upload), `DELETE /kyc/gst-registrations/:id` (never a verified one — **found and fixed by the test**: the first version could remove a verified GSTIN). Admin: `POST /admin/kyc-applications/:id/gst-registrations/:regId/decision` (verify / reject with note, own-organisation guard, not tied to the review lock); the default queue also lists businesses with a GSTIN waiting (`pendingGstRegistrations`). `verifiedGstins(orgId)` (main GSTIN once verified + verified extras) for properties. Events `kyc.gst-registration.added / decided` (audit, admin queue push). Screens: "GST registrations in other states" on Verification, admin panel on the review screen, queue marker; "+ Add another business" in the switcher and on Home; register page explains PAN vs GSTIN. Migration `0023` (indexes) — applied on dev Atlas |
| S03-T03 | Property: model (`htl_properties`, 2dsphere), hotel CRUD by wizard section (basic → location with geo-inside-city check → reservation contacts → check-in/out + time zone → policies → amenities), autosave with version check (412 on conflict), property limits for staff | §3.2 | DONE | AI (Claude) | | 5 ✅ | `htl_properties` (migration `0024`: org, status + city, 2dsphere, unique slug + public ref `MBHT-XXXXXX`). `GET/POST /hotel/properties`, `GET /hotel/properties/:id` (`ETag` = version), `PUT /hotel/properties/:id/sections/:section` with `If-Match` (428 without, 412 `VERSION_CONFLICT` when someone saved in between). Sections: basic (type from masters, stars, plain-text description), location (active city / area, pin within the city's radius → `LOCATION_OUTSIDE_CITY`, state from the city), contacts (phone normalised), times (HH:MM, IANA time zone — default Asia/Kolkata; aliases accepted), policies, amenities (active, property-level only). Each property shows its GSTIN = the business's verified GSTIN for that state, or `gstinMissing` (D33). Hotel members see their org's properties; members limited to some properties see only those (others 404) and can't create; Front Desk no access. Edits only while DRAFT / CHANGES_REQUESTED (live edits = S03-T07) |
| S03-T04 | Room types (`htl_room_types`): name, description, size, beds, max adults / children / occupancy, extra beds, amenities | §3.3 | DONE | AI (Claude) | | 4 ✅ | `htl_room_types` (migration `0025`; a name once per property among active ones, case / space-insensitive). `GET/POST /hotel/properties/:id/room-types`, `PUT …/:roomTypeId` (`If-Match`, 428 / 412), `DELETE …/:roomTypeId` while the property is being prepared. Rules (all problems at once — `ROOM_TYPE_INVALID`): ≥ 1 adult and ≥ 1 bed, max guests between adults and adults + children, extra beds need a number; bed types and room-level amenities from the active master lists; ≤ 50 room types per property. Always through the property (same limits: unassigned property 404, Front Desk 403, other org 404); changes only while the property is editable |
| S03-T05 | Photos: upload of browser-made WebP sizes, server checks (content type, sizes, min width, no metadata), public R2 folder, category / caption / order / cover, minimum counts | §3.4, D32 | TODO | | | | |
| S03-T06 | Listing state machine: draft → submitted → live / changes requested → suspended / archived; submit completeness checks | §3.5 | TODO | | | | |
| S03-T07 | Revisions on live listings: name, address, location, star rating, time zone, check-in time → pending revision (stays live); other edits publish directly; `hotel-catalog.property.published / updated / suspended` events | §3.5, §3.8, §6 | TODO | | | | |
| S03-T08 | Admin: all properties (filters), detail with full edit, approval queue with checklist + duplicate check (same name within 200 m), request changes with comments per section, revision diff approve / reject, suspend / archive | §3.5, §3.7 | TODO | | | | |
| S03-T09 | Visibility (website / B2B flags, client categories, sell-from date) and the public content read model `GET /hotels/{ref}` (only live and visible for the caller's channel) | §3.6, §3.9 | TODO | | | | |
| S03-T10 | Notifications: listing submitted / approved / changes requested (catalogue + templates), admin queue push | §3.5 | TODO | | | | |
| S03-T11 | Business area: property wizard (autosave), room types, photos (browser makes the sizes), submit and status | §3.2–3.5 | TODO | | | | |
| S03-T12 | Admin pages: properties tab, review screen (checklist, duplicates, section comments, revision diff), masters screens | §3.1, §3.7 | TODO | | | | |
| S03-T13 | Mandatory test suite: state machine, revision rules, visibility per channel, photo checks, isolation | §8 | TODO | | | | |

Status: `TODO` · `DOING` · `REVIEW` · `DONE` · `BLOCKED` · `DEFERRED` (needs a `DEF-…` row) · `DROPPED` (reason in Notes)

## Definition of Done (copied from the stage file)

- [ ] Hotel completes wizard with 2 room types and photos, submits
- [ ] Admin approves; property LIVE; publish event emitted
- [ ] Website and dashboard can fetch the property content (visibility respected)
- [ ] Sensitive edit on LIVE property waits for approval without taking it offline

## Mandatory tests (copied from the stage file)

- [ ] Listing state machine
- [ ] Revision rules (sensitive vs direct)
- [ ] Visibility filter on public endpoint per channel
- [ ] Photo variants + EXIF strip
- [ ] Isolation

## Left out on purpose in this stage

| Deferred ID | What | Moved to / revisit |
| --- | --- | --- |
| — | — | — |

Full record of each in `DEFERRED.md`.

## Changes from the plan

- Photos (D32): the plan's "worker makes WebP variants" becomes "the browser makes the sizes, the backend checks them" — the owner chose the existing setup (R2 + cdn.musafirbaba.com) and no new image package in the shared backend.
