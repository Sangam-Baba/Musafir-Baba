# Module: `hotel-catalog`

| | |
| --- | --- |
| **Collections (prefix)** | `htl_properties`, `htl_room_types`, `htl_cities`, `htl_amenities`, `htl_property_types`, `htl_bed_types`, `htl_meal_plans` (`htl_`) |
| **Introduced** | Stage 03 (S03-T01 … T13) |
| **Public interface** | `index.js` only |

## Purpose

Hotel listings: master lists (cities and areas, amenities, property types, bed types, meal plans), properties built through a
wizard, room types, photos, the listing approval workflow with revisions for sensitive fields on live properties, channel
visibility (website / B2B), and the public content read model (`GET /hotels/{ref}`).

Never stores bytes itself (photos go to the existing R2 bucket served at `cdn.musafirbaba.com`, D32), never touches rates or
availability (hotel-inventory, Stage 04). Other modules learn about changes through events
(`hotel-catalog.property.published / updated / suspended`).

Rules: `src/b2b/AGENTS.md`; plan: `docs/plan/stages/stage-03-hotel-listings.md`; data model: `docs/plan/04-domain-model.md` §3;
decision D32 in `docs/plan/09-decisions-and-risks.md`.
