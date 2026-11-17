// @ts-check
/**
 * Short-lived download links (plan Stage 02 §3.4: "signed download (60 s)"). The link carries the
 * file, its org, who asked and the expiry, signed with HMAC-SHA256 (master key, own purpose), so it
 * can't be forged, edited or reused after a minute. node:crypto only.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export const LINK_TTL_SECONDS = 60;

/** @typedef {{ fileId: string, orgId: string, viewer: string }} LinkClaims */

/** @param {string} data @param {string} secret */
const mac = (data, secret) => createHmac('sha256', secret).update(`file-link:${data}`).digest('base64url');

/**
 * @param {LinkClaims} claims
 * @param {{ secret: string, clock: import('../../core/clock.js').Clock }} deps
 * @returns {{ token: string, expiresAt: Date }}
 */
export function signLink(claims, deps) {
  const exp = Math.floor(deps.clock.now().getTime() / 1000) + LINK_TTL_SECONDS;
  const body = Buffer.from(JSON.stringify({ f: claims.fileId, o: claims.orgId, v: claims.viewer, e: exp })).toString('base64url');
  return { token: `${body}.${mac(body, deps.secret)}`, expiresAt: new Date(exp * 1000) };
}

/**
 * @param {unknown} token
 * @param {{ secret: string, clock: import('../../core/clock.js').Clock }} deps
 * @returns {LinkClaims | null} null if forged, edited or expired
 */
export function verifyLink(token, deps) {
  if (typeof token !== 'string' || token.length > 600) return null;
  const [body, given] = token.split('.');
  if (!body || !given) return null;
  const expected = Buffer.from(mac(body, deps.secret));
  const actual = Buffer.from(given);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (typeof p.e !== 'number' || p.e <= Math.floor(deps.clock.now().getTime() / 1000)) return null;
    if (typeof p.f !== 'string' || typeof p.o !== 'string' || typeof p.v !== 'string') return null;
    return { fileId: p.f, orgId: p.o, viewer: p.v };
  } catch {
    return null;
  }
}
