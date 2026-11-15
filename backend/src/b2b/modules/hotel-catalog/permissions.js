// @ts-check
/**
 * Permissions of the hotel-catalog module (hotel listings, Stage 03).
 * Hotel side: Owner (everything) and Manager (`hotel-catalog.**`, limited to the properties assigned to them).
 * MusafirBaba side: the Hotels team (`hotel-catalog.**`) reviews and edits listings; Operations and Support
 * (`hotel-catalog.**.read`) only look.
 */
import { definePermissions } from '../../core/permissions.js';

export const { codes: PERMISSIONS, catalogue: PERMISSION_CATALOGUE } = definePermissions('Hotel listings', {
  propertyRead: {
    code: 'hotel-catalog.property.read',
    description: "See the organisation's properties, room types and photos",
    orgTypes: ['HOTEL'],
  },
  propertyManage: {
    code: 'hotel-catalog.property.manage',
    description: 'Create and edit properties, room types and photos, and submit them for approval',
    orgTypes: ['HOTEL'],
  },
  listingRead: {
    code: 'hotel-catalog.listing.read',
    description: 'MusafirBaba admin: see every property and the approval queue',
    orgTypes: ['PLATFORM'],
  },
  listingReview: {
    code: 'hotel-catalog.listing.review',
    description: 'MusafirBaba admin: approve listings and changes, request changes, edit, suspend and archive',
    orgTypes: ['PLATFORM'],
  },
  masterManage: {
    code: 'hotel-catalog.master.manage',
    description: 'MusafirBaba admin: cities, areas, amenities, property types, bed types and meal plans',
    orgTypes: ['PLATFORM'],
  },
});
