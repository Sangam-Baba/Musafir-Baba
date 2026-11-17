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
 *   propertyCount: number, termsVersion: string,
 *   tradeName: string | null, entityType: EntityType | null, yearEstablished: number | null,
 *   contactDesignation: string | null, alternateMobile: string | null }} HotelDetails
 */

/** @typedef {{ path: string, code: string }} FieldError */

/** Kinds of business, and the PAN holder type (4th character) each one normally has. */
export const ENTITY_TYPES = Object.freeze({
  PROPRIETORSHIP: ['P'],
  PARTNERSHIP: ['F'],
  LLP: ['F'],
  PRIVATE_LIMITED: ['C'],
  PUBLIC_LIMITED: ['C'],
  HUF: ['H'],
  TRUST_SOCIETY: ['T', 'A'],
  OTHER: [],
});
/** @typedef {keyof typeof ENTITY_TYPES} EntityType */

/** @param {unknown} v @param {number} max */
const optionalText = (v, max) => {
  const t = typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '';
  return t || null;
};

/**
 * The optional business fields (trade name, entity type, year, designation, alternate mobile).
 * @param {Record<string, any>} input
 * @param {FieldError[]} errors
 */
function optionalDetails(input, errors) {
  const entityType = input.entityType ? String(input.entityType) : null;
  if (entityType && !Object.hasOwn(ENTITY_TYPES, entityType)) errors.push({ path: 'entityType', code: 'ENTITY_TYPE_INVALID' });
  const year = input.yearEstablished === undefined || input.yearEstablished === null ? null : Number(input.yearEstablished);
  if (year !== null && (!Number.isInteger(year) || year < 1800 || year > 2100))
    errors.push({ path: 'yearEstablished', code: 'YEAR_INVALID' });
  let alternateMobile = null;
  if (input.alternateMobile) {
    try {
      alternateMobile = normalisePhone(String(input.alternateMobile));
    } catch {
      errors.push({ path: 'alternateMobile', code: 'ALTERNATE_MOBILE_INVALID' });
    }
  }
  return {
    tradeName: optionalText(input.tradeName, 120),
    entityType: /** @type {EntityType | null} */ (entityType),
    yearEstablished: year,
    contactDesignation: optionalText(input.contactDesignation, 80),
    alternateMobile,
  };
}

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
  const extra = optionalDetails(input, errors);
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
    ...extra,
  };
}

/** @typedef {'GST_UNREGISTERED' | 'DUPLICATE_GSTIN' | 'PERSONAL_PAN_FOR_BUSINESS' | 'PAN_DOES_NOT_MATCH_ENTITY_TYPE'} RiskFlag */

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
  const expected = details.entityType ? ENTITY_TYPES[details.entityType] : [];
  if (expected.length > 0 && !expected.includes(panHolderType(details.pan))) flags.push('PAN_DOES_NOT_MATCH_ENTITY_TYPE');
  return { flags, highRisk: flags.length > 0 };
}
