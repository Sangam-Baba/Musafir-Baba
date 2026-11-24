// @ts-check
/** Event types (module.entity.pastVerb) this module emits. Payloads: ids + essentials only (always `orgId`). */
export const EVENTS = /** @type {const} */ ({
  /** a client used 80 % / 100 % of its monthly queries — `{ orgId, percent, used, limit }` */
  quotaReached: 'subscriptions.quota.reached',
});
