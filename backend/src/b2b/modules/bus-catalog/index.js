// @ts-check
/** PUBLIC interface of the bus-catalog module (Stage 18) — other modules import only from here. */
export { EVENTS } from './events.js';
export { PERMISSION_CATALOGUE, PERMISSIONS } from './permissions.js';
export { DECKS, SEAT_TYPES, LAYOUT_TEMPLATES, checkLayout, layoutSummary } from './domain/layout.js';
export {
  PAPER_KINDS,
  AMENITIES,
  VEHICLE_STATUSES,
  REVIEW_MOVES,
  paperProblems,
  sellable,
  remindersDue,
  daysUntil,
} from './domain/vehicle.js';
export { LAYOUTS_COLLECTION, LayoutRecord } from './models/layout.model.js';
export { VEHICLES_COLLECTION, VehicleRecord } from './models/vehicle.model.js';
export { createLayouts, layoutDto } from './layouts.service.js';
export { createVehicles, vehicleDto, normaliseRegNo, PAPER_FILE_PURPOSE } from './vehicles.service.js';
export { createBusReview } from './review.service.js';
