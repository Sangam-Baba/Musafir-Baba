// @ts-check
/**
 * Indian tax and address identifiers (plan Stage 02 §3.2). Pure.
 * - GSTIN: 2-digit state code + PAN (10) + entity number + 'Z' (default) + check character
 *   (mod-36 checksum over the first 14 characters — catches typos).
 * - PAN: 5 letters, 4 digits, 1 letter; the 4th letter is the holder type (P person, C company, F firm…).
 * - PIN: 6 digits, not starting with 0.
 */

const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const PIN = /^[1-9][0-9]{5}$/;

/** GST state codes (CBIC). 97 = Other Territory, 99 = Centre Jurisdiction (not for business addresses). */
export const GST_STATES = /** @type {const} */ ({
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  10: 'Bihar',
  11: 'Sikkim',
  12: 'Arunachal Pradesh',
  13: 'Nagaland',
  14: 'Manipur',
  15: 'Mizoram',
  16: 'Tripura',
  17: 'Meghalaya',
  18: 'Assam',
  19: 'West Bengal',
  20: 'Jharkhand',
  21: 'Odisha',
  22: 'Chhattisgarh',
  23: 'Madhya Pradesh',
  24: 'Gujarat',
  26: 'Dadra and Nagar Haveli and Daman and Diu',
  27: 'Maharashtra',
  29: 'Karnataka',
  30: 'Goa',
  31: 'Lakshadweep',
  32: 'Kerala',
  33: 'Tamil Nadu',
  34: 'Puducherry',
  35: 'Andaman and Nicobar Islands',
  36: 'Telangana',
  37: 'Andhra Pradesh',
  38: 'Ladakh',
});

/** @param {string} code */
export const isStateCode = (code) => Object.prototype.hasOwnProperty.call(GST_STATES, code);

/**
 * The check character for the first 14 characters of a GSTIN.
 * @param {string} first14
 * @returns {string}
 */
export function gstinCheckChar(first14) {
  let sum = 0;
  for (let i = 0; i < 14; i += 1) {
    const value = CHARS.indexOf(first14.charAt(i)) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(value / 36) + (value % 36);
  }
  return CHARS.charAt((36 - (sum % 36)) % 36);
}

/** @param {string} raw */
export const normaliseTaxId = (raw) => raw.trim().toUpperCase().replace(/\s+/g, '');

/** @param {string} gstin normalised @returns {boolean} */
export function isValidGstin(gstin) {
  return GSTIN.test(gstin) && isStateCode(gstin.slice(0, 2)) && gstinCheckChar(gstin.slice(0, 14)) === gstin.charAt(14);
}

/** @param {string} pan normalised */
export const isValidPan = (pan) => PAN.test(pan);

/** @param {string} pin */
export const isValidPin = (pin) => PIN.test(pin);

/** The PAN inside a GSTIN (characters 3–12). @param {string} gstin */
export const panOfGstin = (gstin) => gstin.slice(2, 12);

/** P = an individual, C = company, F = firm, H = HUF, A = AOP, T = trust, … @param {string} pan */
export const panHolderType = (pan) => pan.charAt(3);
