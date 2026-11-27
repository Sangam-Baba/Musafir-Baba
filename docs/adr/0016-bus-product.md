# ADR-0016: Bus service as a second product

- **Status:** Accepted (owner approved the Stage 18 plan, 2026-11-25)
- **Date:** 2026-11-25

## Context
The owner wants bus operators to onboard buses, routes and schedules, and website customers and B2B clients to book
exact seats (including part of a route), like hotels. The plan's roadmap pattern for new products is: new modules,
an `OrderItemHandler`, data-only pricing / tax changes, no change to orders / wallet / payments core.

## Decision
- New company type `BUS_OPERATOR` (roles Owner / Manager / Counter staff), additive to `PLATFORM`, `CLIENT`, `HOTEL`.
- New modules `bus-catalog`, `bus-inventory`, `bus-booking`; new allowed collection prefix **`bus_`** (checked: no
  collection in the live database and no existing model starts with `bus`).
- Seats are protected per trip seat with a leg bitmask and one conditional update (`$bitsAllClear` → `$bit or`),
  recording the hold / booking / block id in the same update — the hotel inventory guarantee applied to seats and
  route legs (plan `stages/stage-18-bus-service.md` §5).
- Uploads get a second purpose `bus-paper` (permission `bus-catalog.vehicle.manage`); KYC uploads are unchanged.
- Payables / payout runs become supplier-generic in B7 (separate change, hotel behaviour unchanged).
- Everything behind `B2B_BUS_ENABLED` (listing) and `B2B_BUS_SELLING_ENABLED` (selling); website pages behind
  `NEXT_PUBLIC_FEATURE_BUS`. The vehicle-partner system (MBGO / MBConnect) is never imported or changed.

## Consequences
- Org-type lists, KYC document sets and system roles carry a third business type.
- Bus code lives only in the new modules and new route files; hotel modules are not imported by them.
