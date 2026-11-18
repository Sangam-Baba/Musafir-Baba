// @ts-check
/** PUBLIC interface of the pricing module — other modules import only from here. */
export { EVENTS } from './events.js';
export { PERMISSION_CATALOGUE, PERMISSIONS } from './permissions.js';
export {
  TAX_KINDS,
  ACCOMMODATION_SAC,
  MAX_RATE_BPS,
  SEED_TAX_RULES,
  taxRuleProblems,
  overlappingRules,
  findTaxRule,
  issuerFor,
  splitGst,
  gstForNight,
} from './domain/tax.js';
export { TAX_RULES_COLLECTION, TAX_RULE_STATUSES, TaxRuleRecord } from './models/tax-rule.model.js';
export { seedTaxRules, createTaxRulesService } from './tax-rules.service.js';
export {
  CHANNELS,
  ADJUSTMENTS,
  MAX_FIXED_PAISE,
  MAX_PERCENT_BPS,
  DEFAULT_RULES,
  marginRuleProblems,
  specificity,
  ruleMatches,
  compareRules,
  marginAmount,
  nightMargin,
  bookingFee,
} from './domain/margin.js';
export { MARGIN_RULES_COLLECTION, MARGIN_RULE_STATUSES, MarginRuleRecord } from './models/margin-rule.model.js';
export { seedDefaultMarginRules, createMarginRulesService, toMarginRule } from './margin-rules.service.js';
