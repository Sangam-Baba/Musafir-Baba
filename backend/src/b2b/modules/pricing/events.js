// @ts-check
/** Event types (module.entity.pastVerb) this module emits. Payloads: ids + essentials only (always `orgId`). */
export const EVENTS = /** @type {const} */ ({
  /** a margin rule was approved and now takes part in prices — search caches refresh */
  ruleActivated: 'pricing.rule.activated',
  /** a margin rule stopped taking part in prices — search caches refresh */
  ruleRetired: 'pricing.rule.retired',
  /** a GST rate was approved (dated) — search caches refresh */
  taxRuleActivated: 'pricing.tax-rule.activated',
});
