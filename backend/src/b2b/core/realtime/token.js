// @ts-check
/**
 * Short-lived realtime tokens (HS256 JWT, ≤ 15 min, audience `b2b-realtime`) issued by
 * GET /api/v1/realtime/token and checked in the Socket.IO handshake (11-… §5).
 * Built on node:crypto — no package. The token lists the personal rooms the socket may join.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const AUDIENCE = 'b2b-realtime';
const MAX_TTL_SECONDS = 15 * 60;

/** @param {string | Buffer} input */
const b64url = (input) => Buffer.from(input).toString('base64url');

/** @param {string} data @param {string} secret */
const sign = (data, secret) => createHmac('sha256', secret).update(data).digest('base64url');

/**
 * @param {{ sub: string, rooms: readonly string[] }} claims
 * @param {{ secret: string, clock: import('../clock.js').Clock, ttlSeconds?: number }} options
 * @returns {{ token: string, expiresIn: number }}
 */
export function signRealtimeToken(claims, options) {
  assertSecret(options.secret);
  const ttl = Math.min(options.ttlSeconds ?? MAX_TTL_SECONDS, MAX_TTL_SECONDS);
  const iat = Math.floor(options.clock.now().getTime() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ sub: claims.sub, rooms: claims.rooms, aud: AUDIENCE, iat, exp: iat + ttl }));
  return { token: `${header}.${payload}.${sign(`${header}.${payload}`, options.secret)}`, expiresIn: ttl };
}

/**
 * @param {string} token
 * @param {{ secret: string, clock: import('../clock.js').Clock }} options
 * @returns {{ sub: string, rooms: string[] } | null} null if invalid, expired or for another audience
 */
export function verifyRealtimeToken(token, options) {
  if (typeof token !== 'string' || token.length > 4096) return null;
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) return null;
  const expected = Buffer.from(sign(`${header}.${payload}`, options.secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const h = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
    const p = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const now = Math.floor(options.clock.now().getTime() / 1000);
    if (h.alg !== 'HS256' || p.aud !== AUDIENCE || typeof p.exp !== 'number' || p.exp <= now) return null;
    if (typeof p.sub !== 'string' || !Array.isArray(p.rooms)) return null;
    return { sub: p.sub, rooms: p.rooms.filter((/** @type {unknown} */ r) => typeof r === 'string') };
  } catch {
    return null;
  }
}

/** @param {string} secret */
function assertSecret(secret) {
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('[b2b] B2B_REALTIME_SECRET must be at least 32 characters');
}
