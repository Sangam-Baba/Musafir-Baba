// @ts-check
/**
 * Possible duplicate listings (plan Stage 03 §3.5): another property within 200 m whose name is the same or
 * close — ignoring case, punctuation and common words ("hotel", "resort", "the"…). The reviewer decides; nothing
 * is merged automatically. Pure.
 */

export const DUPLICATE_RADIUS_M = 200;
const COMMON = new Set([
  'hotel',
  'hotels',
  'resort',
  'resorts',
  'the',
  'inn',
  'stay',
  'stays',
  'and',
  'by',
  'a',
  'of',
  'grand',
  'residency',
  'homestay',
]);

/** @param {string} name @returns {string[]} */
export function nameTokens(name) {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t && !COMMON.has(t));
}

/**
 * Same or close names: equal tokens, one name inside the other, or at least half of the words shared.
 * @param {string} a
 * @param {string} b
 */
export function namesSimilar(a, b) {
  const x = nameTokens(a);
  const y = nameTokens(b);
  if (x.length === 0 || y.length === 0) return a.trim().toLowerCase() === b.trim().toLowerCase();
  const joinedX = x.join(' ');
  const joinedY = y.join(' ');
  if (joinedX === joinedY || joinedX.includes(joinedY) || joinedY.includes(joinedX)) return true;
  const shared = x.filter((t) => y.includes(t)).length;
  return shared / Math.max(new Set([...x, ...y]).size, 1) >= 0.5;
}
