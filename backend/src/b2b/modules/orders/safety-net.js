// @ts-check
/**
 * The orders safety net (plan Stage 08 §3.3, §3.6; `05-…` §5.4) — reconciler rules for the short middle steps:
 * - `HOLDING` for more than a minute (the process stopped between creating the order and holding the rooms)
 *   → the rooms of the order given back, the order FAILED ("please try again"). Never forward: nothing was paid.
 * - `CONFIRMING` for more than 30 seconds (payment verified, stopped while booking the rooms) → finished FORWARD:
 *   rooms booked (held again once if needed) → ledger entry → CONFIRMED, or rooms lost → FAILED + refund.
 * Event consumers: PayU's answers about order payments (succeeded / paid late / pending / failed).
 */
import { systemContext } from '../../core/context.js';
import { failOrder, orderInfo } from './orders.service.js';
import { confirmForward, createOrderPayments } from './payment.service.js';
import { OrderRecord } from './models/order.model.js';

export const HOLDING_STUCK_MS = 60_000;
export const CONFIRMING_STUCK_MS = 30_000;

/** @param {import('./payment.service.js').PayDeps} deps @returns {import('../../core/jobs/reconciler.js').ReconcileRule[]} */
export function orderReconcileRules(deps) {
  return [
    {
      name: 'orders-holding',
      model: OrderRecord,
      stuckStatus: 'HOLDING',
      olderThanMs: HOLDING_STUCK_MS,
      resume: async (o) => {
        const ctx = systemContext('orders: give back an unfinished checkout', `reconcile-${String(o._id)}`, deps.logger, deps.clock);
        for (const type of deps.handlers.keys()) await deps.handlers.get(type).abandon(ctx, orderInfo(o));
        await failOrder(deps, o, 'HOLDING', { code: 'ABANDONED' });
      },
    },
    {
      name: 'orders-confirming',
      model: OrderRecord,
      stuckStatus: 'CONFIRMING',
      olderThanMs: CONFIRMING_STUCK_MS,
      resume: async (o) => {
        await confirmForward(deps, o);
      },
    },
  ];
}

/**
 * Event consumers: PayU's answers about ORDER payments (other purposes are ignored).
 * @param {import('./payment.service.js').PayDeps} deps
 * @param {{ intentSucceeded: string, intentPaidLate: string, intentPending: string, intentFailed: string }} PAY payments' event names
 */
export function orderConsumers(deps, PAY) {
  const pay = createOrderPayments(deps);
  /** @param {(p: any) => Promise<unknown>} fn */
  const forOrders = (fn) => async (/** @type {{ payload: any }} */ event) => {
    if (event.payload?.purpose === 'ORDER' && event.payload?.reference?.type === 'order') await fn(event.payload);
  };
  return [
    { consumer: 'orders-payment-confirmed', types: [PAY.intentSucceeded, PAY.intentPaidLate], handler: forOrders(pay.confirmed) },
    { consumer: 'orders-payment-pending', types: [PAY.intentPending], handler: forOrders(pay.pending) },
    { consumer: 'orders-payment-failed', types: [PAY.intentFailed], handler: forOrders(pay.failed) },
  ];
}
