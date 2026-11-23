// @ts-check
/**
 * Quota for a client now (plan Stage 13 §3.3–3.4): its subscription and terms, queries used this month (the daily /
 * monthly usage counters × weights), what is allowed, and whether counted calls are blocked. `sendAlerts` (every few
 * minutes) pushes `subscriptions.quota.reached` once per threshold a month — in the same update that records it.
 */
import { newEvent } from '../../core/db/events.js';
import { UsageMonthlyRecord } from '../metering/index.js';
import { alertsDue, quotaState, weightedUsed } from './domain/quota.js';
import { EVENTS } from './events.js';
import { monthOf } from './domain/periods.js';
import { SubscriptionRecord } from './models/subscription.model.js';
import { planVersion, queryWeights } from './plans.service.js';
import { effectiveTerms, SUBS, subscriptionOf } from './subscriptions.service.js';

/**
 * @param {Record<string, any>} sub
 * @param {Date} now
 * @param {Record<string, number>} [weights]
 */
export async function quotaOfSubscription(sub, now, weights) {
  const plan = /** @type {any} */ (await planVersion(sub.planVersionId));
  const terms = effectiveTerms(sub, plan, now);
  const month = monthOf(now);
  const rows = /** @type {any[]} */ (await UsageMonthlyRecord.find({ orgId: sub.clientOrgId, month }).setOptions(SUBS).lean());
  const used = weightedUsed(rows, weights ?? (await queryWeights()));
  const allowance = (sub.period === month ? sub.includedQueries : terms.queryLimit) + (sub.extraQueries ?? 0);
  return {
    month,
    status: sub.status,
    terms,
    used,
    allowance,
    ...quotaState({ used, allowance, behaviour: terms.limitBehaviour, status: sub.status }),
  };
}

/** @param {string} clientOrgId @param {Date} now — null when the client has no subscription yet */
export async function quotaOf(clientOrgId, now) {
  const sub = await subscriptionOf(clientOrgId);
  return sub ? quotaOfSubscription(sub, now) : null;
}

/** @param {{ clock: import('../../core/clock.js').Clock }} deps */
export async function sendQuotaAlerts(deps) {
  const now = deps.clock.now();
  const weights = await queryWeights();
  const subs = await SubscriptionRecord.find({ status: { $in: ['TRIAL', 'ACTIVE', 'PAST_DUE'] } })
    .setOptions(SUBS)
    .limit(5000)
    .lean();
  let sent = 0;
  for (const sub of subs) {
    const q = await quotaOfSubscription(sub, now, weights);
    const already = sub.alerts?.period === q.month ? (sub.alerts.sent ?? []) : [];
    const due = alertsDue(q.percent, already);
    if (due.length === 0) continue;
    const top = Math.max(...due);
    const event = newEvent(
      EVENTS.quotaReached,
      { orgId: sub.clientOrgId, percent: top, used: q.used, limit: q.allowance, amountPaise: 0 },
      deps,
    );
    const res = await SubscriptionRecord.updateOne(
      { _id: sub._id, $or: [{ 'alerts.period': { $ne: q.month } }, { 'alerts.sent': { $nin: due } }] },
      { $set: { alerts: { period: q.month, sent: [...already, ...due] }, hasPendingEvents: true }, $push: { pendingEvents: event } },
    ).setOptions(SUBS);
    sent += res.modifiedCount;
  }
  return { quotaAlerts: sent };
}
