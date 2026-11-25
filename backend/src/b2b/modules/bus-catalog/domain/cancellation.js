// @ts-check
/**
 * Bus cancellation slabs (plan Stage 18 B7) — pure. An operator's policy is a list of slabs "within N hours of the bus
 * leaving the passenger's boarding stop → charge P % of what was paid for the seat". The strictest slab whose moment
 * has passed applies; before every slab → free. A slab of 720 hours or more works as "any time".
 * Until an operator sets its own, MusafirBaba's default applies (placeholder — owner / operator agreement to confirm).
 */
const HOUR = 3_600_000;
export const MAX_SLABS = 8;

/** @typedef {{ hoursBefore: number, percent: number }} Slab */

/** @type {readonly Slab[]} */
export const DEFAULT_BUS_SLABS = Object.freeze([
  { hoursBefore: 720, percent: 10 },
  { hoursBefore: 24, percent: 25 },
  { hoursBefore: 12, percent: 50 },
  { hoursBefore: 4, percent: 100 },
]);

/** Every problem at once. @param {Slab[]} slabs */
export function slabProblems(slabs) {
  const out = [];
  if (!Array.isArray(slabs) || slabs.length > MAX_SLABS) return [{ field: 'slabs', code: 'SLAB_COUNT_INVALID' }];
  slabs.forEach((s, i) => {
    if (!Number.isInteger(s.hoursBefore) || s.hoursBefore < 0 || s.hoursBefore > 8760)
      out.push({ field: `slabs.${i}.hoursBefore`, code: 'HOURS_INVALID' });
    if (!Number.isInteger(s.percent) || s.percent < 0 || s.percent > 100)
      out.push({ field: `slabs.${i}.percent`, code: 'PERCENT_INVALID' });
  });
  if (new Set(slabs.map((s) => s.hoursBefore)).size !== slabs.length) out.push({ field: 'slabs', code: 'SLAB_REPEATED' });
  const sorted = [...slabs].sort((a, b) => b.hoursBefore - a.hoursBefore);
  for (let i = 1; i < sorted.length; i += 1)
    if (/** @type {Slab} */ (sorted[i]).percent < /** @type {Slab} */ (sorted[i - 1]).percent)
      out.push({ field: 'slabs', code: 'SLABS_MUST_RISE' });
  return out;
}

/**
 * The percent charged at `now` for a bus leaving the boarding stop at `departAt` (0 = free).
 * @param {Slab[]} slabs @param {{ departAt: Date, now: Date }} a
 */
export function chargePercent(slabs, a) {
  const passed = slabs.filter((s) => a.now.getTime() > a.departAt.getTime() - s.hoursBefore * HOUR);
  return passed.reduce((p, s) => Math.max(p, s.percent), 0);
}

/** "Free until 48 h before, then 25 % …" — for screens and tickets. @param {Slab[]} slabs */
export function slabText(slabs) {
  if (!slabs.length) return 'Free cancellation until departure';
  const sorted = [...slabs].sort((a, b) => b.hoursBefore - a.hoursBefore);
  return sorted.map((s) => `${s.hoursBefore >= 720 ? 'any time' : `within ${s.hoursBefore} h of departure`}: ${s.percent} %`).join(' · ');
}
