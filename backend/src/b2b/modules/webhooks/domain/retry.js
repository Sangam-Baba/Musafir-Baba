// @ts-check
/** Webhook retries (`06-api-and-events.md` §6) — pure: when the next try is due, and when an endpoint is switched off. */
const M = 60_000;
export const RETRY_DELAYS_MS = /** @type {const} */ ([M, 5 * M, 15 * M, 60 * M, 3 * 60 * M, 6 * 60 * M, 12 * 60 * M]);
export const DISABLE_AFTER_MS = 24 * 60 * M;

/** After `failedTries` failed tries (1 = the first send failed): the next try's time, or null when out of retries. @param {number} failedTries @param {Date} now */
export function nextTryAt(failedTries, now) {
  const delay = RETRY_DELAYS_MS[failedTries - 1];
  return delay === undefined ? null : new Date(now.getTime() + delay);
}

/** Has the endpoint been failing long enough to switch it off? @param {Date | null} failingSince @param {Date} now */
export const shouldDisable = (failingSince, now) =>
  Boolean(failingSince && now.getTime() - new Date(failingSince).getTime() >= DISABLE_AFTER_MS);
