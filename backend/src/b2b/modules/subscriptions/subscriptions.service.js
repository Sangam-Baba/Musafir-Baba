// @ts-check
/**
 * Subscriptions (plan Stage 13 §3.2). One per client; every change is a conditional update on `version` (two at once
 * → one wins, the other gets SUBSCRIPTION_CHANGED). Money is never moved here: fees become `charges` (each with its
 * own id) that billing invoices and collects from the wallet once.
 * - `start`: on activation — the default plan (Starter trial); repeat-safe.
 * - `change`: upgrade now (fee difference and included queries prorated by days left); downgrade at period end.
 * - `cancel` / `resume`: at period end.
 * - `renew`: a new month — pending change applied, the plan's current version taken, included queries reset, the
 *   month's plan fee added as a charge; a trial past its end moves to its next plan (fee prorated).
 */
import { randomUUID } from 'node:crypto';

import { systemScope } from '../../core/db/tenant-plugin.js';
import { ConflictError, DomainError, NotFoundError } from '../../core/errors.js';
import { daysLeft, monthOf, prorate } from './domain/periods.js';
import { DEFAULT_PLAN_KEY } from './domain/plans.js';
import { SubscriptionRecord } from './models/subscription.model.js';
import { planVersion, publishedPlan } from './plans.service.js';

export const SUBS = systemScope('subscriptions: client plans', { routine: true });
const DAY_MS = 86_400_000;

/** @typedef {{ clock: import('../../core/clock.js').Clock }} SubDeps */

/**
 * What the client is on now: the plan version, with an unexpired override on top.
 * @param {Record<string, any>} sub
 * @param {Record<string, any>} plan the plan version
 * @param {Date} now
 */
export function effectiveTerms(sub, plan, now) {
  const o = sub.override && (!sub.override.expiresAt || new Date(sub.override.expiresAt) > now) ? sub.override : null;
  return {
    planKey: sub.planKey,
    name: plan.name,
    queryLimit: o?.queryLimit ?? plan.monthlyQueryLimit,
    pricePaise: o?.pricePaise ?? plan.pricePaise,
    limitBehaviour: /** @type {'BLOCK' | 'OVERAGE'} */ (o?.limitBehaviour ?? plan.limitBehaviour),
    overagePricePerQueryPaise: o?.overagePricePerQueryPaise ?? plan.overagePricePerQueryPaise,
    features: plan.features,
    overridden: Boolean(o),
  };
}

/** @param {string} clientOrgId */
export async function subscriptionOf(clientOrgId) {
  return /** @type {Record<string, any> | null} */ (await SubscriptionRecord.findOne({ clientOrgId }).setOptions(SUBS).lean());
}

/** A fee line for billing to invoice once. @param {string} kind @param {string} description @param {number} amountPaise @param {{ period: string, at: Date }} when */
const charge = (kind, description, amountPaise, when) => ({
  id: randomUUID(),
  kind,
  description,
  amountPaise,
  period: when.period,
  at: when.at,
});

/** @param {SubDeps} deps @param {string} clientOrgId */
async function start(deps, clientOrgId) {
  const have = await subscriptionOf(clientOrgId);
  if (have) return have;
  const plan = await publishedPlan(DEFAULT_PLAN_KEY);
  if (!plan) throw new DomainError('DEFAULT_PLAN_MISSING');
  const now = deps.clock.now();
  const { month, left, total } = daysLeft(now);
  const trial = plan.trialDays > 0;
  try {
    await SubscriptionRecord.create({
      clientOrgId,
      planKey: plan.planKey,
      planVersionId: String(plan._id),
      status: trial ? 'TRIAL' : 'ACTIVE',
      period: month,
      trialEndsAt: trial ? new Date(now.getTime() + plan.trialDays * DAY_MS) : null,
      includedQueries: trial ? plan.monthlyQueryLimit : prorate(plan.monthlyQueryLimit, left, total),
      charges:
        !trial && plan.pricePaise > 0
          ? [
              charge('PLAN_FEE', `${plan.name} (${month}, ${left} of ${total} days)`, prorate(plan.pricePaise, left, total), {
                period: month,
                at: now,
              }),
            ]
          : [],
      history: [{ at: now, what: `started on ${plan.name}${trial ? ` (trial, ${plan.trialDays} days)` : ''}`, by: 'system' }],
    });
  } catch (e) {
    if (/** @type {any} */ (e)?.code !== 11000) throw e; // started a moment earlier
  }
  return /** @type {Record<string, any>} */ (await subscriptionOf(clientOrgId));
}

/**
 * What changing to `planKey` would do now (no change made).
 * @param {SubDeps} deps
 * @param {Record<string, any>} sub
 * @param {string} planKey
 */
