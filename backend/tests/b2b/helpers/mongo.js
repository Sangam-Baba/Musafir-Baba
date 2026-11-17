// @ts-check
/**
 * Standalone in-memory MongoDB (same mode and major version as production — no
 * replica set, so transactions/change streams can't be used by accident).
 */
import { MongoMemoryServer } from 'mongodb-memory-server';

import { b2bMongoose, connectB2BDatabase, disconnectB2BDatabase } from '../../../src/b2b/core/db/connection.js';

export const MONGO_VERSION = '8.0.4';

/** @returns {Promise<{ db: import('mongodb').Db, stop: () => Promise<void> }>} */
export async function startMongo() {
  const server = await MongoMemoryServer.create({ binary: { version: MONGO_VERSION } });
  await connectB2BDatabase(server.getUri('b2btest'), 'test');
  const db = /** @type {import('mongodb').Db} */ (/** @type {unknown} */ (b2bMongoose.connection.db));
  return {
    db,
    stop: async () => {
      await disconnectB2BDatabase();
      await server.stop();
    },
  };
}
