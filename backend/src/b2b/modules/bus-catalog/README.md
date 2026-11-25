# Module: bus-catalog (Stage 18 B2–B3)

An operator's buses (seat layouts, details, papers), boarding points, routes and schedules, and MusafirBaba's review.

| | |
| --- | --- |
| **Collections** | `bus_layouts`, `bus_vehicles` (migration 0083); `bus_stops`, `bus_routes`, `bus_schedules` (0084) |
| **Tenant** | `operatorOrgId` |
| **Public interface** | `index.js` only |

- Layout: one or two decks, a grid, seats (number, SEATER / SEMI_SLEEPER / SLEEPER, ladies-only, sleepers may span 2
  cells); templates (2+2 seater, 2+1 sleeper…). A layout used by a submitted / approved bus is locked (copy to change).
- Bus: registration number (unique), AC / non-AC, kind, layout, amenities, papers RC / permit / insurance / fitness with
  expiry. Draft → submitted → approved / changes requested; suspended / reinstated by staff; retired.
- Sellable = approved and every paper valid today. Reminders 30 and 7 days before expiry and on expiry (events).
- Points: an operator's places in a city from the shared city list (passed in as `cityExists` — the module never
  imports hotel code). A point's city never changes; points are switched off, not deleted.
- Route: 2–31 ordered stops (30 legs keep leg masks inside int32) with time + day offset (next-day arrival), boarding /
  dropping per stop; all problems at once; first and last city different. Stops change only in DRAFT /
  CHANGES_REQUESTED; staff approve like buses. A route with an active schedule can't be retired.
- Schedule: approved route + approved bus with a layout + weekdays + first / last day (first day today … +365). Never
  edited: ended from a day (bus-inventory cancels unsold trips from then). `forTrips()` / `ended()` feed the trip job.
