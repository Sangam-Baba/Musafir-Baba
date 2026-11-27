// @ts-check
/**
 * Keeping bus payables in step with their bookings (plan Stage 18 B7): `sync(bookingId)` writes what the booking owes
 * now (`owedOf`) unless the payable is in a run or PAID (locked — a later change is only logged for finance). Called on
 * every booking event and by the hourly job. Repeat-safe.
 */
import { systemScope } from '../../core/db/tenant-plugin.js';
import { BUS_ENGINE_SCOPE, BusBookingRecord } from '../bus-booking/index.js';
import { owedOf } from './domain/owed.js';
import { BusPayableRecord } from './models/payable.model.js';

const SCOPE = systemScope('bus-payouts: payables', { routine: true });

/** @param {Record<string, any>} p */
export const busPayableDto = (p) => ({
  id: String(p._id),
  bookingRef: p.bookingRef,
  orderRef: p.orderRef,
  tripDate: p.tripDate,
  amountPaise: p.amountPaise,
  status: p.status,
  eligibleAt: p.eligibleAt,
  runId: p.runId,
  paidAt: p.paidAt,
});

/** @param {{ clock: import('../../core/clock.js').Clock, logger: import('../../core/logger.js').Logger }} deps */
export function createBusPayables(deps) {
  return {
    /** @param {string} bookingId */
    async sync(bookingId) {
      const b = /^[a-f0-9]{24}$/.test(bookingId)
        ? await BusBookingRecord.findOne({ _id: bookingId }).setOptions(BUS_ENGINE_SCOPE).lean()
        : null;
      if (!b || !['CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(b.status)) return null;
      const { amountPaise, state } = owedOf(b);
      const current = /** @type {any} */ (await BusPayableRecord.findOne({ bookingId }).setOptions(SCOPE).lean());
      if (current?.status === 'PAID' || current?.runId) {
        if (current.amountPaise !== amountPaise)
          deps.logger.warn(
            { bookingRef: b.ref, paid: current.amountPaise, now: amountPaise },
            'bus payables: a paid payable changed — finance to adjust',
          );
        return busPayableDto(current);
      }
      if (current && current.amountPaise === amountPaise && current.status === state) return busPayableDto(current);
      const now = deps.clock.now();
      await BusPayableRecord.updateOne(
        { bookingId, status: { $ne: 'PAID' }, runId: null },
        {
          $set: {
            bookingRef: b.ref,
            orderRef: b.orderRef,
            operatorOrgId: b.operatorOrgId,
            tripDate: b.date,
            amountPaise,
            status: state,
            ...(state === 'ELIGIBLE' && current?.status !== 'ELIGIBLE' ? { eligibleAt: now } : {}),
          },
          $push: { history: { at: now, status: state, amountPaise } },
        },
        { upsert: !current },
      ).setOptions(SCOPE);
      return busPayableDto(/** @type {any} */ (await BusPayableRecord.findOne({ bookingId }).setOptions(SCOPE).lean()));
    },
    /** A bus company's payables (newest trips first). @param {string} orgId @param {{ status?: string }} [q] */
    forOperator: async (orgId, q = {}) =>
      (
        await BusPayableRecord.find({ operatorOrgId: orgId, ...(q.status ? { status: q.status } : {}) })
          .sort({ tripDate: -1 })
          .limit(1000)
          .lean()
      ).map(busPayableDto),
  };
}
