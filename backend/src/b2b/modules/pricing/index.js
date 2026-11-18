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
export { RULE_ACTIONS, CHECKER_ACTIONS, ruleTransition, assertSecondPerson, inForce, isLargeChange } from './domain/rule-lifecycle.js';
export { createRuleAdminService, ruleDto } from './rule-admin.service.js';
export { BREAKDOWN_VERSION, PRICING_MODELS, buildBreakdown, priceView } from './domain/quote.js';
export { SETTINGS_COLLECTION, SETTINGS_ID, DEFAULT_SETTINGS, PricingSettingsRecord } from './models/settings.model.js';
export {
  PRICING_CACHE_PREFIX,
  PRICING_CACHE_MS,
  seedPricingSettings,
  readSettings,
  createQuoteService,
  createPricingCacheSignals,
} from './quote.service.js';
export { TOKEN_MINUTES, canonical, breakdownHash, signToken, verifyToken, assertSameStay } from './domain/price-token.js';
export { SIGNING_KEYS_COLLECTION, KEY_STATUSES, SigningKeyRecord } from './models/signing-key.model.js';
export { createPriceTokenService, VERIFY_GRACE_MINUTES } from './price-token.service.js';
