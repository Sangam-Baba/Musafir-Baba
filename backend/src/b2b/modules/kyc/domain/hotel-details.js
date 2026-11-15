// @ts-check
/**
 * Hotel business details and the cross-checks a reviewer would otherwise do by hand (plan Stage 02
 * §3.1–3.2, D31). Pure: returns normalised details or throws one error listing every problem.
 */
import { DomainError } from '../../../core/errors.js';
import { normaliseEmail, normalisePhone } from '../../identity/index.js';
import { isStateCode, isValidGstin, isValidPan, isValidPin, normaliseTaxId, panHolderType, panOfGstin } from './tax-ids.js';

/**
 * @typedef {{ legalName: string, contactName: string, mobile: string, email: string, gstRegistered: boolean, gstin: string | null,
 *   pan: string, address: { line1: string, line2: string | null, city: string, stateCode: string, pin: string },
 *   propertyCount: number, termsVersion: string }} HotelDetails
 */

/** @typedef {{ path: string, code: string }} FieldError */

/**
 * PAN format; for GST-registered hotels the GSTIN checksum, its state = the address state, and the
 * PAN inside the GSTIN = the PAN given.
 * @param {{ pan: string, gstin: string | null, stateCode: string, gstRegistered: boolean }} v
 * @returns {FieldError[]}
 */
function taxIdErrors(v) {
  /** @type {FieldError[]} */
  const errors = [];
  if (!isValidPan(v.pan)) errors.push({ path: 'pan', code: 'PAN_INVALID' });
  if (!v.gstRegistered) return errors;
  if (!v.gstin || !isValidGstin(v.gstin)) return [...errors, { path: 'gstin', code: 'GSTIN_INVALID' }];
  if (v.gstin.slice(0, 2) !== v.stateCode) errors.push({ path: 'gstin', code: 'GSTIN_STATE_MISMATCH' });
  if (isValidPan(v.pan) && panOfGstin(v.gstin) !== v.pan) errors.push({ path: 'pan', code: 'PAN_NOT_IN_GSTIN' });
  return errors;
}

/**
 * @param {Record<string, any>} input already shape-checked by zod (strings, booleans, numbers)
 * @returns {HotelDetails}
 */
export function validateHotelDetails(input) {
  /** @type {FieldError[]} */
  const errors = [];
  const tryNormalise = (/** @type {string} */ path, /** @type {() => string} */ fn) => {
    try {
      return fn();
    } catch {
      errors.push({ path, code: `${path.split('.').pop()?.toUpperCase()}_INVALID` });
      return '';
    }
  };
  const pan = normaliseTaxId(String(input.pan ?? ''));
  const gstin = input.gstRegistered ? normaliseTaxId(String(input.gstin ?? '')) : null;
  const stateCode = String(input.address?.stateCode ?? '');
  const pin = String(input.address?.pin ?? '').trim();
  errors.push(...taxIdErrors({ pan, gstin, stateCode, gstRegistered: Boolean(input.gstRegistered) }));
  if (!isStateCode(stateCode)) errors.push({ path: 'address.stateCode', code: 'STATE_INVALID' });
  if (!isValidPin(pin)) errors.push({ path: 'address.pin', code: 'PIN_INVALID' });
  if (input.termsAccepted !== true) errors.push({ path: 'termsAccepted', code: 'TERMS_NOT_ACCEPTED' });
  const mobile = tryNormalise('mobile', () => normalisePhone(String(input.mobile ?? '')));
  const email = tryNormalise('email', () => normaliseEmail(String(input.email ?? '')));
  if (errors.length > 0) throw new DomainError('KYC_DETAILS_INVALID', { errors });

  return {
    legalName: String(input.legalName).trim(),
    contactName: String(input.contactName).trim(),
    mobile,
    email,
    gstRegistered: Boolean(input.gstRegistered),
    gstin,
    pan,
    address: {
      line1: String(input.address.line1).trim(),
      line2: input.address.line2 ? String(input.address.line2).trim() : null,
      city: String(input.address.city).trim(),
      stateCode,
      pin,
    },
    propertyCount: Number(input.propertyCount),
    termsVersion: String(input.termsVersion),
  };
}

/** @typedef {'GST_UNREGISTERED' | 'DUPLICATE_GSTIN' | 'PERSONAL_PAN_FOR_BUSINESS'} RiskFlag */

/**
 * Reasons an application needs a second approver (maker–checker, plan §3.6).
 * @param {HotelDetails} details
 * @param {{ duplicateGstin: boolean }} facts
 * @returns {{ flags: RiskFlag[], highRisk: boolean }}
 */
export function assessRisk(details, facts) {
  /** @type {RiskFlag[]} */
  const flags = [];
  if (!details.gstRegistered) flags.push('GST_UNREGISTERED');
  if (facts.duplicateGstin) flags.push('DUPLICATE_GSTIN');
  if (
    details.gstRegistered &&
    details.gstin &&
    panHolderType(details.pan) === 'P' &&
    /\b(pvt|private|limited|ltd|llp)\b/i.test(details.legalName)
  ) {
    flags.push('PERSONAL_PAN_FOR_BUSINESS');
  }
  return { flags, highRisk: flags.length > 0 };
}
