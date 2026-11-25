// @ts-check
/**
 * Bus operator business details (plan Stage 18 B1): the hotel checks of Stage 02 (GSTIN / PAN checksums and
 * cross-checks, state, PIN, mobile, email, terms, optional business fields, the same risk rules) with the number of
 * buses (`fleetSize`, 1–1000) instead of the number of properties. Pure: returns normalised details or throws one
 * error listing every problem.
 */
import { DomainError } from '../../../core/errors.js';
import { validateHotelDetails } from './hotel-details.js';

/** @typedef {Omit<import('./hotel-details.js').HotelDetails, 'propertyCount'> & { fleetSize: number }} OperatorDetails */

/**
 * @param {Record<string, any>} input already shape-checked by zod
 * @returns {OperatorDetails}
 */
export function validateOperatorDetails(input) {
  const fleetSize = Number(input.fleetSize);
  if (!Number.isInteger(fleetSize) || fleetSize < 1 || fleetSize > 1000)
    throw new DomainError('OPERATOR_DETAILS_INVALID', { problems: [{ path: 'fleetSize', code: 'FLEET_SIZE_INVALID' }] });
  const rest = { ...input };
  delete rest.fleetSize;
  const { propertyCount, ...details } = validateHotelDetails({ ...rest, propertyCount: 1 });
  void propertyCount; // hotels only
  return { ...details, fleetSize };
}
