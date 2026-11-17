// @ts-check
/**
 * Pure rules for business users (plan Stage 01 §3.1, §7). No Express, no Mongoose.
 * - Email: trimmed, lowercase, unique.
 * - Phone: E.164 (`+919876543210`). A 10-digit Indian mobile number gets +91.
 * - Password: 10–72 bytes (bcrypt reads only the first 72 bytes), not a common password,
 *   not containing the email name.
 * - Lockout after repeated failed logins: 5 → 15 min, 10 → 1 h, 15 or more → 24 h.
 */
import { DomainError } from '../../../core/errors.js';

const EMAIL = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
const E164 = /^\+[1-9]\d{7,14}$/;
const INDIAN_MOBILE = /^[6-9]\d{9}$/;
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_BYTES = 72;

const COMMON_PASSWORDS = new Set([
  'password123',
  'password1234',
  '1234567890',
  '12345678910',
  'qwertyuiop',
  'iloveyou123',
  'welcome123',
  'admin12345',
  'musafirbaba',
  'musafirbaba1',
  'musafirbaba123',
  'letmein1234',
  'abcdefghij',
  '0987654321',
  '1111111111',
  'qwerty12345',
]);

/** @param {string} raw @returns {string} */
export function normaliseEmail(raw) {
  const email = raw.trim().toLowerCase();
  if (email.length > 254 || !EMAIL.test(email)) throw new DomainError('EMAIL_INVALID');
  return email;
}

/** @param {string} raw @returns {string} E.164 */
export function normalisePhone(raw) {
  const compact = raw.replace(/[\s()-]/g, '');
  const withCountry = INDIAN_MOBILE.test(compact) ? `+91${compact}` : compact.startsWith('00') ? `+${compact.slice(2)}` : compact;
  if (!E164.test(withCountry)) throw new DomainError('PHONE_INVALID');
  return withCountry;
}

/**
 * Login identifier → which field to look up.
 * @param {string} raw email or phone
 * @returns {{ field: 'email' | 'phone', value: string }}
 */
export function parseLoginIdentifier(raw) {
  return raw.includes('@') ? { field: 'email', value: normaliseEmail(raw) } : { field: 'phone', value: normalisePhone(raw) };
}

/**
 * @param {string} password
 * @param {{ email?: string | undefined }} [context]
 */
export function assertPasswordAllowed(password, context = {}) {
  if (password.length < PASSWORD_MIN_LENGTH) throw new DomainError('PASSWORD_TOO_SHORT', { min: PASSWORD_MIN_LENGTH });
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES)
    throw new DomainError('PASSWORD_TOO_LONG', { maxBytes: PASSWORD_MAX_BYTES });
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower) || /^(.)\1+$/.test(password)) throw new DomainError('PASSWORD_TOO_COMMON');
  const name = context.email?.split('@')[0]?.toLowerCase();
  if (name && name.length >= 4 && lower.includes(name)) throw new DomainError('PASSWORD_CONTAINS_EMAIL');
}

/** @typedef {{ count: number, lockedUntil: Date | null }} LoginFailures */

/**
 * How long an account is locked after its `count`-th failed login in a row (0 = not locked).
 * @param {number} count
 * @returns {number} milliseconds
 */
export function lockDurationMs(count) {
  if (count >= 15) return 24 * 60 * 60_000;
  if (count >= 10) return 60 * 60_000;
  if (count >= 5) return 15 * 60_000;
  return 0;
}

/**
 * @param {LoginFailures | undefined | null} failures
 * @param {Date} now
 */
export const isLocked = (failures, now) => Boolean(failures?.lockedUntil && failures.lockedUntil.getTime() > now.getTime());
