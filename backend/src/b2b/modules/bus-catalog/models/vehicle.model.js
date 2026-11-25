// @ts-check
/**
 * Buses (`bus_vehicles`, plan Stage 18 B2): an operator's bus — registration number (unique), AC or not, kind,
 * layout, amenities, papers with expiry dates, and the review state. Staff approve a bus before it can sell; a bus
 * whose papers have expired cannot sell until they are renewed.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { eventFields } from '../../../core/db/events.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const VEHICLES_COLLECTION = 'bus_vehicles';

const schema = new b2bMongoose.Schema(
  {
    operatorOrgId: { type: String, required: true },
    regNo: { type: String, required: true, maxlength: 15 },
    name: { type: String, default: null, maxlength: 80 },
    acType: { type: String, enum: ['AC', 'NON_AC'], required: true },
    kind: { type: String, enum: ['SEATER', 'SLEEPER', 'SEMI_SLEEPER', 'MIXED'], required: true },
    layoutId: { type: String, default: null },
    amenities: { type: [String], default: [] },
    // B8: photos (sizes made by the browser, checked, stored in the public folder; `url` kept with each size)
    photos: {
      type: [
        {
          category: { type: String, enum: ['OUTSIDE', 'INSIDE', 'SEATS', 'OTHER'] },
          caption: { type: String, default: null, maxlength: 140 },
          order: Number,
          variants: b2bMongoose.Schema.Types.Mixed,
          placeholder: String,
          uploadedBy: String,
          uploadedAt: Date,
        },
      ],
      default: [],
    },
    papers: { type: [{ _id: false, kind: String, fileId: String, number: String, expiresOn: String, addedAt: Date }], default: [] },
    status: { type: String, default: 'DRAFT' },
    review: { type: { _id: false, by: String, at: Date, note: String }, default: null },
    remindersSent: { type: [String], default: [] },
    version: { type: Number, default: 1 },
    createdBy: { type: String, required: true },
    ...eventFields(b2bMongoose),
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const VehicleRecord = defineTenantModel('BusVehicle', schema, VEHICLES_COLLECTION, ['operatorOrgId']);
