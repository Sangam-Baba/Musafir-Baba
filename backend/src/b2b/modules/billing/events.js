// @ts-check
/** Event types (module.entity.pastVerb) this module emits. Payloads: ids + essentials only (always `orgId`). */
export const EVENTS = /** @type {const} */ ({
  /** an invoice is still unpaid — reminder day 0 / 3 / 7 — `{ orgId, step, amountPaise }` */
  dunningReminded: 'billing.dunning.reminded',
  /** day 10 unpaid: search and booking switched off until paid — `{ orgId, amountPaise }` */
  subscriptionSuspended: 'billing.subscription.suspended',
});
