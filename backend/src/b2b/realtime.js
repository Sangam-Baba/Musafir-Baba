// @ts-check
/**
 * B2B realtime process: `node src/b2b/realtime.js` (npm run b2b:realtime).
 * Its own container from the existing backend image, on its own port and hostname;
 * no Socket.IO is attached to the existing server (docs/plan/11-…, 12-… §2).
 *
 * Socket.IO and the rt_signals reader are added in S00-T15. For now: health only.
 */
import 'dotenv/config';
import http from 'node:http';

import { loadConfig } from './core/config.js';
import { assertRegisteredModelsAllowed } from './core/db/model.js';
import { connectB2BDatabase, databaseState } from './core/db/connection.js';
import { failStartup, handleShutdown } from './core/lifecycle.js';

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
  assertRegisteredModelsAllowed();
  await connectB2BDatabase(config.MONGO_URI, 'realtime');
  const server = http.createServer(handleRequest);
  server.listen(config.B2B_REALTIME_PORT, () => {
    console.log(`[b2b:realtime] ready on port ${config.B2B_REALTIME_PORT}`);
  });
  handleShutdown('realtime', [() => new Promise((resolve) => server.close(() => resolve()))]);
}

main().catch((error) => failStartup('realtime', error));
