// @ts-check
/**
 * Health of the B2B system for GET /api/v1/health (monitoring, docs/plan/12-… §6 item 8).
 * Cheap, indexed reads only. `degraded` when background work falls behind:
 * - job lag: the oldest READY job that is due has waited more than 60 s
 * - reconciler: its last run is more than 2 minutes old (it runs every 30 s)
 * Never exposes internal details.
 */
import { b2bMongoose, databaseState } from './db/connection.js';

const JOB_LAG_LIMIT_S = 60;
const RECONCILER_LIMIT_S = 120;

/** @typedef {{ status: 'ok' | 'degraded' | 'down', database: 'up' | 'down' | 'connecting', jobLagSeconds: number | null, reconcilerLastRunSecondsAgo: number | null }} Health */

/**
 * @param {import('./clock.js').Clock} clock
 * @returns {Promise<Health>}
 */
export async function checkHealth(clock) {
  const database = databaseState();
  const db = b2bMongoose.connection.db;
  if (database !== 'up' || !db) return { status: 'down', database, jobLagSeconds: null, reconcilerLastRunSecondsAgo: null };
  const now = clock.now();
  const [oldestJob, reconciler] = await Promise.all([
    db
      .collection('core_jobs')
      .findOne(
        { queue: 'default', status: 'READY', runAt: { $lte: now } },
        { sort: { runAt: 1 }, projection: { runAt: 1 }, maxTimeMS: 1000 },
      ),
    db.collection('core_schedules').findOne({ _id: /** @type {any} */ ('reconciler') }, { projection: { lastRunAt: 1 }, maxTimeMS: 1000 }),
  ]);
  const secondsSince = (/** @type {unknown} */ d) =>
    d instanceof Date ? Math.max(0, Math.round((now.getTime() - d.getTime()) / 1000)) : null;
  const jobLagSeconds = oldestJob ? secondsSince(oldestJob.runAt) : 0;
  const reconcilerLastRunSecondsAgo = secondsSince(reconciler?.lastRunAt);
  const degraded =
    (jobLagSeconds ?? 0) > JOB_LAG_LIMIT_S || (reconcilerLastRunSecondsAgo !== null && reconcilerLastRunSecondsAgo > RECONCILER_LIMIT_S);
  return { status: degraded ? 'degraded' : 'ok', database, jobLagSeconds, reconcilerLastRunSecondsAgo };
}
