// @ts-check
/**
 * Usage reports (plan Stage 12 §3.12) — both read the daily counters, so the client and MusafirBaba see the same
 * numbers: a client's month (by kind, by person, by day) and every client's month (sorted by use). `recountDay` (the
 * nightly check) rebuilds a day's counters from the events and the month from its days.
 */
import { systemScope } from '../../core/db/tenant-plugin.js';
import { UsageDailyRecord, UsageEventRecord, UsageMonthlyRecord } from './models/usage.model.js';

const SCOPE = systemScope('metering: usage reports', { routine: true });

/** The days of a month `YYYY-MM` as a range on `day`. @param {string} month */
const monthDays = (month) => ({ $gte: `${month}-01`, $lte: `${month}-31` });

/**
 * One client's month.
 * @param {string} orgId
 * @param {string} month YYYY-MM
 */
async function clientMonth(orgId, month) {
  const days = await UsageDailyRecord.find({ orgId, day: monthDays(month) })
    .setOptions(SCOPE)
    .sort({ day: 1 })
    .lean();
  /** @type {Record<string, { count: number, billable: number }>} */
  const byMetric = {};
  /** @type {Record<string, number>} */
  const byUser = {};
  /** @type {Record<string, number>} */
  const byDay = {};
  for (const d of /** @type {any[]} */ (days)) {
    const m = (byMetric[d.metric] ??= { count: 0, billable: 0 });
    m.count += d.count ?? 0;
    m.billable += d.billable ?? 0;
    byDay[d.day] = (byDay[d.day] ?? 0) + (d.billable ?? 0);
    for (const [u, n] of Object.entries(d.byUser ?? {})) byUser[u] = (byUser[u] ?? 0) + Number(n);
  }
  const billable = Object.values(byMetric).reduce((s, m) => s + m.billable, 0);
  return { orgId, month, billable, byMetric, byUser, byDay: Object.entries(byDay).map(([day, count]) => ({ day, count })) };
}

/** Every client's month, most used first. @param {string} month */
async function allClients(month) {
  const rows = await UsageDailyRecord.aggregate([
    { $match: { day: monthDays(month), orgId: { $ne: 'platform' } } },
    { $group: { _id: '$orgId', count: { $sum: '$count' }, billable: { $sum: '$billable' } } },
    { $sort: { billable: -1 } },
    { $limit: 2000 },
  ]).option(SCOPE);
  return rows.map((r) => ({ orgId: String(r._id), count: r.count, billable: r.billable }));
}

/**
 * The nightly check: a day's counters rebuilt from its events (and its month from the days).
 * @param {string} day YYYY-MM-DD (Indian)
 */
export async function recountDay(day) {
  const rows = await UsageEventRecord.aggregate([
    { $match: { day } },
    {
      $group: {
        _id: { orgId: '$orgId', metric: '$metric', userId: '$userId' },
        count: { $sum: 1 },
        billable: { $sum: { $cond: ['$billable', 1, 0] } },
      },
    },
  ]).option(SCOPE);
  /** @type {Map<string, { orgId: string, metric: string, count: number, billable: number, byUser: Record<string, number> }>} */
  const days = new Map();
  for (const r of /** @type {any[]} */ (rows)) {
    const k = `${r._id.orgId}|${r._id.metric}`;
    const d = days.get(k) ?? {
      orgId: r._id.orgId,
      metric: r._id.metric,
      count: 0,
      billable: 0,
      byUser: /** @type {Record<string, number>} */ ({}),
    };
    d.count += r.count;
    d.billable += r.billable;
    if (r._id.userId) d.byUser[r._id.userId] = r.count;
    days.set(k, d);
  }
  let fixed = 0;
  for (const d of days.values()) {
    const res = await UsageDailyRecord.updateOne(
      { orgId: d.orgId, metric: d.metric, day },
      { $set: { count: d.count, billable: d.billable, byUser: d.byUser } },
      { upsert: true },
    ).setOptions(SCOPE);
    fixed += res.modifiedCount + (res.upsertedCount ?? 0);
  }
  const month = day.slice(0, 7);
  for (const d of days.values()) {
    const [m] = await UsageDailyRecord.aggregate([
      { $match: { orgId: d.orgId, metric: d.metric, day: monthDays(month) } },
      { $group: { _id: null, count: { $sum: '$count' }, billable: { $sum: '$billable' } } },
    ]).option(SCOPE);
    await UsageMonthlyRecord.updateOne(
      { orgId: d.orgId, metric: d.metric, month },
      { $set: { count: m?.count ?? 0, billable: m?.billable ?? 0 } },
      { upsert: true },
    ).setOptions(SCOPE);
  }
  return { day, counters: days.size, fixed };
}

/** The usage screens' reads (client and admin read the same counters). */
export function createUsageReports() {
  return {
    /** @param {string} orgId @param {string} month */
    clientMonth: (orgId, month) => clientMonth(orgId, month),
    /** @param {string} month */
    allClients: (month) => allClients(month),
    recountDay,
  };
}
