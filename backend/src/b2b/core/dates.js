// @ts-check
/**
 * Stay dates are calendar strings 'YYYY-MM-DD' (no time, no time zone) — a night is
 * identified by its check-in calendar date. Deadlines (free cancellation, payment) are
 * instants computed in the HOTEL's time zone. (docs/plan/02-… §6, 04-domain-model.md)
 */
import { DomainError } from './errors.js';

/** @typedef {string & { readonly __brand: 'StayDate' }} StayDate */

const STAY_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_NIGHTS = 30;

/** @param {unknown} value @returns {value is StayDate} */
export function isStayDate(value) {
  if (typeof value !== 'string') return false;
  const m = STAY_DATE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10) === value;
}

/** @param {unknown} value @returns {StayDate} */
export function toStayDate(value) {
  if (!isStayDate(value)) throw new DomainError('INVALID_STAY_DATE', { value: String(value) });
  return value;
}

/** @param {StayDate} date @param {number} days @returns {StayDate} */
export function addDays(date, days) {
  const t = Date.parse(`${date}T00:00:00Z`) + days * DAY_MS;
  return /** @type {StayDate} */ (new Date(t).toISOString().slice(0, 10));
}

/** @param {StayDate} a @param {StayDate} b @returns {number} whole days from a to b */
export function daysBetween(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
}

/**
 * Nights of a stay: [checkIn, checkOut). A 3-night stay returns 3 dates.
 * @param {StayDate} checkIn @param {StayDate} checkOut @returns {StayDate[]}
 */
export function nightsOf(checkIn, checkOut) {
  const nights = daysBetween(checkIn, checkOut);
  if (nights < 1) throw new DomainError('INVALID_STAY', { reason: 'check-out must be after check-in' });
  if (nights > MAX_NIGHTS) throw new DomainError('INVALID_STAY', { reason: `at most ${MAX_NIGHTS} nights` });
  return Array.from({ length: nights }, (_, i) => addDays(checkIn, i));
}

/**
 * Calendar date "today" in a time zone (e.g. the hotel's).
 * @param {import('./clock.js').Clock} clock @param {string} timeZone @returns {StayDate}
 */
export function todayIn(clock, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(clock.now());
  return toStayDate(parts);
}

/**
 * The instant when local `time` (HH:mm) happens on `date` in `timeZone`.
 * Example: free cancellation until 12:00 hotel time, 2 days before check-in →
 * hotelDeadline(addDays(checkIn, -2), '12:00', 'Asia/Kolkata').
 * @param {StayDate} date @param {string} time @param {string} timeZone @returns {Date}
 */
export function hotelDeadline(date, time, timeZone) {
  const m = LOCAL_TIME.exec(time);
  if (!m) throw new DomainError('INVALID_LOCAL_TIME', { time });
  const asUtc = Date.parse(`${date}T${time}:00Z`);
  const first = asUtc - offsetMs(asUtc, timeZone);
  return new Date(asUtc - offsetMs(first, timeZone)); // second pass handles DST edges
}

/** Offset of `timeZone` from UTC at instant `t`, in ms. @param {number} t @param {string} timeZone */
function offsetMs(t, timeZone) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  /** @type {Record<string, number>} */
  const p = {};
  for (const part of f.formatToParts(new Date(t))) p[part.type] = Number(part.value);
  const local = Date.UTC(p.year ?? 0, (p.month ?? 1) - 1, p.day ?? 1, p.hour ?? 0, p.minute ?? 0, p.second ?? 0);
  return local - Math.floor(t / 1000) * 1000;
}