async function preview(deps, sub, planKey) {
  const next = await publishedPlan(planKey);
  if (!next) throw new NotFoundError('PLAN_NOT_FOUND');
  if (planKey === sub.planKey && sub.status !== 'TRIAL') throw new DomainError('ALREADY_ON_PLAN');
  const now = deps.clock.now();
  const current = effectiveTerms(sub, /** @type {any} */ (await planVersion(sub.planVersionId)), now);
  const { month, left, total } = daysLeft(now);
  const upgrade =
    sub.status === 'TRIAL' ||
    next.pricePaise > current.pricePaise ||
    (next.pricePaise === current.pricePaise && next.monthlyQueryLimit > current.queryLimit);
  if (!upgrade)
    return { kind: /** @type {const} */ ('DOWNGRADE'), plan: next, from: month, chargeNowPaise: 0, includedQueries: sub.includedQueries };
  const used = total - left; // days already on the current plan
  const chargeNowPaise =
    sub.status === 'TRIAL'
      ? prorate(next.pricePaise, left, total)
      : Math.max(0, prorate(next.pricePaise - current.pricePaise, left, total));
  const includedQueries =
    sub.status === 'TRIAL'
      ? prorate(next.monthlyQueryLimit, left, total)
      : prorate(current.queryLimit, used, total) + prorate(next.monthlyQueryLimit, left, total);
  return { kind: /** @type {const} */ ('UPGRADE'), plan: next, from: month, chargeNowPaise, includedQueries };
}

/**
 * @param {SubDeps} deps
 * @param {{ clientOrgId: string, planKey: string, expectedVersion: number, by: string }} a
 */
async function change(deps, a) {
  const sub = await subscriptionOf(a.clientOrgId);
  if (!sub) throw new NotFoundError('SUBSCRIPTION_NOT_FOUND');
  if (sub.version !== a.expectedVersion) throw new ConflictError('SUBSCRIPTION_CHANGED', { version: sub.version });
  if (sub.status === 'SUSPENDED' || sub.status === 'CANCELLED')
    throw new ConflictError('SUBSCRIPTION_NOT_CHANGEABLE', { subscriptionStatus: sub.status });
  const p = await preview(deps, sub, a.planKey);
  const now = deps.clock.now();
  /** @type {Record<string, any>} */
  const update =
    p.kind === 'DOWNGRADE'
      ? { $set: { pending: { action: 'DOWNGRADE', planKey: p.plan.planKey, at: p.from } } }
      : {
          $set: {
            planKey: p.plan.planKey,
            planVersionId: String(p.plan._id),
            includedQueries: p.includedQueries,
            pending: null,
            ...(sub.status === 'TRIAL' ? { status: 'ACTIVE', trialEndsAt: null } : {}),
          },
          ...(p.chargeNowPaise > 0
            ? {
                $push: {
                  charges: charge(
                    sub.status === 'TRIAL' ? 'PLAN_FEE' : 'UPGRADE',
                    `${p.plan.name} from ${now.toISOString().slice(0, 10)} (prorated)`,
                    p.chargeNowPaise,
                    { period: p.from, at: now },
                  ),
                },
              }
            : {}),
        };
  update.$inc = { version: 1 };
  update.$push = {
    ...(update.$push ?? {}),
    history: { at: now, what: `${p.kind === 'UPGRADE' ? 'upgraded' : 'downgrade booked'} to ${p.plan.name}`, by: a.by },
  };
  const res = await SubscriptionRecord.updateOne({ _id: sub._id, version: a.expectedVersion }, update).setOptions(SUBS);
  if (res.modifiedCount !== 1) throw new ConflictError('SUBSCRIPTION_CHANGED');
  return { kind: p.kind, chargeNowPaise: p.chargeNowPaise, subscription: await subscriptionOf(a.clientOrgId) };
}

/** Cancelled at period end. @param {Record<string, any>} sub @param {string} month @param {Date} now */
async function closeCancelled(sub, month, now) {
  const res = await SubscriptionRecord.updateOne(
    { _id: sub._id, version: sub.version },
    {
      $set: { status: 'CANCELLED', period: month, pending: null, includedQueries: 0 },
      $inc: { version: 1 },
      $push: { history: { at: now, what: 'cancelled at period end', by: 'system' } },
    },
  ).setOptions(SUBS);
  return res.modifiedCount === 1;
}

/** The plan (version) a renewing subscription moves to, and its status. @param {Record<string, any>} sub @param {Date} now */
async function renewalTarget(sub, now) {
  const trialOver = sub.status === 'TRIAL' && Boolean(sub.trialEndsAt) && new Date(sub.trialEndsAt) <= now;
  const current = /** @type {any} */ (await planVersion(sub.planVersionId));
  let nextKey = sub.planKey;
  if (sub.pending?.action === 'DOWNGRADE') nextKey = sub.pending.planKey;
  else if (trialOver) nextKey = current?.nextPlanKey ?? 'A';
  const plan = (await publishedPlan(nextKey)) ?? current;
  let status = sub.status;
  if (sub.status === 'TRIAL') status = trialOver ? 'ACTIVE' : 'TRIAL';
  return { plan, status };
}

/**
 * A new month for one subscription (repeat-safe: only when its period is behind `now`'s month).
 * @param {SubDeps} deps
 * @param {Record<string, any>} sub
 */
