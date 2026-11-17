// @ts-check
/**
 * Stay dates are calendar strings 'YYYY-MM-DD' (AGENTS.md): no time, no time zone. A stay's nights are
 * [checkIn, checkOut). "Today" is the property's own local date (its IANA time zone), from the injected clock.
 */
import { DomainError } from '../../../core/errors.js';

export const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const CALENDAR_WINDOW_DAYS = 365;
const DAY_MS = 86_400_000;

/** @param {string} d */
const utc = (d) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));

/** A real calendar date in the expected format. @param {unknown} d @returns {d is string} */
export function isDate(d) {
  if (typeof d !== 'string' || !DATE.test(d)) return false;
  return new Date(utc(d)).toISOString().slice(0, 10) === d;
}

/** @param {string} d @param {number} n */
export const addDays = (d, n) => new Date(utc(d) + n * DAY_MS).toISOString().slice(0, 10);

/** Whole days from `a` to `b` (b − a). @param {string} a @param {string} b */
export const daysBetween = (a, b) => Math.round((utc(b) - utc(a)) / DAY_MS);

/** 0 = Sunday … 6 = Saturday. @param {string} d */
export const weekday = (d) => new Date(utc(d)).getUTCDay();

/** The nights [from, to) — `to` excluded. Refuses ranges the wrong way round or longer than `max`. @param {string} from @param {string} to @param {number} [max] */
export function nights(from, to, max = CALENDAR_WINDOW_DAYS + 1) {
  if (!isDate(from) || !isDate(to)) throw new DomainError('DATE_INVALID');
  const n = daysBetween(from, to);
  if (n <= 0) throw new DomainError('DATE_RANGE_EMPTY');
  if (n > max) throw new DomainError('DATE_RANGE_TOO_LONG', { maxDays: max });
  return Array.from({ length: n }, (_, i) => addDays(from, i));
}

/** Today's date where the property is. @param {string} timeZone @param {Date} now */
export function todayIn(timeZone, now) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
