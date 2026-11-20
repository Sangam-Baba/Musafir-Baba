// @ts-check
/**
 * What a guest sees about a rate plan (Stage 06 search / offers): its name, meal plan, whether it can be refunded and
 * the cancellation sentence. Internal, read-only, across hotels (logged routine system scope). No prices here.
 */
import { systemScope } from '../../core/db/tenant-plugin.js';
import { CancellationPolicyRecord } from './models/cancellation-policy.model.js';
import { RatePlanRecord } from './models/rate-plan.model.js';

const SCOPE = systemScope('hotel-inventory: rate plan terms for search', { routine: true });

/** @typedef {{ name: string, mealPlanKey: string, refundable: boolean, cancellation: string }} PlanTerms */

/**
 * The full cancellation terms of a rate plan, as a booking keeps them (Stage 08 snapshot; Stage 09 works out
 * penalties from this copy, never from today's policy). Null when the plan isn't found.
 * @param {string} ratePlanId
 */
async function policyOfPlan(ratePlanId) {
  if (!/^[a-f0-9]{24}$/.test(ratePlanId)) return null;
  const plan = await RatePlanRecord.findOne({ _id: ratePlanId }, { name: 1, mealPlanKey: 1, cancellationPolicyId: 1 })
    .maxTimeMS(2000)
    .setOptions(SCOPE)
    .lean();
  if (!plan) return null;
  const policy = await CancellationPolicyRecord.findOne(
    { _id: plan.cancellationPolicyId },
    { nonRefundable: 1, rules: 1, noShow: 1, summary: 1, version: 1 },
  )
    .maxTimeMS(2000)
    .setOptions(SCOPE)
    .lean();
  return {
    ratePlanName: plan.name,
    mealPlanKey: plan.mealPlanKey,
    policyId: policy ? String(policy._id) : null,
    policyVersion: policy?.version ?? null,
    nonRefundable: policy ? policy.nonRefundable : true,
    rules: (policy?.rules ?? []).map((r) => ({
      hoursBefore: r.hoursBefore,
      penalty: { type: r.penalty?.type ?? null, value: r.penalty?.value ?? null },
    })),
    noShow: policy?.noShow ? { type: policy.noShow.type, value: policy.noShow.value } : null,
    summary: policy?.summary ?? 'Non-refundable',
  };
}

/** Rate plan terms for search and offers. */
export function createPlanTermsService() {
  return {
    /** The full cancellation terms a booking keeps (see `policyOfPlan`). @param {string} ratePlanId */
    policyOf: (ratePlanId) => policyOfPlan(ratePlanId),

    /** @param {string[]} ratePlanIds @returns {Promise<Map<string, PlanTerms>>} */
    async termsOf(ratePlanIds) {
      const ids = [...new Set(ratePlanIds)].filter((id) => /^[a-f0-9]{24}$/.test(id));
      if (ids.length === 0) return new Map();
      const plans = await RatePlanRecord.find({ _id: { $in: ids } }, { name: 1, mealPlanKey: 1, cancellationPolicyId: 1 })
        .maxTimeMS(2000)
        .setOptions(SCOPE)
        .lean();
      const policies = await CancellationPolicyRecord.find(
        { _id: { $in: [...new Set(plans.map((p) => p.cancellationPolicyId))] } },
        { nonRefundable: 1, summary: 1 },
      )
        .maxTimeMS(2000)
        .setOptions(SCOPE)
        .lean();
      const byId = new Map(policies.map((p) => [String(p._id), p]));
      return new Map(
        plans.map((p) => {
          const policy = byId.get(p.cancellationPolicyId);
          return [
            String(p._id),
            {
              name: p.name,
              mealPlanKey: p.mealPlanKey,
              refundable: policy ? !policy.nonRefundable : false,
              cancellation: policy?.summary ?? '',
            },
          ];
        }),
      );
    },
  };
}
