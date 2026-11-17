// @ts-check
/**
 * Field-level encryption for the KYC application (plan Stage 02 §3.3, security §8): the PAN and the bank
 * account number are stored sealed (AES-256-GCM, core/crypto) and everywhere else only their last 4
 * characters appear. The seal is bound to the organisation, so a value copied into another org's
 * application can't be opened. Key: B2B_FILE_KEY (falls back to B2B_AUTH_SECRET), like the documents.
 */
import { seal, unseal } from '../../core/crypto.js';
import { ServiceUnavailableError } from '../../core/errors.js';
import { lastFour } from './domain/bank-details.js';

/** @param {string | undefined} key */
function requireKey(key) {
  if (!key) throw new ServiceUnavailableError('KYC_ENCRYPTION_NOT_CONFIGURED');
  return key;
}

/** @param {'pan' | 'bank'} field @param {string} orgId */
const purposeOf = (field, orgId) => `kyc-${field}:${orgId}`;

/**
 * Details as stored: no PAN, only its last 4; the sealed PAN beside it.
 * @param {import('./domain/hotel-details.js').HotelDetails} details
 * @param {{ orgId: string, key: string | undefined }} options
 */
export function protectDetails(details, options) {
  const { pan, ...rest } = details;
  return {
    details: { ...rest, panLast4: lastFour(pan) },
    panSealed: seal(pan, { secret: requireKey(options.key), purpose: purposeOf('pan', options.orgId) }),
  };
}

/**
 * @param {import('./domain/bank-details.js').BankDetails} bank
 * @param {{ orgId: string, key: string | undefined }} options
 */
export function protectBank(bank, options) {
  return {
    bank: { holderName: bank.holderName, ifsc: bank.ifsc, accountLast4: lastFour(bank.accountNumber) },
    accountSealed: seal(bank.accountNumber, { secret: requireKey(options.key), purpose: purposeOf('bank', options.orgId) }),
  };
}

/**
 * Opens the sealed values (reviewers only — the caller checks the permission and records the view).
 * @param {{ panSealed?: string | null, accountSealed?: string | null }} sealed
 * @param {{ orgId: string, key: string | undefined }} options
 * @returns {{ pan: string | null, accountNumber: string | null }}
 */
export function revealSealed(sealed, options) {
  const secret = requireKey(options.key);
  const open = (/** @type {string | null | undefined} */ v, /** @type {'pan' | 'bank'} */ field) =>
    v ? String(unseal(v, { secret, purpose: purposeOf(field, options.orgId) })) : null;
  return { pan: open(sealed.panSealed, 'pan'), accountNumber: open(sealed.accountSealed, 'bank') };
}
