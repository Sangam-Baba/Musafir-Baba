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
 *   customerId: string | null, guestKey: string | null, clientOrgId: string | null, branchId?: string | null, createdBy: string | null,
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

/**
 * @typedef {{ q?: string, status?: string, payment?: string, branchId?: string, createdBy?: string, destination?: string,
 *   checkInFrom?: string, checkInTo?: string, checkOutFrom?: string, checkOutTo?: string, bookedFrom?: Date, bookedTo?: Date,
 *   before?: Date }} ClientFilter
 */

/** @param {string} t */
const escapeRx = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** @param {string | undefined} from @param {string | undefined} to */
const between = (from, to) => (from || to ? { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) } : undefined);

/** Who may see what. @param {{ clientOrgId: string, branchIds: readonly string[], ownUser: string | null }} who @param {ClientFilter} f */
function scopeOf(who, f) {
  /** @type {Record<string, unknown>} */
  const q = { clientOrgId: who.clientOrgId };
  if (who.branchIds.length > 0) q.branchId = { $in: [...who.branchIds] };
  if (f.branchId) q.branchId = who.branchIds.length > 0 && !who.branchIds.includes(f.branchId) ? '__none__' : f.branchId;
  if (who.ownUser) q.createdBy = who.ownUser;
  else if (f.createdBy) q.createdBy = f.createdBy;
  return q;
}

/** Dates (stay as `YYYY-MM-DD`, booked as instants). @param {ClientFilter} f */
function datesOf(f) {
  /** @type {Record<string, unknown>} */
  const q = {};
  const ci = between(f.checkInFrom, f.checkInTo);
  if (ci) q.checkIn = ci;
  const co = between(f.checkOutFrom, f.checkOutTo);
  if (co) q.checkOut = co;
  if (f.bookedFrom || f.bookedTo || f.before)
    q.orderCreatedAt = {
      ...(f.bookedFrom ? { $gte: f.bookedFrom } : {}),
      ...(f.bookedTo ? { $lt: f.bookedTo } : {}),
      ...(f.before ? { $lt: f.before } : {}),
    };
  return q;
}

/**
 * @param {{ clientOrgId: string, branchIds: readonly string[], ownUser: string | null }} who
 * @param {ClientFilter} f
 */
export function clientFilter(who, f) {
  const q = { ...scopeOf(who, f), ...datesOf(f) };
  if (f.status) q.bookingStatus = f.status;
  if (f.payment) q.paymentState = f.payment;
  if (f.destination) q.destination = new RegExp(`^${escapeRx(f.destination)}`, 'i');
  if (f.q) {
    const t = f.q.trim();
    q.$or = [{ bookingRef: t.toUpperCase() }, { orderRef: t.toUpperCase() }, { leadGuest: new RegExp(escapeRx(t), 'i') }];
  }
  return q;
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
    /**
     * A B2B client's bookings (plan Stage 12 §3.7): the company's rows, limited to the viewer's branches / own bookings,
     * filtered, newest first; `before` pages back.
     * @param {{ clientOrgId: string, branchIds: readonly string[], ownUser: string | null }} who
     * @param {ClientFilter} f
     * @param {{ limit?: number }} [opts]
     */
    async forClient(who, f, opts = {}) {
      return BookingSummaryRecord.find(clientFilter(who, f), { _id: 0, projectedAt: 0, customerId: 0, guestKey: 0 })
        .setOptions(SCOPE)
        .sort({ orderCreatedAt: -1 })
        .limit(Math.min(opts.limit ?? 50, 5000))
        .lean();
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
