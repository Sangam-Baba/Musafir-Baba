// @ts-check
/**
 * Sealing small secrets that must be stored for a short time (e.g. an email with a one-time code
 * waiting in the job queue): AES-256-GCM with a key derived from B2B_AUTH_SECRET (HKDF). node:crypto only.
 * Sealed data says what it is for (`purpose`), so a sealed value can't be replayed for something else.
 */
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

/** @param {string} secret @param {string} purpose */
const keyFor = (secret, purpose) => Buffer.from(hkdfSync('sha256', secret, 'musafirbaba-b2b', `seal:${purpose}`, 32));

/**
 * @param {unknown} value JSON-serialisable
 * @param {{ secret: string, purpose: string }} options
 * @returns {string} base64url(iv | tag | ciphertext)
 */
export function seal(value, options) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFor(options.secret, options.purpose), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64url');
}

/**
 * @param {string} sealed
 * @param {{ secret: string, purpose: string }} options
 * @returns {unknown} throws if tampered, wrong secret or wrong purpose
 */
export function unseal(sealed, options) {
  const raw = Buffer.from(sealed, 'base64url');
  if (raw.length < 29) throw new Error('[b2b] sealed value too short');
  const decipher = createDecipheriv('aes-256-gcm', keyFor(options.secret, options.purpose), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8'));
}

/** A new random 256-bit key (e.g. one per stored file). @returns {Buffer} */
export const newDataKey = () => randomBytes(32);

/**
 * Encrypts bytes with AES-256-GCM. Output: iv (12) | tag (16) | ciphertext.
 * @param {Buffer} plain
 * @param {Buffer} key 32 bytes
 * @returns {Buffer}
 */
export function encryptBytes(plain, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]);
}

/**
 * @param {Buffer} blob iv | tag | ciphertext
 * @param {Buffer} key 32 bytes
 * @returns {Buffer} throws if tampered or the wrong key
 */
export function decryptBytes(blob, key) {
  if (blob.length < 28) throw new Error('[b2b] encrypted blob too short');
  const decipher = createDecipheriv('aes-256-gcm', key, blob.subarray(0, 12));
  decipher.setAuthTag(blob.subarray(12, 28));
  return Buffer.concat([decipher.update(blob.subarray(28)), decipher.final()]);
}
