// @ts-check
/**
 * Demo data on a server (owner-approved, hidden from the public — see demo/demo-data.js):
 *   node src/b2b/demo.js add      → demo hotel (3 properties) + demo B2B client; prints the two logins and password
 *   node src/b2b/demo.js full     → LOCAL / TEST DATABASES ONLY: the above plus real flows — a second hotel company, two
 *                                   more clients, wallets, bookings, a cancellation, a payout run, a plan invoice, an API
 *                                   key and webhook address, a booking request (refuses NODE_ENV=production)
 *   node src/b2b/demo.js remove   → deletes exactly the demo companies and what belongs to them
 * In production: docker exec musafirbaba-backend node src/b2b/demo.js add
 * Uses the server's own settings (MONGO_URI, B2B_AUTH_SECRET). Runs the B2B API in this process on 127.0.0.1 for the
 * hotel steps (the same checks a real hotel goes through); nothing is exposed outside the machine.
 */
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import http from 'node:http';

import express from 'express';

import { systemClock } from './core/clock.js';
import { loadConfig } from './core/config.js';
import { connectB2BDatabase, disconnectB2BDatabase } from './core/db/connection.js';
import { createLogger } from './core/logger.js';
import { publishCacheEvict } from './core/realtime/signals.js';
import { addDemoData, removeDemoData } from './demo/demo-data.js';
import { addDemoFlows } from './demo/demo-flows.js';
import { createUserRepository } from './modules/identity/index.js';
import { createOrganizationsService } from './modules/organizations/index.js';
import { createB2BRouter } from './routes/v1.js';

/** @param {string} base */
function client(base) {
  /** @param {string} method @param {string} path @param {unknown} body @param {Record<string, string>} headers */
  const send = async (method, path, body, headers = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };
  return {
    get: (/** @type {string} */ p, /** @type {Record<string, string>} */ h = {}) => send('GET', p, undefined, h),
    post: (/** @type {string} */ p, /** @type {unknown} */ b, /** @type {Record<string, string>} */ h = {}) => send('POST', p, b, h),
    put: (/** @type {string} */ p, /** @type {unknown} */ b, /** @type {Record<string, string>} */ h = {}) => send('PUT', p, b, h),
  };
}

/** @param {boolean} full */
async function add(full) {
  const app = express();
  // the full demo turns online booking and wallets on for this in-process API only — the server's settings are not changed
  const env = full ? { ...process.env, B2B_ORDERS_ENABLED: 'true', B2B_WALLET_ENABLED: 'true' } : process.env;
  const logger = createLogger({ write: () => {} });
  app.use('/api/v1', createB2BRouter({ connect: false, logger, env }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)));
  const port = /** @type {import('node:net').AddressInfo} */ (server.address()).port;
  const password = process.env.DEMO_PASSWORD || `Demo-${randomBytes(6).toString('base64url')}`;
  try {
    const r = await addDemoData({
      api: client(`http://127.0.0.1:${port}`),
      clock: systemClock,
      users: createUserRepository({ clock: systemClock }),
      orgs: createOrganizationsService({ clock: systemClock }),
      password,
    });
    console.log(`[b2b:demo] added: hotel ${r.hotelOrgId} with ${r.properties.length} properties, client ${r.clientOrgId}`);
    if (full)
      for (const line of await addDemoFlows(
        {
          api: client(`http://127.0.0.1:${port}`),
          clock: systemClock,
          users: createUserRepository({ clock: systemClock }),
          orgs: createOrganizationsService({ clock: systemClock }),
          password,
          env,
          logger,
        },
        r,
      ))
        console.log(`[b2b:demo] ${line}`);
    console.log(`[b2b:demo] sign in at /business with ${r.logins.join(' or ')} — password: ${password}`);
  } finally {
    server.close();
    server.closeAllConnections();
  }
}

async function main() {
  const command = process.argv[2];
  if (command !== 'add' && command !== 'full' && command !== 'remove') throw new Error('usage: node src/b2b/demo.js add | full | remove');
  if (command === 'full' && process.env.NODE_ENV === 'production')
    throw new Error('"full" makes bookings, wallet money, invoices and payouts — local / test databases only, never production');
  await connectB2BDatabase(loadConfig(process.env).MONGO_URI, 'cli');
  try {
    if (command === 'add' || command === 'full') await add(command === 'full');
    else console.log('[b2b:demo] removed:', JSON.stringify(await removeDemoData()));
    await publishCacheEvict('search:', { clock: systemClock }); // every server drops its cached search lists
  } finally {
    await disconnectB2BDatabase();
  }
}

main().catch((error) => {
  console.error('[b2b:demo] failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
