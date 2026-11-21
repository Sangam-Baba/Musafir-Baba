// @ts-check
/**
 * Keeping the booking summaries up to date (plan Stage 09 §3.1). Shared module — it never reads order or booking
 * collections itself: the caller gives `rowsOf(orderId)` (the order's bookings as summary rows, wired at start-up) and
 * `orderIds(afterId, limit)` (for a rebuild). `project` replaces the order's rows with what they are now, so applying
 * events twice, late or out of order always ends in the same rows; `rebuild` does it for every order.
 */
import { systemScope } from '../../core/db/tenant-plugin.js';
import { BookingSummaryRecord } from './models/booking-summary.model.js';

const SCOPE = systemScope('reporting: booking summaries', { routine: true });

/**
 * @typedef {{ bookingRef: string, orderRef: string, orderId: string, productType: string, channel: string,
 *   customerId: string | null, guestKey: string | null, clientOrgId: string | null, createdBy: string | null,
 *   hotelOrgId: string | null, propertyId: string | null, propertyName: string | null, destination: string | null,
 *   leadGuest: string | null, checkIn: string | null, checkOut: string | null, bookingStatus: string, orderStatus: string,
 *   paymentState: 'UNPAID' | 'PAID' | 'PARTLY_REFUNDED' | 'REFUNDED', totalPaise: number, refundedPaise: number, orderCreatedAt: Date }} SummaryRow
 * @typedef {{ clock: import('../../core/clock.js').Clock, rowsOf: (orderId: string) => Promise<SummaryRow[]>,
 *   orderIds: (afterId: string | null, limit: number) => Promise<string[]> }} SummaryDeps
 */

/** @param {SummaryDeps} deps @param {string} orderId */
async function project(deps, orderId) {
  const rows = await deps.rowsOf(orderId);
  const at = deps.clock.now();
  for (const r of rows)
    await BookingSummaryRecord.updateOne({ bookingRef: r.bookingRef }, { $set: { ...r, projectedAt: at } }, { upsert: true }).setOptions(
      SCOPE,
    );
  await BookingSummaryRecord.deleteMany({ orderId, bookingRef: { $nin: rows.map((r) => r.bookingRef) } }).setOptions(SCOPE);
  return rows.length;
}

/** @param {SummaryDeps} deps */
export function createBookingSummaries(deps) {
  return {
    /** @param {string} orderId */
    project: (orderId) => project(deps, orderId),
    /** Every order again (repeat-safe; in batches of 200). */
    async rebuild() {
      let after = null;
      let orders = 0;
      for (;;) {
        const ids = await deps.orderIds(after, 200);
        for (const id of ids) await project(deps, id);
        orders += ids.length;
        if (ids.length < 200) return { orders };
        after = ids[ids.length - 1] ?? null;
      }
    },
    /** @param {{ customerId?: string | null, guestKey?: string | null }} who @param {{ limit?: number }} [opts] */
    async forBuyer(who, opts = {}) {
      const filter = who.customerId ? { customerId: who.customerId } : who.guestKey ? { guestKey: who.guestKey } : null;
      if (!filter) return [];
      return BookingSummaryRecord.find(filter, { _id: 0, projectedAt: 0 })
        .sort({ orderCreatedAt: -1 })
        .limit(opts.limit ?? 100)
        .lean();
    },
  };
}
