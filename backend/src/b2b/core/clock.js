// @ts-check
/**
 * The only place B2B code reads the current time. Everything else receives a Clock,
 * so tests can use a fixed time (docs/plan/10-coding-standards.md).
 */

/** @typedef {{ now: () => Date }} Clock */

/** @type {Clock} */
export const systemClock = { now: () => new Date() };

/**
 * @param {Date} at
 * @returns {Clock}
 */
export function fixedClock(at) {
  return { now: () => new Date(at.getTime()) };
}
