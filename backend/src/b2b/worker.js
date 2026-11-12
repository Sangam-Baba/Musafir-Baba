// @ts-check
/**
 * B2B worker process: `node src/b2b/worker.js` (npm run b2b:worker).
 * Runs as its own container from the existing backend image; the existing
 * backend container and its crons are not affected (docs/plan/12-… §2, B4).
 *
 * Runs: the job queue (core_jobs), the reconciler every 30 s and invariant checks every
 * 10 min (lease-locked — safe with several worker containers). The event relay is added
 * in S00-T11.
 */
import 'dotenv/config';
import { hostname } from 'node:os';

import { INVARIANTS_EVERY_MS, invariantChecks, jobHandlers, RECONCILE_EVERY_MS, reconciler } from './background.js';
import { systemClock } from './core/clock.js';
import { loadConfig } from './core/config.js';
import { assertRegisteredModelsAllowed } from './core/db/model.js';
import { connectB2BDatabase } from './core/db/connection.js';
import { createJobRunner } from './core/jobs/runner.js';
import { createScheduler } from './core/jobs/scheduler.js';
import { failStartup, handleShutdown } from './core/lifecycle.js';
import { logger as baseLogger } from './core/logger.js';

async function main() {
  const config = loadConfig(process.env);
  assertRegisteredModelsAllowed();
  await connectB2BDatabase(config.MONGO_URI, 'worker');

  const workerId = `${hostname()}:${process.pid}`;
  const logger = baseLogger.child({ process: 'worker', workerId });
  const deps = { clock: systemClock, logger };

  const scheduler = createScheduler({ workerId, ...deps });
  scheduler.register({ name: 'reconciler', everyMs: RECONCILE_EVERY_MS, run: async () => { await reconciler.runOnce(deps); } });
  scheduler.register({ name: 'invariants', everyMs: INVARIANTS_EVERY_MS, run: async () => { await invariantChecks.runAll(logger); } });
  const runner = createJobRunner({ handlers: jobHandlers, workerId, ...deps });

  scheduler.start();
  runner.start();
  handleShutdown('worker', [() => scheduler.stop(), () => runner.stop()]);
  logger.info({ jobHandlers: jobHandlers.size, reconcileRules: reconciler.rules().length }, 'b2b worker ready');
}

main().catch((error) => failStartup('worker', error));
