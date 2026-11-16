// @ts-check
/**
 * `htl_properties`: one hotel listing (plan Stage 03 §3.2; data model 04-domain-model.md §3). Owned by the hotel org
 * (`hotelOrgId`). Built section by section in the wizard; every save is a conditional update on `version`
 * (two people editing → the second gets 412 and reloads). Photos, room types, approval and revisions come in
 * S03-T04 … T07. `location` is a GeoJSON point [lng, lat] (2dsphere index, for the duplicate check and search).
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { eventFields } from '../../../core/db/events.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const PROPERTIES_COLLECTION = 'htl_properties';
export const PHOTO_CATEGORIES = /** @type {const} */ ([
  'EXTERIOR',
  'LOBBY',
  'ROOM',
  'BATHROOM',
  'RESTAURANT',
  'POOL',
  'AMENITIES',
  'VIEW',
  'OTHER',
]);
export const PROPERTY_STATUSES = /** @type {const} */ (['DRAFT', 'SUBMITTED', 'CHANGES_REQUESTED', 'LIVE', 'SUSPENDED', 'ARCHIVED']);

const schema = new b2bMongoose.Schema(
  {
    hotelOrgId: { type: String, required: true },
    publicRef: { type: String, required: true },
    slug: { type: String, required: true },
    status: { type: String, enum: PROPERTY_STATUSES, default: 'DRAFT' },
    version: { type: Number, default: 1 },
    // basic
    name: { type: String, required: true, maxlength: 120 },
    propertyTypeKey: { type: String, required: true },
    starRating: { type: Number, default: 0, min: 0, max: 5 }, // 0 = not rated
    description: { type: String, default: '', maxlength: 5000 },
    // location
    cityId: { type: String, default: null },
    areaId: { type: String, default: null },
    stateCode: { type: String, default: null },
    address: { line1: { type: String, default: null }, line2: { type: String, default: null }, pin: { type: String, default: null } },
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number], default: undefined },
    },
    // reservations contacts (receive booking alerts in later stages)
    contacts: { email: { type: String, default: null }, phone: { type: String, default: null }, whatsapp: { type: String, default: null } },
    // times
    checkInTime: { type: String, default: null },
    checkOutTime: { type: String, default: null },
    timeZone: { type: String, default: 'Asia/Kolkata' },
    policies: {
      type: new b2bMongoose.Schema(
        {
          childrenAllowed: { type: Boolean, required: true },
          childFreeUntilAge: { type: Number, default: 0, min: 0, max: 17 },
          extraBeds: { type: Boolean, required: true },
          petsAllowed: { type: Boolean, required: true },
          coupleFriendly: { type: Boolean, required: true },
          localIdAccepted: { type: Boolean, required: true },
          smoking: { type: String, enum: ['NO', 'DESIGNATED', 'YES'], required: true },
          idProofs: { type: [String], default: [] },
          notes: { type: String, default: null, maxlength: 2000 },
        },
        { _id: false },
      ),
      default: null,
    },
    amenities: { type: [String], default: [] },
    // S03-T05: photos of the property (roomTypeId null) and of its room types; sizes made by the browser, checked by the server
    photos: {
      type: [
        new b2bMongoose.Schema(
          {
            roomTypeId: { type: String, default: null },
            category: { type: String, enum: PHOTO_CATEGORIES, required: true },
            caption: { type: String, default: null, maxlength: 140 },
            order: { type: Number, default: 100 },
            isCover: { type: Boolean, default: false },
            variants: { type: b2bMongoose.Schema.Types.Mixed, required: true }, // { thumb: { key, width, height, type }, card, gallery, hero? }
            placeholder: { type: String, required: true },
            uploadedBy: { type: String, required: true },
            uploadedAt: { type: Date, required: true },
          },
          { _id: true },
        ),
      ],
      default: [],
    },
    // S03-T07: sensitive edits to a live listing wait here (the live values stay until MusafirBaba approves)
    pendingRevision: {
      type: new b2bMongoose.Schema(
        {
          revisionId: { type: String, required: true }, // changes whenever more edits are added — approval names the one it saw
          changes: { type: b2bMongoose.Schema.Types.Mixed, required: true },
          submittedAt: { type: Date, required: true },
          submittedBy: { type: String, required: true },
        },
        { _id: false },
      ),
      default: null,
    },
    // S03-T06: listing workflow (status table in domain/listing-workflow.js)
    round: { type: Number, default: 0 },
    submittedAt: { type: Date, default: null },
    decidedAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    history: {
      type: [
        {
          _id: false,
          at: { type: Date, required: true },
          action: { type: String, required: true },
          status: { type: String, required: true },
          by: { type: String, required: true },
          note: { type: String, default: null },
        },
      ],
      default: [],
    },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
    ...eventFields(b2bMongoose),
  },
  { timestamps: true, versionKey: false },
);

export const PropertyRecord = defineTenantModel('HotelProperty', schema, PROPERTIES_COLLECTION, ['hotelOrgId']);
