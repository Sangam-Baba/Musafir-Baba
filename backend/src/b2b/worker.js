// @ts-check
/**
 * B2B worker process: `node src/b2b/worker.js` (npm run b2b:worker).
 * Runs as its own container from the existing backend image; the existing
 * backend container and its crons are not affected (docs/plan/12-… §2, B4).
 *
 * Job queue, scheduler, reconciler and event relay are added in Stage 00 tasks
 * S00-T03/T08/T11.
 */
import 'dotenv/config';

import { loadConfig } from './core/config.js';
import { assertRegisteredModelsAllowed } from './core/db/model.js';
import { connectB2BDatabase } from './core/db/connection.js';
import { failStartup, handleShutdown } from './core/lifecycle.js';

async function main() {
  const config = loadConfig(process.env);
  assertRegisteredModelsAllowed();
  await connectB2BDatabase(config.MONGO_URI, 'worker');
  handleShutdown('worker', []);
  console.log('[b2b:worker] ready');
}

main().catch((error) => failStartup('worker', error));
