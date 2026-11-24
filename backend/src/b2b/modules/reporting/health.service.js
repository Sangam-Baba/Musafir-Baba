// @ts-check
/**
 * System health (plan Stage 16 §2.4): saves each run of the safety checks, decides which failing checks still need an
 * alert today (once per check per Indian day), and summarises for admins: the last run, what is failing now, problems
 * in the last 7 days and how many days in a row every run was clean. Runs older than 90 days are removed.
 */
import { InvariantRunRecord } from './models/invariant-run.model.js';

const DAY_MS = 86_400_000;
const IST_MS = 330 * 60_000;
const KEEP_MS = 90 * DAY_MS;

/** Start of the Indian day of an instant. @param {Date} at */
const indiaDayStart = (at) => new Date(Math.floor((at.getTime() + IST_MS) / DAY_MS) * DAY_MS - IST_MS);

/** @param {{ name: string, violations: { id: string, detail: string }[], error?: string }[]} reports */
const toChecks = (reports) =>
  reports.map((r) => ({
    name: r.name,
    violations: r.violations.length,
    sample: r.violations.slice(0, 5).map((v) => `${v.id}: ${v.detail}`.slice(0, 200)),
    error: r.error ?? null,
  }));

/**
 * Save a run; returns the checks that need an alert now (failing, and not alerted yet today).
 * @param {{ clock: import('../../core/clock.js').Clock }} deps
 * @param {{ name: string, violations: { id: string, detail: string }[], error?: string }[]} reports
 */
export async function recordInvariantRun(deps, reports) {
  const now = deps.clock.now();
  const checks = toChecks(reports);
  const failing = checks.filter((c) => c.violations > 0 || c.error).map((c) => c.name);
  const already = failing.length
    ? new Set(
        (await InvariantRunRecord.find({ at: { $gte: indiaDayStart(now) }, alerts: { $in: failing } }, { alerts: 1 }).lean()).flatMap(
          (r) => r.alerts,
        ),
      )
    : new Set();
  const alerts = failing.filter((n) => !already.has(n));
  await InvariantRunRecord.create({ at: now, ok: failing.length === 0, checks, alerts });
  await InvariantRunRecord.deleteMany({ at: { $lt: new Date(now.getTime() - KEEP_MS) } });
  return { ok: failing.length === 0, failing, alerts, checks };
}

/** @param {{ clock: import('../../core/clock.js').Clock }} deps */
export async function systemHealth(deps) {
  const now = deps.clock.now();
  const last = await InvariantRunRecord.findOne({}).sort({ at: -1 }).lean();
  const lastBad = await InvariantRunRecord.findOne({ ok: false }).sort({ at: -1 }).lean();
  const firstRun = await InvariantRunRecord.findOne({}).sort({ at: 1 }).lean();
  const recentBad = await InvariantRunRecord.find({ ok: false, at: { $gte: new Date(now.getTime() - 7 * DAY_MS) } })
    .sort({ at: -1 })
    .limit(50)
    .lean();
  const cleanSince = lastBad ? lastBad.at : (firstRun?.at ?? null);
  return {
    lastRun: last ? { at: last.at, ok: last.ok, checks: last.checks } : null,
    failingNow: last ? last.checks.filter((c) => (c.violations ?? 0) > 0 || c.error) : [],
    cleanSince,
    daysClean: cleanSince ? Math.floor((now.getTime() - new Date(cleanSince).getTime()) / DAY_MS) : 0,
    problemsLast7Days: recentBad.map((r) => ({
      at: r.at,
      checks: r.checks.filter((c) => (c.violations ?? 0) > 0 || c.error).map((c) => c.name),
    })),
    stale: !last || now.getTime() - new Date(last.at).getTime() > 30 * 60_000, // checks not running (background stopped?)
  };
}
