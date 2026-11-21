// @ts-check
/**
 * Cancelling an order's booking (plan Stage 09 §3.4). The quote's charge and refund were checked by the caller.
 *   item `cancelStart` (CONFIRMED → CANCELLING, one wins) → `finish`:
 *   rooms back → one ledger entry (the item's reversal + the refund back to the buyer's side, unique by booking) →
 *   refund to the source (PayU, key `cancel:<booking id>` — repeat-safe) → item `cancelDone` (CANCELLED) →
 *   the order CANCELLED when all its items are (+ `orders.order.cancelled`).
 * Every step is repeat-safe; the reconciler runs `finish` again for a booking stuck in CANCELLING.
 */
import { systemContext } from '../../core/context.js';
import { newEvent } from '../../core/db/events.js';
import { transition } from '../../core/db/transition.js';
import { NotFoundError } from '../../core/errors.js';
import { EVENTS } from './events.js';
import { OrderRecord } from './models/order.model.js';
import { ORDERS, orderInfo, pushHistory } from './orders.service.js';

/** @typedef {import('./payment.service.js').PayDeps} PayDeps */

/** @param {PayDeps} deps @param {string} why */
const sys = (deps, why) => systemContext(`orders: ${why}`, `cancel-${deps.clock.now().getTime()}`, deps.logger, deps.clock);

/**
 * @param {PayDeps} deps
 * @param {Record<string, any>} order
 * @param {import('./registry.js').OrderItem} item
 */
async function finish(deps, order, item) {
  const ctx = sys(deps, 'finish a cancellation');
  const handler = deps.handlers.get(item.type);
  const mode = deps.modes.get(order.paymentMode);
  await handler.cancelRooms(ctx, item);
  const { refundPaise, lines } = await handler.cancelLedgerLines(item);
  if (refundPaise > 0) {
    const buyerSide = await mode.debitAccount(order);
    await deps.ledger.post(
      {
        reference: { type: 'cancellation', id: item.bookingId },
        purpose: 'booking-cancelled',
        lines: [...lines, { accountId: buyerSide, creditPaise: refundPaise }],
        memo: `${order.ref} ${item.bookingRef}`,
      },
      'system:orders',
    );
    if (order.payment?.verifiedIntentId)
      await mode.refund(ctx, order, {
        intentId: order.payment.verifiedIntentId,
        key: `cancel:${item.bookingId}`,
        reason: `Cancelled ${item.bookingRef}`,
        amountPaise: refundPaise,
      });
  }
  await handler.cancelDone(ctx, item);
  await cancelOrderIfDone(deps, order);
}

/** @param {PayDeps} deps @param {Record<string, any>} order */
async function cancelOrderIfDone(deps, order) {
  for (const it of order.items) if ((await deps.handlers.get(it.type).view(it, 'BUYER')).status !== 'CANCELLED') return;
  const event = newEvent(
    EVENTS.orderCancelled,
    { orgId: order.hotelOrgIds?.[0] ?? 'platform', orderId: String(order._id), ref: order.ref },
    deps,
  );
  const moved = await transition(OrderRecord, {
    id: order._id,
    from: 'CONFIRMED',
    to: 'CANCELLED',
    events: [event],
    clock: deps.clock,
    options: ORDERS,
  });
  if (moved) await pushHistory(deps, order._id, { status: 'CANCELLED', by: 'system:orders' });
}

/** @param {PayDeps} deps */
export function createOrderCancellations(deps) {
  return {
    /**
     * @param {{ order: Record<string, any>, bookingRef: string, chargePaise: number, refundPaise: number, by: string, reason?: string | null }} a
     */
    async cancel(a) {
      const item = a.order.items.find((/** @type {any} */ i) => i.bookingRef === a.bookingRef);
      if (!item) throw new NotFoundError('BOOKING_NOT_FOUND');
      await deps.handlers.get(item.type).cancelStart(sys(deps, 'start a cancellation'), item, {
        chargePaise: a.chargePaise,
        refundPaise: a.refundPaise,
        by: a.by,
        reason: a.reason ?? null,
      });
      await pushHistory(deps, a.order._id, { status: a.order.status, by: a.by, note: `cancelling ${a.bookingRef}` });
      await finish(deps, a.order, item);
      return /** @type {Record<string, any>} */ (await OrderRecord.findOne({ _id: a.order._id }).setOptions(ORDERS).lean());
    },
    /** For the reconciler: a booking stuck in CANCELLING. @param {string} orderId @param {string} bookingId */
    async finishBooking(orderId, bookingId) {
      const order = /** @type {any} */ (await OrderRecord.findOne({ _id: orderId }).setOptions(ORDERS).lean());
      const item = order?.items.find((/** @type {any} */ i) => i.bookingId === bookingId);
      if (order && item) await finish(deps, order, item);
    },
    orderInfo,
  };
}
