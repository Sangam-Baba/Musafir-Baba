// @ts-check
/** Room type rules that need no database (plan Stage 03 §3.3). */
import { DomainError } from '../../../core/errors.js';

export const MAX_ROOM_TYPES_PER_PROPERTY = 50;

/**
 * Occupancy must add up: at least one adult and one bed; the most guests ≥ the most adults and ≤ adults +
 * children; extra beds only with a number. All problems reported at once.
 * @param {{ maxAdults: number, maxChildren: number, maxOccupancy: number, beds: { count: number }[],
 *   extraBeds: { allowed: boolean, max: number } }} r
 */
export function assertOccupancy(r) {
  /** @type {{ path: string, code: string }[]} */
  const errors = [];
  if (r.maxAdults < 1) errors.push({ path: 'maxAdults', code: 'AT_LEAST_ONE_ADULT' });
  if (r.maxOccupancy < r.maxAdults) errors.push({ path: 'maxOccupancy', code: 'OCCUPANCY_BELOW_ADULTS' });
  if (r.maxOccupancy > r.maxAdults + r.maxChildren) errors.push({ path: 'maxOccupancy', code: 'OCCUPANCY_ABOVE_ADULTS_AND_CHILDREN' });
  if (r.beds.reduce((n, b) => n + b.count, 0) < 1) errors.push({ path: 'beds', code: 'AT_LEAST_ONE_BED' });
  if (r.extraBeds.allowed && r.extraBeds.max < 1) errors.push({ path: 'extraBeds.max', code: 'EXTRA_BEDS_NUMBER_REQUIRED' });
  if (errors.length > 0) throw new DomainError('ROOM_TYPE_INVALID', { errors });
}

/** Case- and space-insensitive key for "same name in this property". @param {string} name */
export const nameKey = (name) => name.trim().toLowerCase().replace(/\s+/g, ' ');
