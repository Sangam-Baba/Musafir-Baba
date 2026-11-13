// @ts-check
/**
 * The B2B code's OWN Mongoose instance and connection to the existing database.
 *
 * Why not the default `mongoose` import: the existing app registers a global audit
 * plugin on it (src/config/mongoosePluginInit.js) and owns its default connection.
 * A separate instance keeps B2B models away from both (docs/plan/12-… §2, D3).
 *
 * Settings: no automatic index/collection creation (migrations do that), capped pool,
 * strict queries. No transactions or change streams are used anywhere (D28).
 */
import mongoose from 'mongoose';

/** Separate instance: global plugins and models of the existing app are not shared. */
export const b2bMongoose = new mongoose.Mongoose();
b2bMongoose.set('strictQuery', true);
b2bMongoose.set('autoIndex', false);
b2bMongoose.set('autoCreate', false);

/** 'api' = inside the existing backend (routes + background work), 'cli' = one-off scripts such as b2b:migrate. */
/** @typedef {'api' | 'cli' | 'test'} ProcessRole */

/** @type {Record<ProcessRole, number>} */
const POOL_SIZE = { api: 10, cli: 2, test: 5 };

/**
 * @param {string} uri
 * @param {ProcessRole} role
 * @returns {Promise<typeof b2bMongoose>}
 */
export async function connectB2BDatabase(uri, role) {
  if (b2bMongoose.connection.readyState === 1) return b2bMongoose;
  return b2bMongoose.connect(uri, {
    maxPoolSize: POOL_SIZE[role],
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    appName: `musafirbaba-b2b-${role}`,
  });
}

/** @returns {Promise<void>} */
export async function disconnectB2BDatabase() {
  await b2bMongoose.disconnect();
}

/** @returns {'up' | 'down' | 'connecting'} */
export function databaseState() {
  const state = b2bMongoose.connection.readyState;
  if (state === 1) return 'up';
  if (state === 2) return 'connecting';
  return 'down';
}
