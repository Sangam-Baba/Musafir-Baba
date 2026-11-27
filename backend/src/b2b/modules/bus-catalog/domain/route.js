// @ts-check
/**
 * Routes and schedules — pure rules (plan Stage 18 B3, §5).
 * A route is an ordered list of stops `S0 … Sn` with a time and a day offset (0 = the departure day, 1 = next day …).
 * Legs are `0 … n-1` (S0→S1, S1→S2 …); a trip from stop a to stop b needs legs a … b-1, written as a bit mask.
 * A route has at most 31 stops (30 legs) so every mask stays a positive int32 — MongoDB's `$bit` / `$bitsAllClear`
 * need whole 32-bit values (a 31st leg would be sent as a double and refused). Bus times are Indian time (UTC+05:30).
 */
export const MAX_STOPS = 31;
export const MAX_DAY_OFFSET = 3;
export const WEEKDAYS = /** @type {const} */ ([0, 1, 2, 3, 4, 5, 6]); // 0 = Sunday
const IST_OFFSET_MIN = 330;

/** @typedef {{ stopId: string, dayOffset: number, time: string, boarding: boolean, dropping: boolean }} RouteStop */
/** @typedef {{ path: string, code: string }} Problem */

/** Minutes from midnight of the departure day. @param {{ dayOffset: number, time: string }} s */
export const minutesOf = (s) => s.dayOffset * 1440 + Number(s.time.slice(0, 2)) * 60 + Number(s.time.slice(3, 5));

/** One stop's own problems. @param {RouteStop} s @param {string} p @param {Problem[]} out */
function checkStop(s, p, out) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(s.time))) out.push({ path: `${p}.time`, code: 'TIME_INVALID' });
  if (!Number.isInteger(s.dayOffset) || s.dayOffset < 0 || s.dayOffset > MAX_DAY_OFFSET)
    out.push({ path: `${p}.dayOffset`, code: 'DAY_OFFSET_INVALID' });
  if (!s.boarding && !s.dropping) out.push({ path: p, code: 'STOP_UNUSED' });
}

/**
 * Every problem with a route's stops at once: 2–31 stops, no stop twice, times strictly later at each stop, the first
 * stop allows boarding and the last allows dropping.
 * @param {RouteStop[]} stops
 * @returns {Problem[]}
 */
export function checkRoute(stops) {
  /** @type {Problem[]} */
  const out = [];
  if (!Array.isArray(stops) || stops.length < 2 || stops.length > MAX_STOPS) return [{ path: 'stops', code: 'STOPS_TWO_TO_31' }];
  const seen = new Set();
  stops.forEach((s, i) => {
    const p = `stops.${i}`;
    if (seen.has(s.stopId)) out.push({ path: `${p}.stopId`, code: 'STOP_REPEATED' });
    seen.add(s.stopId);
    checkStop(s, p, out);
  });
  if (out.some((x) => x.code === 'TIME_INVALID' || x.code === 'DAY_OFFSET_INVALID')) return out;
  for (let i = 1; i < stops.length; i += 1)
    if (minutesOf(/** @type {RouteStop} */ (stops[i])) <= minutesOf(/** @type {RouteStop} */ (stops[i - 1])))
      out.push({ path: `stops.${i}.time`, code: 'TIMES_NOT_IN_ORDER' });
  if (!stops[0]?.boarding) out.push({ path: 'stops.0', code: 'FIRST_STOP_MUST_BOARD' });
  if (!stops[stops.length - 1]?.dropping) out.push({ path: `stops.${stops.length - 1}`, code: 'LAST_STOP_MUST_DROP' });
  return out;
}

/** The legs a journey from stop index `from` to stop index `to` uses, as a bit mask. @param {number} from @param {number} to */
export function legMask(from, to) {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to <= from || to >= MAX_STOPS) throw new RangeError('legs');
  let mask = 0;
  for (let leg = from; leg < to; leg += 1) mask |= 1 << leg;
  return mask;
}

/** Day of the week (0 = Sunday) of a `YYYY-MM-DD` date. @param {string} date */
export const weekdayOf = (date) => new Date(`${date}T00:00:00Z`).getUTCDay();

/** `date` plus `days`. @param {string} date @param {number} days */
export function addDays(date, days) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * The departure dates a schedule runs on within `[today, today + horizon)`: its weekdays, between its first and last
 * day (both included).
 * @param {{ weekdays: number[], validFrom: string, validTo: string | null }} s @param {string} today @param {number} horizon
 */
export function tripDates(s, today, horizon) {
  const out = [];
  for (let i = 0; i < horizon; i += 1) {
    const date = addDays(today, i);
    if (date < s.validFrom) continue;
    if (s.validTo && date > s.validTo) break;
    if (s.weekdays.includes(weekdayOf(date))) out.push(date);
  }
  return out;
}

/** The moment (UTC `Date`) a stop is reached on a trip departing on `date` (Indian time). @param {string} date @param {{ dayOffset: number, time: string }} s */
export function instantOf(date, s) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + (minutesOf(s) - IST_OFFSET_MIN) * 60_000);
}
