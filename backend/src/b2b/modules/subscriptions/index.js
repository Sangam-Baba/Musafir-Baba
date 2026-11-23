// @ts-check
/** Public interface of the subscriptions module (plans, subscriptions, overrides) — other modules import only from here. */
export { EVENTS } from './events.js';
export { PERMISSION_CATALOGUE, PERMISSIONS } from './permissions.js';
export {
  LIMIT_BEHAVIOURS,
  DEFAULT_PLANS,
  DEFAULT_PLAN_KEY,
  DEFAULT_WEIGHTS,
  GST_RATE_BPS,
  SAAS_SAC,
  checkPlanTerms,
  checkWeights,
} from './domain/plans.js';
export { monthOf, monthStart, nextMonth, daysIn, daysLeft, prorate } from './domain/periods.js';
export { PLAN_VERSIONS_COLLECTION, PLAN_VERSION_STATUSES, PlanVersionRecord } from './models/plan-version.model.js';
export { SUB_SETTINGS_COLLECTION, SubSettingsRecord } from './models/settings.model.js';
export { SUBSCRIPTIONS_COLLECTION, SUBSCRIPTION_STATUSES, SubscriptionRecord } from './models/subscription.model.js';
export { OVERRIDES_COLLECTION, OverrideRecord } from './models/override.model.js';
export { createPlans, planDto, publishedPlan, planVersion, queryWeights, seedPlans } from './plans.service.js';
export { createSubscriptions, effectiveTerms, subscriptionOf, SUBS } from './subscriptions.service.js';
export { createOverrides, overrideDto } from './overrides.service.js';
export { ALERT_PERCENTS, weightedUsed, quotaState, alertsDue } from './domain/quota.js';
export { quotaOf, quotaOfSubscription, sendQuotaAlerts } from './quota.service.js';
