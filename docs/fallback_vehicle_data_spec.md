# Fallback Vehicle Data (Spec — not yet implemented)

## Problem

Ride fare offers on `GET /api/ride/quote` come entirely from `computeCategoryOffers()`
in [`backend/src/controllers/ride.controller.js`](../backend/src/controllers/ride.controller.js),
which only looks at real, active `PartnerVehicle` documents whose partner has
a `PartnerSettings.vehicleConfigs` entry serviceable for the pickup city. If
no onboarded partner covers that city/vehicle category yet, `offers` comes
back empty and the mbgo app (`ScreenRiderHome.tsx`, `handleSearchCabs`) shows
a dead-end toast: "No vehicles currently serve this route" — the rider gets
no vehicle options or pricing at all, even as a rough estimate.

## Goal

When the real-partner match produces zero (or partial) offers for a
category, fall back to admin-configured placeholder vehicle data instead of
leaving the rider with nothing — so every route always shows at least an
estimated price per vehicle category, even in cities without onboarded
partners yet.

## Proposed data model

A new collection, e.g. `FallbackVehicleRate`, one row per vehicle category:

```js
{
  category: String,        // e.g. "Hatchback", "Sedan", "SUV" -- same enum as PartnerVehicle.category
  vehicleName: String,     // display name, e.g. "Swift Dzire or equivalent"
  seatingCapacity: Number,
  perKmRate: Number,       // used the same way vehicleConfig.perKmRate is today
  isActive: Boolean,       // admin can disable a category without deleting it
}
```

## Proposed admin panel UI

A new "Fallback Vehicle Rates" screen (Fleet Management group, alongside
Rider Verification / Ride Bookings) where admin can list/create/edit/disable
these rows — plain CRUD, no verification workflow needed.

## Proposed backend behavior

In `computeCategoryOffers()`, after building `offersByCategory` from real
partner vehicles, fill in any category present in `FallbackVehicleRate`
(active rows) that has no real offer yet, using the same
`baseFare = Math.round(perKmRate * distanceKm)` + `FLAT_DRIVER_ALLOWANCE`
math already used for real offers. Mark these entries (e.g. `isFallback:
true`) in the response so the app/admin can distinguish an estimate from a
real partner-backed offer if that distinction ever matters later.

## Out of scope for now

This is a spec only — no model, controller, route, or UI has been built for
this yet. It's tracked here so the admin panel work can pick it up directly
against this shape when scheduled.
