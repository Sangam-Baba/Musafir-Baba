# Module: bus-catalog (Stage 18 B2)

An operator's buses: seat layouts, bus details, papers, and MusafirBaba's review.

| | |
| --- | --- |
| **Collections** | `bus_layouts`, `bus_vehicles` (migration 0083) |
| **Tenant** | `operatorOrgId` |
| **Public interface** | `index.js` only |

- Layout: one or two decks, a grid, seats (number, SEATER / SEMI_SLEEPER / SLEEPER, ladies-only, sleepers may span 2
  cells); templates (2+2 seater, 2+1 sleeper…). A layout used by a submitted / approved bus is locked (copy to change).
- Bus: registration number (unique), AC / non-AC, kind, layout, amenities, papers RC / permit / insurance / fitness with
  expiry. Draft → submitted → approved / changes requested; suspended / reinstated by staff; retired.
- Sellable = approved and every paper valid today. Reminders 30 and 7 days before expiry and on expiry (events).
