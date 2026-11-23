// @ts-check
/**
 * Prints a simulated billing month for a demo client (Stage 13) on a throw-away in-memory database — nothing real is
 * touched: `node scripts/b2b/simulate-billing.js`. The plan numbers are the placeholders until D7 is signed off.
 */
import { MongoMemoryServer } from 'mongodb-memory-server';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { connectB2BDatabase, disconnectB2BDatabase } from '../../src/b2b/core/db/connection.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { simulateBillingMonth } from './billing-simulation.js';

const server = await MongoMemoryServer.create({ binary: { version: '8.0.4' } });
try {
  await connectB2BDatabase(server.getUri('billing-simulation'), 'cli');
  await runMigrations(MIGRATIONS, { clock: { now: () => new Date('2026-11-10T06:30:00Z') }, owner: 'simulation' });
  console.log('Simulated billing month — demo client, placeholder plans (in-memory database)\n');
  await simulateBillingMonth({ log: (line) => console.log(line) });
} finally {
  await disconnectB2BDatabase();
  await server.stop();
}
