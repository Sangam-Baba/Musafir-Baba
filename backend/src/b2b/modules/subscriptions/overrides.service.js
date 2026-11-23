// @ts-check
/**
 * Overrides and query top-ups (plan Stage 13 §3.2, §3.4) — maker–checker: `propose` → a **different** person
 * `decide`s → applied to the subscription once (OVERRIDE: `override` set with its expiry; TOPUP: extra queries this
 * period). Every step is conditional, so a repeated approval changes nothing.
 */
import { ConflictError, DomainError, ForbiddenError, NotFoundError } from '../../core/errors.js';
import { OverrideRecord } from './models/override.model.js';
import { SubscriptionRecord } from './models/subscription.model.js';
import { SUBS, subscriptionOf } from './subscriptions.service.js';

/** @param {Record<string, any>} o */
export const overrideDto = (o) => ({
  id: String(o._id),
  clientOrgId: o.clientOrgId,
  kind: o.kind,
  terms: o.terms,
  queries: o.queries,
  reason: o.reason,
  status: o.status,
  proposedBy: o.proposedBy,
  decidedBy: o.decidedBy ?? null,
  applied: o.applied,
  createdAt: o.createdAt,
});

/** @param {Record<string, any>} o @param {Date} now */
async function apply(o, now) {
  const sub = await subscriptionOf(o.clientOrgId);
  if (!sub) throw new NotFoundError('SUBSCRIPTION_NOT_FOUND');
  const update =
    o.kind === 'OVERRIDE' ? { $set: { override: { ...o.terms, approvedId: String(o._id) } } } : { $inc: { extraQueries: o.queries } };
  await SubscriptionRecord.updateOne(
    { _id: sub._id, 'override.approvedId': { $ne: String(o._id) }, 'history.what': { $ne: `override ${String(o._id)}` } },
    {
      ...update,
      $inc: { .../** @type {any} */ (update.$inc ?? {}), version: 1 },
      $push: { history: { at: now, what: `override ${String(o._id)}`, by: o.decidedBy } },
    },
  ).setOptions(SUBS);
  await OverrideRecord.updateOne({ _id: o._id }, { $set: { applied: true } }).setOptions(SUBS);
}

/** @param {{ clock: import('../../core/clock.js').Clock }} deps */
export function createOverrides(deps) {
  return {
    /**
     * @param {string} by
     * @param {{ clientOrgId: string, kind: 'OVERRIDE' | 'TOPUP', reason: string, queries?: number,
     *   terms?: { queryLimit?: number, pricePaise?: number, limitBehaviour?: string, overagePricePerQueryPaise?: number, expiresAt?: Date | null } }} a
     */
    async propose(by, a) {
      if (!(await subscriptionOf(a.clientOrgId))) throw new NotFoundError('SUBSCRIPTION_NOT_FOUND');
      if (a.kind === 'TOPUP' && !(Number.isSafeInteger(a.queries) && /** @type {number} */ (a.queries) > 0))
        throw new DomainError('QUERIES_INVALID');
      if (a.kind === 'OVERRIDE' && (!a.terms || Object.keys(a.terms).length === 0)) throw new DomainError('OVERRIDE_TERMS_REQUIRED');
      const o = await OverrideRecord.create({
        clientOrgId: a.clientOrgId,
        kind: a.kind,
        terms: a.kind === 'OVERRIDE' ? a.terms : null,
        queries: a.kind === 'TOPUP' ? a.queries : 0,
        reason: a.reason.trim(),
        status: 'PROPOSED',
        proposedBy: by,
      });
      return overrideDto(o.toObject());
    },
    /** @param {string} by @param {string} id @param {{ approve: boolean }} d */
    async decide(by, id, d) {
      const o = /^[a-f0-9]{24}$/.test(id) ? /** @type {any} */ (await OverrideRecord.findById(id).setOptions(SUBS).lean()) : null;
      if (!o) throw new NotFoundError('OVERRIDE_NOT_FOUND');
      if (o.proposedBy === by) throw new ForbiddenError('SECOND_PERSON_REQUIRED');
      const now = deps.clock.now();
      const res = await OverrideRecord.updateOne(
        { _id: o._id, status: 'PROPOSED' },
        { $set: { status: d.approve ? 'APPROVED' : 'REJECTED', decidedBy: by, decidedAt: now } },
      ).setOptions(SUBS);
      if (res.modifiedCount !== 1) throw new ConflictError('OVERRIDE_ALREADY_DECIDED', { overrideStatus: o.status });
      if (d.approve) await apply({ ...o, decidedBy: by }, now);
      return overrideDto({ ...o, status: d.approve ? 'APPROVED' : 'REJECTED', decidedBy: by, applied: d.approve });
    },
    /** @param {{ clientOrgId?: string, status?: string }} q */
    list: async (q) =>
      (
        await OverrideRecord.find({ ...(q.clientOrgId ? { clientOrgId: q.clientOrgId } : {}), ...(q.status ? { status: q.status } : {}) })
          .setOptions(SUBS)
          .sort({ createdAt: -1 })
          .limit(200)
          .lean()
      ).map(overrideDto),
    /** Approved but not applied (cut short) → applied. */
    async applyDue() {
      const due = await OverrideRecord.find({ status: 'APPROVED', applied: false }).setOptions(SUBS).limit(100).lean();
      for (const o of due) await apply(o, deps.clock.now());
      return { overridesApplied: due.length };
    },
  };
}
