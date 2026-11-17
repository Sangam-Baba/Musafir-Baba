// @ts-check
/**
 * Property rules that need no database (plan Stage 03 §3.2): the wizard's sections and when each counts as
 * done, the "pin inside the city" check, check-in / check-out times, time zones, and plain-text descriptions.
 */
import { DomainError } from '../../../core/errors.js';

export const SECTIONS = /** @type {const} */ (['basic', 'location', 'contacts', 'times', 'policies', 'amenities']);
/** @typedef {typeof SECTIONS[number]} Section */

export const EDITABLE_STATUSES = /** @type {const} */ (['DRAFT', 'CHANGES_REQUESTED']);
export const DEFAULT_TIME_ZONE = 'Asia/Kolkata';

/** Great-circle distance in km. @param {[number, number]} a [lng, lat] @param {[number, number]} b [lng, lat] */
export function distanceKm(a, b) {
  const rad = (/** @type {number} */ d) => (d * Math.PI) / 180;
  const dLat = rad(b[1] - a[1]);
  const dLng = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * The pin must be within the city's radius (catches a pin dropped in the wrong place or swapped lat / lng).
 * @param {{ lat: number, lng: number }} pin
 * @param {{ lat: number, lng: number, radiusKm: number, name: string }} city
 */
export function assertPinInCity(pin, city) {
  const km = distanceKm([pin.lng, pin.lat], [city.lng, city.lat]);
  if (km > city.radiusKm)
    throw new DomainError('LOCATION_OUTSIDE_CITY', { city: city.name, distanceKm: Math.round(km), radiusKm: city.radiusKm });
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
/** @param {string} t */
export const isTime = (t) => TIME.test(t);

/** An IANA time zone the runtime can use (accepts aliases such as Asia/Kolkata = Asia/Calcutta). @param {string} zone */
export function isTimeZone(zone) {
  if (!/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$/.test(zone)) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** Plain text: control characters (except new lines) removed, runs of blank lines collapsed. @param {string} text */
export function plainText(text) {
  return Array.from(text, (ch) => (ch === '\n' || ch.charCodeAt(0) >= 32 ? ch : ' '))
    .join('')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Which wizard sections are complete.
 * @param {any} p a stored property
 * @returns {Record<Section, boolean>}
 */
export function sectionsDone(p) {
  const all = (/** @type {unknown[]} */ ...values) => values.every(Boolean);
  return {
    basic: all(p.name, p.propertyTypeKey, String(p.description ?? '').length >= 50),
    location: all(p.cityId, p.address?.line1, p.address?.pin, p.location?.coordinates?.length === 2),
    contacts: all(p.contacts?.email, p.contacts?.phone),
    times: all(p.checkInTime, p.checkOutTime, p.timeZone),
    policies: Boolean(p.policies),
    amenities: (p.amenities ?? []).length > 0,
  };
}
