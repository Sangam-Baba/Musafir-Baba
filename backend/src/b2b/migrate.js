// @ts-check
/**
 * Applies pending B2B migrations: `npm run b2b:migrate`.
 * Only collections with an allowed prefix can be created or changed (docs/plan/12-… D1, D3).
 */
import 'dotenv/config';
import { hostname } from 'node:os';

import { systemClock } from './core/clock.js';
import { loadConfig } from './core/config.js';
import { connectB2BDatabase, disconnectB2BDatabase } from './core/db/connection.js';
import { runMigrations } from './core/db/migrations.js';
import { MIGRATIONS } from './migrations/index.js';

async function main() {
  const config = loadConfig(process.env);
  await connectB2BDatabase(config.MONGO_URI, 'cli');
  try {
    const result = await runMigrations(MIGRATIONS, { clock: systemClock, owner: `${hostname()}:${process.pid}` });
    console.log(`[b2b:migrate] applied: ${result.applied.join(', ') || 'none'}; already done: ${result.skipped.length}`);
  } finally {
    await disconnectB2BDatabase();
  }
}

main().catch((error) => {
  console.error('[b2b:migrate] failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
