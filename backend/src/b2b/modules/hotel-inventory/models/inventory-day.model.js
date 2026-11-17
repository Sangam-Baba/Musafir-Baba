// @ts-check
/**
 * `inv_inventory_days`: one document per room type per night (`docs/plan/05-inventory-and-no-double-booking.md` §3).
 * `total` = rooms the hotel gives MusafirBaba that night (allotment), `booked` = confirmed, `held` = in checkout.
 * Who holds / owns the rooms is recorded in the same document (`holds[]`, `bookings[]`) — that is what makes
 * every step safe without transactions. A collection validator (migration 0029) rejects `booked + held > total`,
 * negative counts and counts that don't match their owners. Never deleted.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const INVENTORY_DAYS_COLLECTION = 'inv_inventory_days';

const schema = new b2bMongoose.Schema(
  {
    hotelOrgId: { type: String, required: true },
    propertyId: { type: String, required: true },
    roomTypeId: { type: String, required: true },
    date: { type: String, required: true },
    total: { type: Number, required: true, min: 0 },
    booked: { type: Number, required: true, min: 0 },
    held: { type: Number, required: true, min: 0 },
    stopSell: { type: Boolean, default: false },
    holds: {
      type: [
        {
          _id: false,
          holdId: { type: String, required: true },
          qty: { type: Number, required: true },
          expiresAt: { type: Date, required: true },
        },
      ],
      default: [],
    },
    bookings: { type: [{ _id: false, bookingId: { type: String, required: true }, qty: { type: Number, required: true } }], default: [] },
    version: { type: Number, default: 1 },
  },
  { timestamps: true, versionKey: false },
);

export const InventoryDayRecord = defineTenantModel('InvInventoryDay', schema, INVENTORY_DAYS_COLLECTION, ['hotelOrgId']);

/** The database rule (plan `05-…` §3): created by migration, checked on every write by MongoDB itself. */
export const INVENTORY_DAY_VALIDATOR = {
  $and: [
    { total: { $type: 'number', $gte: 0 } },
    { booked: { $type: 'number', $gte: 0 } },
    { held: { $type: 'number', $gte: 0 } },
    { $expr: { $lte: [{ $add: ['$booked', '$held'] }, '$total'] } },
    { $expr: { $eq: ['$held', { $sum: '$holds.qty' }] } },
    { $expr: { $eq: ['$booked', { $sum: '$bookings.qty' }] } },
  ],
};
