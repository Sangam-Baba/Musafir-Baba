// @ts-check
/**
 * Rate plans (plan Stage 04 §3.1): which room types a plan sells, its meal plan and cancellation policy, how
 * it is priced (per room, or per number of guests), how far ahead it can be booked, and — for a derived plan —
 * the plan it follows ("CP = EP + ₹500"). Pure: the checks and the derived price. Amounts in paise.
 */
import { DomainError } from '../../../core/errors.js';

export const PRICING_MODELS = /** @type {const} */ (['PER_ROOM', 'PER_OCCUPANCY']);
export const ADJUST_TYPES = /** @type {const} */ (['AMOUNT', 'PERCENT']);
export const RATE_PLAN_STATUSES = /** @type {const} */ (['ACTIVE', 'INACTIVE', 'ARCHIVED']);
export const MAX_RATE_PLANS_PER_PROPERTY = 30;

/** @typedef {{ type: 'AMOUNT' | 'PERCENT', value: number }} Adjust */
/**
 * @typedef {{ name: string, roomTypeIds: string[], mealPlanKey: string, cancellationPolicyId: string,
 *   pricingModel: 'PER_ROOM' | 'PER_OCCUPANCY', minAdvanceDays: number, maxAdvanceDays: number,
 *   derived: { parentRatePlanId: string, adjust: Adjust } | null }} RatePlanInput
 */
/** @typedef {{ id: string, status: string, pricingModel: string, roomTypeIds: string[], derived: unknown }} ParentPlan */
/**
 * @typedef {{ roomTypeIds: string[], mealPlanKeys: string[], policyIds: string[], parent: ParentPlan | null,
 *   selfId: string | null, childRoomTypeIds: string[] | null, childPricingModel: string | null }} RatePlanFacts
 *   `childRoomTypeIds` / `childPricingModel`: what the plans derived from this one need (null when none)
 */

/** @param {Adjust} a */
const adjustOk = (a) =>
  Number.isInteger(a.value) && a.value !== 0 && (a.type === 'PERCENT' ? a.value >= -90 && a.value <= 500 : Math.abs(a.value) <= 10_000_000);

/** @param {RatePlanInput} input @param {RatePlanFacts} facts @param {{ path: string, code: string }[]} errors */
function checkDerived(input, facts, errors) {
  if (!input.derived) return;
  const parent = facts.parent;
  if (!adjustOk(input.derived.adjust)) errors.push({ path: 'derived.adjust', code: 'ADJUST_OUT_OF_RANGE' });
  if (facts.selfId && input.derived.parentRatePlanId === facts.selfId)
    errors.push({ path: 'derived.parentRatePlanId', code: 'PARENT_IS_SELF' });
  else if (!parent || parent.status === 'ARCHIVED') errors.push({ path: 'derived.parentRatePlanId', code: 'PARENT_UNKNOWN' });
  else {
    if (parent.derived) errors.push({ path: 'derived.parentRatePlanId', code: 'PARENT_IS_DERIVED' });
    if (parent.pricingModel !== input.pricingModel) errors.push({ path: 'pricingModel', code: 'PARENT_PRICING_MODEL_DIFFERS' });
    if (input.roomTypeIds.some((id) => !parent.roomTypeIds.includes(id)))
      errors.push({ path: 'roomTypeIds', code: 'ROOM_TYPE_NOT_IN_PARENT' });
  }
  if (facts.childRoomTypeIds) errors.push({ path: 'derived', code: 'PLANS_DERIVED_FROM_IT' }); // one level only
}

/**
 * Checks a rate plan against the property's room types, meal plans, policies and related plans (all problems at once).
 * @param {RatePlanInput} input @param {RatePlanFacts} facts
 * @returns {RatePlanInput}
 */
export function checkRatePlan(input, facts) {
  /** @type {{ path: string, code: string }[]} */
  const errors = [];
  const roomTypeIds = [...new Set(input.roomTypeIds)];
  if (roomTypeIds.length === 0) errors.push({ path: 'roomTypeIds', code: 'ROOM_TYPE_REQUIRED' });
  if (roomTypeIds.some((id) => !facts.roomTypeIds.includes(id))) errors.push({ path: 'roomTypeIds', code: 'ROOM_TYPE_UNKNOWN' });
  if (!facts.mealPlanKeys.includes(input.mealPlanKey)) errors.push({ path: 'mealPlanKey', code: 'MEAL_PLAN_UNKNOWN' });
  if (!facts.policyIds.includes(input.cancellationPolicyId)) errors.push({ path: 'cancellationPolicyId', code: 'POLICY_UNKNOWN' });
  if (input.minAdvanceDays > input.maxAdvanceDays) errors.push({ path: 'minAdvanceDays', code: 'ADVANCE_DAYS_ORDER' });
  checkDerived({ ...input, roomTypeIds }, facts, errors);
  // plans derived from this one keep working: same pricing model, their room types still sold here
  if (facts.childPricingModel && facts.childPricingModel !== input.pricingModel)
    errors.push({ path: 'pricingModel', code: 'DERIVED_PLANS_NEED_PRICING_MODEL' });
  if (facts.childRoomTypeIds?.some((id) => !roomTypeIds.includes(id)))
    errors.push({ path: 'roomTypeIds', code: 'DERIVED_PLANS_NEED_ROOM_TYPE' });
  if (errors.length > 0) throw new DomainError('RATE_PLAN_INVALID', { errors });
  return { ...input, name: input.name.trim(), roomTypeIds };
}

/**
 * A derived plan's price from its parent's (never below ₹1; null when the parent has no price).
 * @param {number | null | undefined} parentPaise @param {Adjust} adjust
 * @returns {number | null}
 */
export function derivedPrice(parentPaise, adjust) {
  if (parentPaise === null || parentPaise === undefined) return null;
  const raw = adjust.type === 'AMOUNT' ? parentPaise + adjust.value : Math.round((parentPaise * (100 + adjust.value)) / 100);
  return Math.max(100, raw);
}
