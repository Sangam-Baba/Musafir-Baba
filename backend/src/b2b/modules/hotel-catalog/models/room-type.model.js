// @ts-check
/**
 * `htl_room_types`: the room types of a property (plan Stage 03 §3.3). Owned by the hotel org; always read
 * through its property (so property limits apply). Names are unique within a property (`nameKey`). Saved
 * with a version check like the property. Photos come with S03-T05.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { eventFields } from '../../../core/db/events.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const ROOM_TYPES_COLLECTION = 'htl_room_types';

const schema = new b2bMongoose.Schema(
  {
    hotelOrgId: { type: String, required: true },
    propertyId: { type: String, required: true },
    name: { type: String, required: true, maxlength: 80 },
    nameKey: { type: String, required: true },
    description: { type: String, default: '', maxlength: 3000 },
    sizeSqm: { type: Number, default: null, min: 5, max: 2000 },
    beds: {
      type: [{ _id: false, bedTypeKey: { type: String, required: true }, count: { type: Number, required: true, min: 1, max: 10 } }],
      default: [],
    },
    maxAdults: { type: Number, required: true, min: 1, max: 20 },
    maxChildren: { type: Number, required: true, min: 0, max: 10 },
    maxOccupancy: { type: Number, required: true, min: 1, max: 30 },
    extraBeds: { allowed: { type: Boolean, default: false }, max: { type: Number, default: 0, min: 0, max: 5 } },
    amenities: { type: [String], default: [] },
    order: { type: Number, default: 100 },
    status: { type: String, enum: ['ACTIVE', 'ARCHIVED'], default: 'ACTIVE' },
    version: { type: Number, default: 1 },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
    ...eventFields(b2bMongoose), // a change to a live property's room type tells search (hotel-catalog.property.updated)
  },
  { timestamps: true, versionKey: false },
);

export const RoomTypeRecord = defineTenantModel('HotelRoomType', schema, ROOM_TYPES_COLLECTION, ['hotelOrgId']);
