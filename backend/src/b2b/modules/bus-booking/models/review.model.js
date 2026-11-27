// @ts-check
/**
 * Bus reviews (`bus_reviews`, plan Stage 18 B8): one per booking (unique), only after the trip (booking COMPLETED),
 * by the buyer — rating 1–5 and an optional comment. Shown at once (PUBLISHED); MusafirBaba staff can hide one (with a
 * note) or show it again; the bus company may reply once (and change its reply).
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const REVIEWS_COLLECTION = 'bus_reviews';

const schema = new b2bMongoose.Schema(
  {
    bookingId: { type: String, required: true },
    bookingRef: { type: String, required: true },
    operatorOrgId: { type: String, required: true },
    tripId: { type: String, required: true },
    routeName: { type: String, default: '' },
    tripDate: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, default: null, maxlength: 1000 },
    authorName: { type: String, required: true, maxlength: 60 },
    by: { type: String, required: true },
    status: { type: String, enum: ['PUBLISHED', 'HIDDEN'], default: 'PUBLISHED' },
    moderation: { type: { _id: false, by: String, at: Date, note: String }, default: null },
    reply: { type: { _id: false, text: String, by: String, at: Date }, default: null },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const BusReviewRecord = defineTenantModel('BusReview', schema, REVIEWS_COLLECTION, ['operatorOrgId']);
