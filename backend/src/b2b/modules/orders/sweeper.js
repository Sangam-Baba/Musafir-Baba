// @ts-check
/**
 * The orders sweeper (plan Stage 08 §3.6, `05-…` §5.4, §6) — every 30 seconds, lease-locked, small batches:
 * - orders still waiting (`AWAITING_PAYMENT` / `PAYMENT_PENDING`) whose hold has ended → `EXPIRED`, rooms given back
 *   (`orders.order.expired`). A payment that still succeeds later goes the late path (rooms again, or refund);
 * - failed orders whose verified payment must go back (refund key recorded) but whose refund was never asked
 *   (the process stopped in between) → refund asked (repeat-safe by key).
 * Invariant checks (every 10 min, read-only, alert on findings):
 * - no gateway order `CONFIRMED` without a payment PayU verified;
 * - no order left in a middle step: waiting > 5 min past its hold, `CONFIRMING` > 5 min, `HOLDING` > 5 min;
 * - no successful PayU order payment older than 10 minutes that is neither its order's confirmed payment nor refunded.
 */
import { systemContext } from '../../core/context.js';
import { newEvent } from '../../core/db/events.js';
import { transition } from '../../core/db/transition.js';
import { IntentRecord, RefundRecord } from '../payments/index.js';
import { EVENTS } from './events.js';
import { OrderRecord } from './models/order.model.js';
import { ORDERS, orderInfo, pushHistory } from './orders.service.js';
import { refundOrder } from './payment.service.js';

export const ORDER_SWEEP_EVERY_MS = 30_000;
const BATCH = 100;
const MIN = 60_000;

/** @param {import('./payment.service.js').PayDeps} deps @param {Record<string, any>} o */
export async function expireOrder(deps, o) {
  const event = newEvent(EVENTS.orderExpired, { orgId: o.hotelOrgIds?.[0] ?? 'platform', orderId: String(o._id), ref: o.ref }, deps);
  const moved = await transition(OrderRecord, {
    id: o._id,
    from: ['AWAITING_PAYMENT', 'PAYMENT_PENDING'],
    to: 'EXPIRED',
    events: [event],
    clock: deps.clock,
    options: ORDERS,
  });
  if (!moved) return false;
  const ctx = systemContext('orders: expire an unpaid order', `sweep-${String(o._id)}`, deps.logger, deps.clock);
  for (const item of o.items) await deps.handlers.get(item.type).release(ctx, orderInfo(o), item, 'EXPIRED');
  await pushHistory(deps, o._id, { status: 'EXPIRED', by: 'system:sweeper', note: 'not paid before the rooms were released' });
  return true;
}

/** @param {import('./payment.service.js').PayDeps} deps */
export async function sweepOrders(deps) {
  const now = deps.clock.now();
  const due = await OrderRecord.find({ status: { $in: ['AWAITING_PAYMENT', 'PAYMENT_PENDING'] }, holdExpiresAt: { $lt: now } })
    .setOptions(ORDERS)
    .sort({ holdExpiresAt: 1 })
    .limit(BATCH)
    .lean();
  let expired = 0;
  for (const o of due) {
    const ok = await expireOrder(deps, o).catch((err) => (deps.logger.warn({ err, ref: o.ref }, 'orders: expiring failed'), false));
    if (ok) expired += 1;
  }
  const owed = await OrderRecord.find({
    status: 'FAILED',
    'payment.verified': true,
    'payment.refundKey': { $ne: null },
    'payment.refundRequested': { $ne: true },
    statusChangedAt: { $lt: new Date(now.getTime() - MIN) }, // our clock, not the database's
  })
    .setOptions(ORDERS)
    .limit(BATCH)
    .lean();
  const ctx = systemContext('orders: refund a failed order', 'sweep-refunds', deps.logger, deps.clock);
  for (const o of owed) {
    await refundOrder(deps, ctx, o).catch((err) => deps.logger.warn({ err, ref: o.ref }, 'orders: refund not asked yet'));
  }
  return { expired, refundsAsked: owed.length };
}

/** @param {{ clock: import('../../core/clock.js').Clock }} deps */
export function orderInvariants(deps) {
  const ago = (/** @type {number} */ minutes) => new Date(deps.clock.now().getTime() - minutes * MIN);
  return [
    {
      name: 'orders-confirmed-gateway-orders-are-verified',
      check: async () =>
        (
          await OrderRecord.find({ status: 'CONFIRMED', paymentMode: 'GATEWAY', 'payment.verified': { $ne: true } }, { ref: 1 })
            .setOptions(ORDERS)
            .limit(50)
            .lean()
        ).map((o) => ({ id: String(o._id), detail: `${o.ref} confirmed without a verified PayU payment` })),
    },
    {
      name: 'orders-no-middle-step-past-its-deadline',
      check: async () =>
        (
          await OrderRecord.find(
            {
              $or: [
                { status: { $in: ['AWAITING_PAYMENT', 'PAYMENT_PENDING'] }, holdExpiresAt: { $lt: ago(5) } },
                { status: { $in: ['HOLDING', 'CONFIRMING'] }, statusChangedAt: { $lt: ago(5) } },
              ],
            },
            { ref: 1, status: 1 },
          )
            .setOptions(ORDERS)
            .limit(50)
            .lean()
        ).map((o) => ({ id: String(o._id), detail: `${o.ref} still ${o.status}` })),
    },
    {
      name: 'orders-every-paid-order-confirmed-or-refunded',
      check: async () => paidButOpen(ago(10), ago(72 * 60)),
    },
  ];
}

/**
 * Order payments PayU confirmed (on time or late) between `from` and `to` whose order isn't confirmed and has no refund key.
 * @param {Date} to
 * @param {Date} from
 */
async function paidButOpen(to, from) {
  const paid = await IntentRecord.find(
    { purpose: 'ORDER', gatewayPaymentId: { $ne: null }, lastVerifiedAt: { $lt: to, $gte: from } },
    { txnId: 1, reference: 1 },
  )
    .limit(2000)
    .lean();
  const ids = paid.map((i) => i.reference?.id).filter((id) => /^[a-f0-9]{24}$/.test(id ?? ''));
  const orders = await OrderRecord.find({ _id: { $in: ids } }, { status: 1, payment: 1, ref: 1 })
    .setOptions(ORDERS)
    .lean();
  const byId = new Map(orders.map((o) => [String(o._id), o]));
  const refunded = new Set(
    (await RefundRecord.find({ intentId: { $in: paid.map((i) => String(i._id)) } }, { intentId: 1 }).lean()).map((r) => r.intentId),
  );
  const settled = (/** @type {any} */ i) => {
    if (refunded.has(String(i._id))) return true; // going back to the customer
    const o = byId.get(i.reference?.id ?? '');
    return Boolean(o && o.payment?.verifiedIntentId === String(i._id) && ['CONFIRMED', 'CANCELLED', 'COMPLETED'].includes(o.status));
  };
  return paid
    .filter((i) => !settled(i))
    .map((i) => ({ id: i.txnId, detail: `PayU payment ${i.txnId} is neither confirmed nor being refunded` }));
}
