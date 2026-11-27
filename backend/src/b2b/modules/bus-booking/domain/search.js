// @ts-check
/**
 * Bus search rules (plan Stage 18 B5) — pure. A trip serves "city A → city B on a date" when it has a boarding point
 * in A reached on that date (Indian time, not yet passed) and a later dropping point in B — so part of a route counts
 * (Gurugram → Jaipur on a Delhi → Jaipur bus), and a bus that left the day before can still pick up on the date.
 */
const IST_MS = 330 * 60_000;

/** Indian date of a moment. @param {Date | string} at */
export const istDate = (at) => new Date(new Date(at).getTime() + IST_MS).toISOString().slice(0, 10);
/** Indian time of day "HH:MM". @param {Date | string} at */
export const istTime = (at) => new Date(new Date(at).getTime() + IST_MS).toISOString().slice(11, 16);

/**
 * @typedef {{ stopId: string, cityId: string, name: string, at: Date | string, boarding: boolean, dropping: boolean }} TripStop
 * @typedef {{ idx: number, stopId: string, name: string, at: Date | string }} Point
 */

/**
 * The boarding points in `fromCityId` on `date` (not yet passed) and the dropping points in `toCityId` after the first
 * of them. Null when the trip doesn't serve the journey.
 * @param {TripStop[]} stops @param {{ fromCityId: string, toCityId: string, date: string, now: Date }} q
 * @returns {{ boarding: Point[], dropping: Point[] } | null}
 */
export function journeyOn(stops, q) {
  const point = (/** @type {TripStop} */ s, /** @type {number} */ idx) => ({ idx, stopId: s.stopId, name: s.name, at: s.at });
  const boarding = stops.map(point).filter((p, i) => {
    const s = /** @type {TripStop} */ (stops[i]);
    return s.cityId === q.fromCityId && s.boarding && istDate(s.at) === q.date && new Date(s.at).getTime() > q.now.getTime();
  });
  const first = boarding[0];
  if (!first) return null;
  const dropping = stops.map(point).filter((p, i) => i > first.idx && stops[i]?.cityId === q.toCityId && stops[i]?.dropping);
  return dropping.length ? { boarding, dropping } : null;
}

/**
 * @typedef {{ acType?: 'AC' | 'NON_AC', seatType?: string, departFrom?: string, departTo?: string, maxPricePaise?: number,
 *   operatorOrgId?: string }} SearchFilters
 * @typedef {{ operatorOrgId: string, acType: string, seatTypes: string[], departAt: Date | string, fromPricePaise: number }} FilterableResult
 */

/** Does a result pass the filters? @param {FilterableResult} r @param {SearchFilters} f */
export function passes(r, f) {
  const t = istTime(r.departAt);
  if (f.acType && r.acType !== f.acType) return false;
  if (f.seatType && !r.seatTypes.includes(f.seatType)) return false;
  if (f.departFrom && t < f.departFrom) return false;
  if (f.departTo && t > f.departTo) return false;
  if (f.maxPricePaise !== undefined && r.fromPricePaise > f.maxPricePaise) return false;
  return !(f.operatorOrgId && r.operatorOrgId !== f.operatorOrgId);
}

/** Departure first (default) or cheapest first; ties by departure. @param {'departure' | 'price'} by */
export const sorter = (by) => (/** @type {FilterableResult} */ a, /** @type {FilterableResult} */ b) =>
  (by === 'price' ? a.fromPricePaise - b.fromPricePaise : 0) || new Date(a.departAt).getTime() - new Date(b.departAt).getTime();