async function renew(deps, sub) {
  const now = deps.clock.now();
  const month = monthOf(now);
  if (sub.period >= month || sub.status === 'CANCELLED') return false;
  if (sub.pending?.action === 'CANCEL') return closeCancelled(sub, month, now);
  const { plan, status } = await renewalTarget(sub, now);
  const terms = effectiveTerms({ ...sub, planKey: plan.planKey }, plan, now);
  const fee =
    status !== 'TRIAL' && terms.pricePaise > 0
      ? [charge('PLAN_FEE', `${plan.name} (${month})`, terms.pricePaise, { period: month, at: now })]
      : [];
  const res = await SubscriptionRecord.updateOne(
    { _id: sub._id, version: sub.version, period: sub.period },
    {
      $set: {
        planKey: plan.planKey,
        planVersionId: String(plan._id),
        period: month,
        status,
        includedQueries: terms.queryLimit,
        extraQueries: 0,
        pending: null,
        ...(status !== 'TRIAL' ? { trialEndsAt: null } : {}),
      },
      $inc: { version: 1 },
      $push: { charges: { $each: fee }, history: { at: now, what: `renewed for ${month} on ${plan.name}`, by: 'system' } },
    },
  ).setOptions(SUBS);
  return res.modifiedCount === 1;
}

/** A trial that ended mid-month moves to its next plan now (fee and queries prorated). @param {SubDeps} deps @param {Record<string, any>} sub */
async function endTrial(deps, sub) {
  const now = deps.clock.now();
  if (sub.status !== 'TRIAL' || !sub.trialEndsAt || new Date(sub.trialEndsAt) > now) return false;
  const current = /** @type {any} */ (await planVersion(sub.planVersionId));
  const plan = await publishedPlan(current?.nextPlanKey ?? 'A');
  if (!plan) return false;
  const { month, left, total } = daysLeft(now);
  const res = await SubscriptionRecord.updateOne(
    { _id: sub._id, version: sub.version, status: 'TRIAL' },
    {
      $set: {
        planKey: plan.planKey,
        planVersionId: String(plan._id),
        status: 'ACTIVE',
        trialEndsAt: null,
        includedQueries: sub.includedQueries + prorate(plan.monthlyQueryLimit, left, total),
      },
      $inc: { version: 1 },
      $push: {
        charges: {
          $each:
            plan.pricePaise > 0
              ? [
                  charge('PLAN_FEE', `${plan.name} (${month}, ${left} of ${total} days)`, prorate(plan.pricePaise, left, total), {
                    period: month,
                    at: now,
                  }),
                ]
              : [],
        },
        history: { at: now, what: `trial ended — now on ${plan.name}`, by: 'system' },
      },
    },
  ).setOptions(SUBS);
  return res.modifiedCount === 1;
}

/** @param {SubDeps} deps */
export function createSubscriptions(deps) {
  return {
    /** @param {string} clientOrgId */
    start: (clientOrgId) => start(deps, clientOrgId),
    current: subscriptionOf,
    /** @param {string} clientOrgId @param {string} planKey */
    async preview(clientOrgId, planKey) {
      const sub = await subscriptionOf(clientOrgId);
      if (!sub) throw new NotFoundError('SUBSCRIPTION_NOT_FOUND');
      const p = await preview(deps, sub, planKey);
      return {
        kind: p.kind,
        planKey: p.plan.planKey,
        planName: p.plan.name,
        from: p.from,
        chargeNowPaise: p.chargeNowPaise,
        includedQueries: p.includedQueries,
        version: sub.version,
      };
    },
    /** @param {{ clientOrgId: string, planKey: string, expectedVersion: number, by: string }} a */
    change: (a) => change(deps, a),
    /** Cancel at period end (`resume` undoes it). @param {string} clientOrgId @param {string} by @param {boolean} [undo] */
    async cancel(clientOrgId, by, undo = false) {
      const sub = await subscriptionOf(clientOrgId);
      if (!sub) throw new NotFoundError('SUBSCRIPTION_NOT_FOUND');
      const now = deps.clock.now();
      const res = await SubscriptionRecord.updateOne(
        { _id: sub._id, version: sub.version, status: { $ne: 'CANCELLED' } },
        {
          $set: { pending: undo ? null : { action: 'CANCEL', planKey: sub.planKey, at: monthOf(now) } },
          $inc: { version: 1 },
          $push: { history: { at: now, what: undo ? 'cancellation withdrawn' : 'cancel at period end', by } },
        },
      ).setOptions(SUBS);
      if (res.modifiedCount !== 1) throw new ConflictError('SUBSCRIPTION_CHANGED');
      return subscriptionOf(clientOrgId);
    },
    /** @param {Record<string, any>} sub */
    renew: (sub) => renew(deps, sub),
    /** @param {Record<string, any>} sub */
    endTrial: (sub) => endTrial(deps, sub),
    effectiveTerms,
  };
}
