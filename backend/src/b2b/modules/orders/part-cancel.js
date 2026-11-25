// @ts-check
/**
 * Cancelling part of a booking (Stage 18 B7, ADR-0019) — for items whose handler has the optional `part*` steps (bus
 * seats; hotels keep the whole-booking cancel in cancel.service.js, unchanged). One cancellation = one part with its
 * own id, so a booking can be cancelled a few seats at a time:
 *   item `partStart` (the part recorded, one wins) → `finishPart`: seats back → one ledger entry (the part's reversal +
 *   the refund to the buyer's side, reference `part-cancel/<part id>`) → refund to the source (key `part:<part id>`) →
 *   item `partDone` → the order CANCELLED when every item is.
 * Every step is repeat-safe; the reconciler runs `finishPart` again for a part left PENDING.
 */
import { systemContext } from '../../core/context.js';
import { ConflictError, DomainError, NotFoundError } from '../../core/errors.js';
import { cancelOrderIfDone } from './cancel.service.js';
import { OrderRecord } from './models/order.model.js';
import { ORDERS, pushHistory } from './orders.service.js';

/** @typedef {import('./payment.service.js').PayDeps} PayDeps */

/** @param {PayDeps} deps @param {string} why */
const sys = (deps, why) => systemContext(`orders: ${why}`, `part-${deps.clock.now().getTime()}`, deps.logger, deps.clock);

/** @param {PayDeps} deps @param {string} type */
function partHandler(deps, type) {
  const h = /** @type {any} */ (deps.handlers.get(type));
  if (typeof h.partStart !== 'function') throw new DomainError('PART_CANCEL_NOT_SUPPORTED', { type });
  return h;
}

/**
 * @param {PayDeps} deps @param {Record<string, any>} order @param {import('./registry.js').OrderItem} item @param {string} partId
 */
export async function finishPart(deps, order, item, partId) {
  const ctx = sys(deps, 'finish a partial cancellation');
  const h = partHandler(deps, item.type);
  const mode = deps.modes.get(order.paymentMode);
  await h.partRelease(ctx, item, partId);
  const { refundPaise, lines } = await h.partLedgerLines(item, partId);
  if (refundPaise > 0) {
    await deps.ledger.post(
      {
        reference: { type: 'part-cancel', id: partId },
        purpose: 'booking-part-cancelled',
        lines: [...lines, { accountId: await mode.debitAccount(order), creditPaise: refundPaise }],
        memo: `${order.ref} ${item.bookingRef}`,
      },
      'system:orders',
    );
    if (order.payment?.verifiedIntentId)
      await mode.refund(ctx, order, {
        intentId: order.payment.verifiedIntentId,
        key: `part:${partId}`,
        reason: `Cancelled seats of ${item.bookingRef}`,
        amountPaise: refundPaise,
      });
  }
  await h.partDone(ctx, item, partId);
  await cancelOrderIfDone(deps, order);
}

/** @param {PayDeps} deps */
export function createPartCancellations(deps) {
  return {
    /**
     * @param {{ order: Record<string, any>, bookingRef: string, part: Record<string, any> }} a
     */
    async cancelPart(a) {
      // always the stored order (its payment decides where the refund goes) — never a copy the caller held
      const order = /** @type {Record<string, any> | null} */ (await OrderRecord.findOne({ _id: a.order._id }).setOptions(ORDERS).lean());
      const item = order?.items.find((/** @type {any} */ i) => i.bookingRef === a.bookingRef);
      if (!order || !item) throw new NotFoundError('BOOKING_NOT_FOUND');
      if (order.status !== 'CONFIRMED') throw new ConflictError('ORDER_NOT_CANCELLABLE', { orderStatus: order.status });
      await partHandler(deps, item.type).partStart(sys(deps, 'start a partial cancellation'), item, a.part);
      await pushHistory(deps, order._id, {
        status: order.status,
        by: a.part.by,
        note: `cancelling ${a.part.seats.join(', ')} of ${a.bookingRef}`,
      });
      await finishPart(deps, order, item, a.part.id);
      return /** @type {Record<string, any>} */ (await OrderRecord.findOne({ _id: order._id }).setOptions(ORDERS).lean());
    },
    /** For the reconciler: a part left PENDING. @param {string} orderId @param {string} bookingId @param {string} partId */
    async finishPart(orderId, bookingId, partId) {
      const order = /** @type {any} */ (await OrderRecord.findOne({ _id: orderId }).setOptions(ORDERS).lean());
      const item = order?.items.find((/** @type {any} */ i) => i.bookingId === bookingId);
      if (order && item) await finishPart(deps, order, item, partId);
    },
  };
}
