// @ts-check
/**
 * The plan catalogue (plan Stage 13 §3.1 — maker–checker): `propose` a new version of a plan (DRAFT, one at a time) →
 * a **different** person `decide`s: published (the old version SUPERSEDED — subscriptions on it keep it until their
 * next renewal) or rejected. `retire` stops new subscriptions to a plan. `seedPlans` adds the placeholder plans once.
 * Query weights (what counts) live in `sub_settings`.
 */
import { ConflictError, DomainError, ForbiddenError, NotFoundError, ValidationError } from '../../core/errors.js';
import { checkPlanTerms, checkWeights, DEFAULT_PLANS, DEFAULT_WEIGHTS } from './domain/plans.js';
import { PlanVersionRecord } from './models/plan-version.model.js';
import { SubSettingsRecord } from './models/settings.model.js';

const WEIGHTS_ID = 'query-weights';

/** @param {Record<string, any>} v */
export const planDto = (v) => ({
  id: String(v._id),
  key: v.planKey,
  version: v.version,
  status: v.status,
  name: v.name,
  monthlyQueryLimit: v.monthlyQueryLimit,
  pricePaise: v.pricePaise,
  limitBehaviour: v.limitBehaviour,
  overagePricePerQueryPaise: v.overagePricePerQueryPaise,
  trialDays: v.trialDays,
  nextPlanKey: v.nextPlanKey,
  features: v.features,
  note: v.note ?? null,
  proposedBy: v.proposedBy,
  decidedBy: v.decidedBy ?? null,
});

/** The placeholder plans (published v1), only where a plan has no version yet. */
export async function seedPlans() {
  let added = 0;
  for (const { key, ...terms } of DEFAULT_PLANS) {
    const res = await PlanVersionRecord.updateOne(
      { planKey: key },
      {
        $setOnInsert: {
          planKey: key,
          version: 1,
          status: 'PUBLISHED',
          ...terms,
          proposedBy: 'seed',
          decidedBy: 'seed',
          decidedAt: new Date(0),
        },
      },
      { upsert: true },
    );
    added += res.upsertedCount ?? 0;
  }
  await SubSettingsRecord.updateOne(
    { _id: WEIGHTS_ID },
    { $setOnInsert: { weights: { ...DEFAULT_WEIGHTS }, updatedBy: 'seed' } },
    { upsert: true },
  );
  return added;
}

/** The published version of a plan (null if none / retired). @param {string} key */
export async function publishedPlan(key) {
  return /** @type {Record<string, any> | null} */ (await PlanVersionRecord.findOne({ planKey: key, status: 'PUBLISHED' }).lean());
}

/** @param {string} id */
export async function planVersion(id) {
  return /^[a-f0-9]{24}$/.test(id) ? /** @type {Record<string, any> | null} */ (await PlanVersionRecord.findById(id).lean()) : null;
}

/** @returns {Promise<Record<string, number>>} */
export async function queryWeights() {
  const s = await SubSettingsRecord.findById(WEIGHTS_ID).lean();
  return { ...DEFAULT_WEIGHTS, .../** @type {any} */ (s?.weights ?? {}) };
}

/**
 * A different person publishes or rejects a draft.
 * @param {{ clock: import('../../core/clock.js').Clock }} deps @param {string} by @param {string} id @param {{ approve: boolean }} d
 */
