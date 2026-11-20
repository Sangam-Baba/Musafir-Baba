// @ts-check
/**
 * B2B client business details (plan Stage 10 §3.1). Exactly the hotel checks of Stage 02 — GSTIN / PAN checksums
 * and cross-checks, state, PIN, mobile, email, terms, optional business fields — without the hotel-only number of
 * properties. Same risk rules (no GST, duplicate GSTIN, personal PAN for a company, PAN not matching the entity type).
 * Pure: returns normalised details or throws one error listing every problem.
 */
import { validateHotelDetails } from './hotel-details.js';

/** @typedef {Omit<import('./hotel-details.js').HotelDetails, 'propertyCount'>} ClientDetails */

/**
 * @param {Record<string, any>} input already shape-checked by zod
 * @returns {ClientDetails}
 */
export function validateClientDetails(input) {
  const { propertyCount, ...details } = validateHotelDetails({ ...input, propertyCount: 0 });
  void propertyCount; // hotels only
  return details;
}
