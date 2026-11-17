// @ts-check
/** PUBLIC interface of the hotel-inventory module — other modules import only from here. */
export { EVENTS } from './events.js';
export { PERMISSION_CATALOGUE, PERMISSIONS } from './permissions.js';
export { PENALTY_TYPES, MAX_RULES, normalisePolicy, summarise, penaltyAt, penaltyText } from './domain/cancellation.js';
export { CANCELLATION_POLICIES_COLLECTION, CancellationPolicyRecord } from './models/cancellation-policy.model.js';
export { createCancellationPolicyService } from './cancellation-policy.service.js';
export { PRICING_MODELS, ADJUST_TYPES, RATE_PLAN_STATUSES, checkRatePlan, derivedPrice } from './domain/rate-plan.js';
export { RATE_PLANS_COLLECTION, RatePlanRecord } from './models/rate-plan.model.js';
export { createRatePlanService } from './rate-plan.service.js';
