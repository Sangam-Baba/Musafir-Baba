// @ts-check
/** PUBLIC interface of the bus-inventory module (Stage 18) — other modules import only from here. */
export { PERMISSION_CATALOGUE, PERMISSIONS } from './permissions.js';
export { TRIPS_COLLECTION, TripRecord } from './models/trip.model.js';
export { TRIP_SEATS_COLLECTION, TripSeatRecord } from './models/trip-seat.model.js';
export { createTrips, cancelUnsold, tripDto, HORIZON_DAYS } from './trips.service.js';
export { CLAIMS_COLLECTION, CLAIM_STATUSES, ClaimRecord } from './models/claim.model.js';
export { createClaims, claimDto, HOLD_MINUTES } from './claims.service.js';
export { journeyLegs, maskOf, entriesOverlap, freeFor } from './domain/seats.js';
