// @ts-check
/**
 * Refresh tokens (pure, node:crypto only).
 * Format: `<sessionId>.<generation>.<random>.<mac>` where mac = HMAC-SHA256(secret, first three parts).
 * - The mac means only tokens WE issued are considered at all, so nobody can forge an "old" token
 *   to trigger reuse detection and log someone out.
 * - Only a SHA-256 hash of the current token is stored; the generation counts rotations.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const SESSION_ID = /^[a-f0-9]{24}$/;

/** @param {string} data @param {string} secret */
const mac = (data, secret) => createHmac('sha256', secret).update(`refresh:${data}`).digest('base64url');

/**
 * @param {string} sessionId
 * @param {number} generation
 * @param {string} secret
 * @returns {string}
 */
export function buildRefreshToken(sessionId, generation, secret) {
  const body = `${sessionId}.${generation}.${randomBytes(32).toString('base64url')}`;
  return `${body}.${mac(body, secret)}`;
}

/**
 * @param {unknown} token
 * @param {string} secret
 * @returns {{ sessionId: string, generation: number } | null} null unless we issued it
 */
export function parseRefreshToken(token, secret) {
  if (typeof token !== 'string' || token.length > 300) return null;
  const parts = token.split('.');
  if (parts.length !== 4) return null;
  const [sessionId, gen, random, given] = /** @type {[string, string, string, string]} */ (parts);
  if (!SESSION_ID.test(sessionId) || !/^\d{1,9}$/.test(gen) || random.length < 40) return null;
  const expected = Buffer.from(mac(`${sessionId}.${gen}.${random}`, secret));
  const actual = Buffer.from(given);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  return { sessionId, generation: Number(gen) };
}

/** @param {string} token @returns {string} */
export const hashToken = (token) => createHash('sha256').update(token).digest('base64url');
