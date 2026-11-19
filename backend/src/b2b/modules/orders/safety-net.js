// @ts-check
/**
 * The orders safety net (plan Stage 08 §3.3, §3.6; `05-…` §5.4) — reconciler rules for the short middle steps:
 * - `HOLDING` for more than a minute (the process stopped between creating the order and holding the rooms)
 *   → the rooms of the order given back, the order FAILED ("please try again"). Never forward: nothing was paid.
 * The `CONFIRMING` rule (forward — money was taken) comes with the payment path (S08-T04).
 */
import { systemContext } from '../../core/context.js';
import { failOrder, orderInfo } from './orders.service.js';
import { OrderRecord } from './models/order.model.js';

export const HOLDING_STUCK_MS = 60_000;

/** @param {import('./orders.service.js').OrdersDeps} deps @returns {import('../../core/jobs/reconciler.js').ReconcileRule[]} */
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
  ];
}
