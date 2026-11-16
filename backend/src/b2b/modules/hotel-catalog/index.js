// @ts-check
/** PUBLIC interface of the hotel-catalog module — other modules import only from here. */
export { EVENTS } from './events.js';
export { PERMISSION_CATALOGUE, PERMISSIONS } from './permissions.js';
export {
  CITIES_COLLECTION,
  AMENITIES_COLLECTION,
  PROPERTY_TYPES_COLLECTION,
  BED_TYPES_COLLECTION,
  MEAL_PLANS_COLLECTION,
  AMENITY_LEVELS,
  CityRecord,
  AmenityRecord,
  PropertyTypeRecord,
  BedTypeRecord,
  MealPlanRecord,
} from './models/masters.model.js';
export { createMastersService, seedMasters, KEYED_MASTERS } from './masters.service.js';
export { slugify, isInIndia } from './domain/slug.js';
export { PROPERTIES_COLLECTION, PROPERTY_STATUSES, PropertyRecord } from './models/property.model.js';
export { createPropertyService } from './property.service.js';
export { SECTIONS, DEFAULT_TIME_ZONE, distanceKm, isTime, isTimeZone, plainText, sectionsDone } from './domain/property.js';
