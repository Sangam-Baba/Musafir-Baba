// @ts-check
/** Event types (module.entity.pastVerb) this module emits. Payloads: ids + essentials only (always `orgId`). */
export const EVENTS = /** @type {const} */ ({
  /** a correcting entry was approved and posted */
  adjustmentPosted: 'wallet.adjustment.posted',
  /** a derived balance did not match its journal lines (invariant check) */
  invariantBroken: 'wallet.invariant.broken',
});
