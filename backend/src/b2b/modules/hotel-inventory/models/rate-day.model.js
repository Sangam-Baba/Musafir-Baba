// @ts-check
/**
 * `inv_rate_days`: prices and rules per rate plan × room type × night (plan Stage 04 §3.4). Tax-exclusive
 * paise. Derived plans store only their own rules here (prices come from the parent when read).
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const RATE_DAYS_COLLECTION = 'inv_rate_days';

const schema = new b2bMongoose.Schema(
  {
    hotelOrgId: { type: String, required: true },
    propertyId: { type: String, required: true },
    ratePlanId: { type: String, required: true },
    roomTypeId: { type: String, required: true },
    date: { type: String, required: true },
    prices: {
      type: [{ _id: false, guests: { type: Number, required: true, min: 0, max: 30 }, amount: { type: Number, required: true, min: 100 } }],
      default: [],
    },
    minLos: { type: Number, default: null, min: 1, max: 30 },
    maxLos: { type: Number, default: null, min: 1, max: 30 },
    closedToArrival: { type: Boolean, default: false },
    closedToDeparture: { type: Boolean, default: false },
    stopSell: { type: Boolean, default: false },
    version: { type: Number, default: 1 },
  },
  { timestamps: true, versionKey: false },
);

export const RateDayRecord = defineTenantModel('InvRateDay', schema, RATE_DAYS_COLLECTION, ['hotelOrgId']);
