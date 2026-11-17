# Stage 03 — Hotel Listings

| | |
| --- | --- |
| **Phase** | A — hotels + website (working system) |
| **Duration** | ~2 weeks |
| **Depends on** | Stage 01 (Stage 02 for real hotels; can use seeded approved hotels meanwhile) |
| **Modules** | `hotel-catalog`, `files` |
| **Apps** | Business area `/hotel` workspace, `admin` (listing approval, masters) |

## 1. Goal

An approved hotel creates complete, good-quality listings with room types and photos; MusafirBaba approves them; they become `LIVE` and visible on the channels chosen (website, B2B).

## 2. Scope

**In:** masters (cities/areas, amenities, property types, bed types, meal plans), property wizard, room types, photo pipeline, policies, listing approval with revisions, channel visibility, admin management of every listing, publish events.
**Out:** rates & calendar (Stage 04), search (Stage 06).

## 3. Work breakdown

1. **Masters** (admin): cities/areas (with coordinates, state code), amenities (property/room level, grouped, icons), property types, bed types.
2. **Property wizard** (autosaved): basic info → location (map pin + address; geo inside city check) → contacts for reservations (email/phone/WhatsApp) → check-in/out times, time zone (default `Asia/Kolkata`) → policies (children, extra beds, pets, ID, couple-friendly, smoking) → amenities → photos → room types → review & submit.
3. **Room types**: name, description, size, beds, max adults/children/occupancy, extra beds, amenities, photos.
4. **Photos**: upload via `files`; worker makes WebP variants (thumb, card, gallery, hero) and blur placeholder; min width 1200 px; at least 5 property photos and 2 per room type to submit; category, caption, order, cover. Public photos served via CDN (existing Cloudflare R2 or Cloudinary — decide from system map).
5. **Approval**: submit → admin checklist (photo quality, address/geo, duplicate check by name within 200 m, policies complete) → approve or request changes with comments per section. On LIVE properties, edits to **name, address, location, star rating** go to a pending revision; other edits publish directly.
6. **Visibility**: `website` and `b2b` flags, optional client categories, "sell from" date; admin can suspend instantly.
7. **Admin**: all properties list (filters: status, city, hotel org), detail with full edit rights, approval queue, revision diff, suspend/archive.
8. **Events**: `hotelCatalog.property.published|updated|suspended` for search and caches.
9. **Public content read model**: what the website/dashboard show for a property (`GET /hotels/{ref}`) — only LIVE and visible for the caller's channel.

## 4. Collections & indexes

`htl_properties` (2dsphere on `location`, `{status, cityId}`, `{hotelOrgId}`, unique `{slug}`), `htl_room_types` (`{propertyId}`), `htl_cities`, `htl_amenities`, `htl_property_types`. Tenant plugin: scoped by `hotelOrgId` for hotel users; public reads through the content service only.

## 5. API

Hotel: CRUD `/hotel/properties`, `/hotel/properties/{id}/room-types`, `/media`, `/policies`, `POST /hotel/properties/{id}/submit`.
Public: `GET /hotels/{propertyRef}`.
Admin: `/admin/properties` (list, detail, approve, request-changes, suspend, archive), `/admin/masters/*`.

## 6. Rules & edge cases

- A hotel org can own many properties; staff can be limited to some.
- Changing time zone or check-in time affects cancellation deadlines → needs approval; existing bookings keep their snapshot.
- Suspending removes from search immediately; existing bookings unaffected; ops alerted.
- No delete once rates or bookings exist — archive.

## 7. Security

| Threat | Control | Test |
| --- | --- | --- |
| Hotel edits another hotel's listing | Tenant guard + property limits | Isolation tests |
| XSS in descriptions | Plain text (or limited markdown) sanitised on render | Payload test |
| Fake listings | Hotel KYC + approval + duplicate check | Workflow tests |
| Photo GPS/metadata leak | EXIF stripped | Test |

## 8. Mandatory tests

Listing state machine; revision rules (sensitive vs direct); visibility filter on public endpoint per channel; photo variants + EXIF strip; isolation.

## 9. Definition of Done

- [ ] Hotel completes wizard with 2 room types and photos, submits
- [ ] Admin approves; property LIVE; publish event emitted
- [ ] Website and dashboard can fetch the property content (visibility respected)
- [ ] Sensitive edit on LIVE property waits for approval without taking it offline

## 10. AI editor prompt

```
Read: AGENTS.md, 04-domain-model.md §3 & §7.2, this stage, docs/modules/hotel-catalog.md.
Task: §3.5 — listing approval with revisions: submit, approve, request changes (section comments), direct-publish vs pending revision for sensitive fields, events.
Constraints: modules/hotel-catalog only.
Tests first: state machine table; sensitive field edit creates pendingRevision; non-sensitive publishes; version conflict on concurrent edit → 412; events in outbox.
```
