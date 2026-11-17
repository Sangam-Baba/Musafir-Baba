// @ts-check
/** PUBLIC interface of the hotel-inventory module — other modules import only from here. */
export { EVENTS } from './events.js';
export { PERMISSION_CATALOGUE, PERMISSIONS } from './permissions.js';
export { PENALTY_TYPES, MAX_RULES, normalisePolicy, summarise, penaltyAt, penaltyText } from './domain/cancellation.js';
export { CANCELLATION_POLICIES_COLLECTION, CancellationPolicyRecord } from './models/cancellation-policy.model.js';
export { createCancellationPolicyService } from './cancellation-policy.service.js';
