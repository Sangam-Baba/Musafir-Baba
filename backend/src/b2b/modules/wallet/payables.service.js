// @ts-check
/**
 * Keeping hotel payables in step with their bookings (plan Stage 09 §3.9). Shared module — it never reads booking
 * collections: the caller gives `stateOf(bookingId)` (wired at start-up). `sync` writes what the booking owes now, unless
 * the payable is PAID (locked); a change of amount or status is added to its history. Repeat-safe.
 */
import { systemScope } from '../../core/db/tenant-plugin.js';
import { PayableRecord } from './models/payable.model.js';

const SCOPE = systemScope('wallet: hotel payables', { routine: true });

/**
 * @typedef {{ bookingId: string, bookingRef: string, orderRef: string, hotelOrgId: string, propertyId: string, checkOut: string,
 *   amountPaise: number, state: 'PENDING' | 'ELIGIBLE' | 'VOID' }} PayableState
 * @typedef {{ clock: import('../../core/clock.js').Clock, logger: import('../../core/logger.js').Logger,
 *   stateOf: (bookingId: string) => Promise<PayableState | null> }} PayablesDeps
 */

/** @param {Record<string, any>} p */
export const payableDto = (p) => ({
  id: String(p._id),
  bookingRef: p.bookingRef,
  orderRef: p.orderRef,
  propertyId: p.propertyId,
  checkOut: p.checkOut,
  amountPaise: p.amountPaise,
  status: p.status,
  eligibleAt: p.eligibleAt,
  payoutId: p.payoutId,
  paidAt: p.paidAt,
});

/** @param {PayablesDeps} deps @param {string} bookingId */
async function sync(deps, bookingId) {
  const s = await deps.stateOf(bookingId);
  if (!s) return null;
  const now = deps.clock.now();
  const current = /** @type {any} */ (await PayableRecord.findOne({ bookingId }).setOptions(SCOPE).lean());
  if (current?.status === 'PAID') {
    if (current.amountPaise !== s.amountPaise)
      deps.logger.warn(
        { bookingRef: s.bookingRef, paid: current.amountPaise, now: s.amountPaise },
        'payables: a paid payable changed — finance to adjust',
      );
    return payableDto(current);
  }
  if (current && current.amountPaise === s.amountPaise && current.status === s.state) return payableDto(current);
  const { state, ...fields } = s;
  await PayableRecord.updateOne(
    { bookingId, status: { $ne: 'PAID' } },
    {
      $set: { ...fields, status: state, ...(state === 'ELIGIBLE' && current?.status !== 'ELIGIBLE' ? { eligibleAt: now } : {}) },
      $push: { history: { at: now, status: s.state, amountPaise: s.amountPaise } },
    },
    { upsert: !current },
  ).setOptions(SCOPE);
  return payableDto(/** @type {any} */ (await PayableRecord.findOne({ bookingId }).setOptions(SCOPE).lean()));
}

/** @param {PayablesDeps} deps */
export function createPayables(deps) {
  return {
    /** @param {string} bookingId */
    sync: (bookingId) => sync(deps, bookingId),
    /**
     * A hotel's payables (newest stays first).
     * @param {string} hotelOrgId
     * @param {{ status?: string, from?: string, to?: string }} [q] check-out dates
     */
    async forHotel(hotelOrgId, q = {}) {
      /** @type {Record<string, any>} */
      const filter = { hotelOrgId };
      if (q.status) filter.status = q.status;
      if (q.from || q.to) filter.checkOut = { ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lte: q.to } : {}) };
      return (await PayableRecord.find(filter).setOptions(SCOPE).sort({ checkOut: -1 }).limit(1000).lean()).map(payableDto);
    },
    /** Hotels with payables ready to pay, and how much (finance). */
    async due() {
      return PayableRecord.aggregate([
        { $match: { status: 'ELIGIBLE' } },
        { $group: { _id: '$hotelOrgId', amountPaise: { $sum: '$amountPaise' }, bookings: { $sum: 1 }, oldest: { $min: '$eligibleAt' } } },
        { $sort: { oldest: 1 } },
      ]).option(SCOPE);
    },
  };
}
