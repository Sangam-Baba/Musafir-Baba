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
export { PROPERTIES_COLLECTION, PROPERTY_STATUSES, PHOTO_CATEGORIES, PropertyRecord } from './models/property.model.js';
export { createPropertyService } from './property.service.js';
export { SECTIONS, DEFAULT_TIME_ZONE, distanceKm, isTime, isTimeZone, plainText, sectionsDone } from './domain/property.js';
export { ROOM_TYPES_COLLECTION, RoomTypeRecord } from './models/room-type.model.js';
export { createRoomTypeService } from './room-type.service.js';
export { createPhotoService, MAX_PROPERTY_PHOTOS, MAX_ROOM_PHOTOS } from './photo.service.js';
export { VARIANTS, imageInfo, checkVariant, checkPhoto, checkPlaceholder } from './domain/photo-check.js';
export { createListingService } from './listing.service.js';
export { LISTING_TRANSITIONS, listingTransition, submitBlockers, MIN_PROPERTY_PHOTOS, MIN_ROOM_PHOTOS } from './domain/listing-workflow.js';
export { createRevisionService } from './revision.service.js';
export { SENSITIVE_FIELDS, splitChanges, LIVE_STATUSES } from './domain/revisions.js';
export { createAdminListingService } from './admin-listing.service.js';
export { namesSimilar, nameTokens, DUPLICATE_RADIUS_M } from './domain/duplicates.js';
export { createContentService } from './content.service.js';
export { createVisibilityService } from './visibility.service.js';
export { isVisible, CHANNELS } from './domain/visibility.js';
export { createSearchCatalog, MAX_CANDIDATES, MAX_RADIUS_KM } from './search-catalog.service.js';