async function decide(deps, by, id, d) {
  const v = await planVersion(id);
  if (!v) throw new NotFoundError('PLAN_VERSION_NOT_FOUND');
  if (v.proposedBy === by) throw new ForbiddenError('SECOND_PERSON_REQUIRED');
  const now = deps.clock.now();
  // 1. claim the decision (a repeat by the same person after a stop goes on); 2. the old version superseded (only
  // one published version per plan); 3. this one published — or rejected.
  const claimed = await PlanVersionRecord.updateOne(
    { _id: v._id, status: 'DRAFT', $or: [{ decidedBy: null }, { decidedBy: by }] },
    { $set: { decidedBy: by, decidedAt: now } },
  );
  if (claimed.matchedCount !== 1) throw new ConflictError('PLAN_VERSION_NOT_DRAFT', { versionStatus: v.status });
  if (d.approve)
    await PlanVersionRecord.updateMany(
      { planKey: v.planKey, status: 'PUBLISHED', _id: { $ne: v._id } },
      { $set: { status: 'SUPERSEDED' } },
    );
  await PlanVersionRecord.updateOne({ _id: v._id, status: 'DRAFT' }, { $set: { status: d.approve ? 'PUBLISHED' : 'REJECTED' } });
  return planDto({ ...v, status: d.approve ? 'PUBLISHED' : 'REJECTED', decidedBy: by });
}

/** @param {{ clock: import('../../core/clock.js').Clock }} deps */
export function createPlans(deps) {
  return {
    /** Every plan's published version (what clients can pick). */
    published: async () => (await PlanVersionRecord.find({ status: 'PUBLISHED' }).sort({ pricePaise: 1 }).lean()).map(planDto),
    /** Admin: every version of every plan, newest first. */
    all: async () => (await PlanVersionRecord.find({}).sort({ planKey: 1, version: -1 }).limit(500).lean()).map(planDto),
    /**
     * @param {string} by
     * @param {string} key  an existing plan, or a new key (A–Z, 0–9, 1–20) for a new plan
     * @param {Omit<import('./domain/plans.js').PlanTerms, 'key'> & { note?: string | null }} t
     */
    async propose(by, key, t) {
      if (!/^[A-Z0-9_]{1,20}$/.test(key)) throw new DomainError('PLAN_KEY_INVALID');
      const problems = checkPlanTerms(t);
      if (problems.length > 0) throw new ValidationError({ problems });
      if (await PlanVersionRecord.exists({ planKey: key, status: 'DRAFT' })) throw new ConflictError('PLAN_DRAFT_EXISTS');
      const last = /** @type {any} */ (await PlanVersionRecord.findOne({ planKey: key }).sort({ version: -1 }).lean());
      const doc = await PlanVersionRecord.create({
        planKey: key,
        version: (last?.version ?? 0) + 1,
        status: 'DRAFT',
        name: t.name.trim(),
        monthlyQueryLimit: t.monthlyQueryLimit,
        pricePaise: t.pricePaise,
        limitBehaviour: t.limitBehaviour,
        overagePricePerQueryPaise: t.limitBehaviour === 'OVERAGE' ? t.overagePricePerQueryPaise : 0,
        trialDays: t.trialDays ?? 0,
        nextPlanKey: t.nextPlanKey ?? null,
        features: t.features,
        note: t.note ?? null,
        proposedBy: by,
      });
      return planDto(doc.toObject());
    },
    /** @param {string} by @param {string} id @param {{ approve: boolean }} d */
    decide: (by, id, d) => decide(deps, by, id, d),
    /** No new subscriptions to this plan (existing ones keep it until they change). @param {string} by @param {string} key */
    async retire(by, key) {
      const res = await PlanVersionRecord.updateOne(
        { planKey: key, status: 'PUBLISHED' },
        { $set: { status: 'RETIRED', decidedBy: by, decidedAt: deps.clock.now() } },
      );
      if (res.modifiedCount !== 1) throw new NotFoundError('PLAN_NOT_FOUND');
      return { key, status: 'RETIRED' };
    },
    weights: queryWeights,
    /** @param {string} by @param {Record<string, number>} weights */
    async setWeights(by, weights) {
      if (!checkWeights(weights)) throw new DomainError('WEIGHTS_INVALID');
      await SubSettingsRecord.updateOne({ _id: WEIGHTS_ID }, { $set: { weights, updatedBy: by } }, { upsert: true });
      return queryWeights();
    },
  };
}
