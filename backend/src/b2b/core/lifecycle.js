// @ts-check
/**
 * Start/stop helpers shared by the B2B worker and realtime processes
 * (separate containers from the same backend image — docs/plan/12-… §2, B4).
 */
import { disconnectB2BDatabase } from './db/connection.js';

/** @typedef {() => Promise<void> | void} StopHook */

/**
 * Stops cleanly on SIGTERM/SIGINT: runs hooks in order, closes the database, exits.
 * @param {string} name
 * @param {StopHook[]} hooks
 */
export function handleShutdown(name, hooks) {
  let stopping = false;
  const stop = async (/** @type {string} */ signal) => {
    if (stopping) return;
    stopping = true;
    console.log(`[b2b:${name}] ${signal} received, stopping`);
    try {
      for (const hook of hooks) await hook();
      await disconnectB2BDatabase();
      process.exit(0);
    } catch (error) {
      console.error(`[b2b:${name}] error while stopping:`, error);
      process.exit(1);
    }
  };
  process.on('SIGTERM', () => void stop('SIGTERM'));
  process.on('SIGINT', () => void stop('SIGINT'));
}

/**
 * @param {string} name
 * @param {unknown} error
 * @returns {never}
 */
export function failStartup(name, error) {
  console.error(`[b2b:${name}] failed to start:`, error instanceof Error ? error.message : error);
  process.exit(1);
}
