// @ts-check
/**
 * Authenticator-app codes (TOTP, RFC 6238 / HOTP RFC 4226) on node:crypto — no package.
 * Same settings every authenticator app uses by default: SHA-1, 6 digits, 30-second steps.
 * One step of clock drift either way is accepted; replay is blocked by the caller (last used step).
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const TOTP_STEP_SECONDS = 30;
export const TOTP_DIGITS = 6;

/** @param {Buffer} bytes @returns {string} RFC 4648 base32, no padding */
export function base32Encode(bytes) {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

/** @param {string} text @returns {Buffer} */
export function base32Decode(text) {
  const clean = text.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let value = 0;
  /** @type {number[]} */
  const out = [];
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error('[b2b] invalid base32');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** @returns {string} a new 160-bit secret, base32 */
export const newTotpSecret = () => base32Encode(randomBytes(20));

/**
 * @param {string} secretBase32
 * @param {number} counter
 * @returns {string} 6 digits
 */
export function hotp(secretBase32, counter) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const mac = createHmac('sha1', base32Decode(secretBase32)).update(msg).digest();
  const offset = (mac[mac.length - 1] ?? 0) & 0xf;
  const binary = mac.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
}

/** @param {Date} at */
export const stepAt = (at) => Math.floor(at.getTime() / 1000 / TOTP_STEP_SECONDS);

/**
 * The time step a code belongs to (current, previous or next), or null.
 * @param {string} secretBase32
 * @param {string} code
 * @param {Date} now
 * @returns {number | null}
 */
export function matchTotp(secretBase32, code, now) {
  if (!/^\d{6}$/.test(code)) return null;
  const current = stepAt(now);
  for (const step of [current, current - 1, current + 1]) {
    const expected = Buffer.from(hotp(secretBase32, step));
    if (timingSafeEqual(expected, Buffer.from(code))) return step;
  }
  return null;
}

/**
 * The link an authenticator app reads from the QR code.
 * @param {{ secret: string, account: string, issuer?: string }} input
 */
export function otpauthUrl(input) {
  const issuer = input.issuer ?? 'MusafirBaba Business';
  const label = encodeURIComponent(`${issuer}:${input.account}`);
  return `otpauth://totp/${label}?secret=${input.secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP_SECONDS}`;
}
