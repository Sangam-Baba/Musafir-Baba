// @ts-check
/**
 * B2B realtime process: `node src/b2b/realtime.js` (npm run b2b:realtime).
 * Its own container from the existing backend image, on its own port and hostname;
 * no Socket.IO is attached to the existing server (docs/plan/11-…, 12-… §2).
 * Reads signals from the capped `rt_signals` collection and pushes them to rooms.
 */
import 'dotenv/config';
import http from 'node:http';

import { systemClock } from './core/clock.js';
import { loadConfig } from './core/config.js';
import { assertRegisteredModelsAllowed } from './core/db/model.js';
import { connectB2BDatabase, databaseState } from './core/db/connection.js';
import { failStartup, handleShutdown } from './core/lifecycle.js';
import { logger as baseLogger } from './core/logger.js';
import { createRealtimeServer } from './core/realtime/server.js';
import { createSignalReader } from './core/realtime/signals.js';

/** @type {http.RequestListener} */
function handleRequest(req, res) {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', database: databaseState() }));
    return;
  }
  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ status: 404, title: 'Not found' }));
}

async function main() {
  const config = loadConfig(process.env);
  if (!config.B2B_REALTIME_SECRET) throw new Error('B2B_REALTIME_SECRET is required for the realtime process');
  assertRegisteredModelsAllowed();
  await connectB2BDatabase(config.MONGO_URI, 'realtime');

  const logger = baseLogger.child({ process: 'realtime' });
  const origins = (config.B2B_REALTIME_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const httpServer = http.createServer(handleRequest);
  const realtime = createRealtimeServer({ httpServer, secret: config.B2B_REALTIME_SECRET, origins, clock: systemClock, logger });
  const reader = createSignalReader({ onSignal: (s) => realtime.deliver(s), clock: systemClock, logger });

  httpServer.listen(config.B2B_REALTIME_PORT, () => logger.info({ port: config.B2B_REALTIME_PORT, origins }, 'b2b realtime ready'));
  reader.start();
  handleShutdown('realtime', [() => reader.stop(), () => realtime.close()]);
}

main().catch((error) => failStartup('realtime', error));
