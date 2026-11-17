// @ts-check
/**
 * Which edits to a live listing need MusafirBaba's approval (plan Stage 03 §3.5, §6): the name, star rating,
 * address / location (what guests and the duplicate check rely on), and the check-in time and time zone (they
 * move cancellation deadlines). Everything else is published directly. Only fields that actually change count.
 * Pure.
 */

/** @type {Readonly<Record<string, readonly string[]>>} stored field names per wizard section */
export const SENSITIVE_FIELDS = Object.freeze({
  basic: ['name', 'starRating'],
  location: ['cityId', 'areaId', 'stateCode', 'address', 'location'],
  times: ['checkInTime', 'timeZone'],
});

export const LIVE_STATUSES = /** @type {const} */ (['LIVE', 'SUSPENDED']);

/** @param {unknown} a @param {unknown} b */
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Splits a section save into what goes live now and what waits for approval (unchanged fields dropped).
 * @param {string} section
 * @param {Record<string, unknown>} set the prepared values to store
 * @param {Record<string, any>} current the stored property
 * @returns {{ direct: Record<string, unknown>, sensitive: Record<string, unknown> }}
 */
export function splitChanges(section, set, current) {
  const sensitiveNames = SENSITIVE_FIELDS[section] ?? [];
  /** @type {Record<string, unknown>} */
  const direct = {};
  /** @type {Record<string, unknown>} */
  const sensitive = {};
  for (const [field, value] of Object.entries(set)) {
    if (same(value, current[field])) continue;
    if (sensitiveNames.includes(field)) sensitive[field] = value;
    else direct[field] = value;
  }
  return { direct, sensitive };
}
