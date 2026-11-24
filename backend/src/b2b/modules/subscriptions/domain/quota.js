// @ts-check
/**
 * Quota — pure (plan Stage 13 §3.4). Queries used this month = Σ counted calls × the kind's weight (admin's table);
 * allowed = the month's included queries (prorated) + approved top-ups. Alerts at 80 % and 100 % (once each a month).
 * BLOCK: counted calls refused from 100 %; OVERAGE: they go on and the extra is billed at month close. Counters lag a
 * few seconds (no Redis — D22), so a BLOCK plan may let a few extra queries through; they are never billed.
 */
export const ALERT_PERCENTS = /** @type {const} */ ([80, 100]);

/**
 * @param {{ metric: string, billable: number }[]} rows this month's counters
 * @param {Record<string, number>} weights
 */
export const weightedUsed = (rows, weights) => rows.reduce((s, r) => s + (r.billable ?? 0) * (weights[r.metric] ?? 0), 0);

/**
 * @param {{ used: number, allowance: number, behaviour: 'BLOCK' | 'OVERAGE', status: string }} a
 * @returns {{ percent: number, blocked: boolean, reason: 'QUOTA_EXCEEDED' | 'SUBSCRIPTION_SUSPENDED' | null, overageQueries: number }}
 */
export function quotaState(a) {
  const percent = a.allowance > 0 ? Math.floor((a.used * 100) / a.allowance) : a.used > 0 ? 100 : 0;
  const overageQueries = Math.max(0, a.used - a.allowance);
  if (a.status === 'SUSPENDED' || a.status === 'CANCELLED')
    return { percent, blocked: true, reason: 'SUBSCRIPTION_SUSPENDED', overageQueries };
  if (a.behaviour === 'BLOCK' && a.used >= a.allowance) return { percent, blocked: true, reason: 'QUOTA_EXCEEDED', overageQueries };
  return { percent, blocked: false, reason: null, overageQueries };
}

/** Alerts due now (not yet sent this month). @param {number} percent @param {number[]} sent */
export const alertsDue = (percent, sent) => ALERT_PERCENTS.filter((p) => percent >= p && !sent.includes(p));
