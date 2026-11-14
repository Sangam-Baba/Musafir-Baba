// @ts-check
/**
 * The B2B admin pass: what a MusafirBaba staff member gets after proving two-step login on top of
 * their existing admin login (plan Stage 01 §3.6, D1). HS256 JWT with B2B_AUTH_SECRET, audience
 * `b2b-admin`, 4 hours. It names the existing admin session (`sid`), which must still be open on
 * every request — logging out of the existing admin panel ends it too.
 */
import jwt from 'jsonwebtoken';

export const ADMIN_TOKEN_TTL_SECONDS = 4 * 60 * 60;

/**
 * @param {{ staffId: string, legacySessionId: string, methods: string[] }} claims
 * @param {{ secret: string, clock: import('../../core/clock.js').Clock }} deps
 */
export function signAdminToken(claims, deps) {
  const iat = Math.floor(deps.clock.now().getTime() / 1000);
  const token = jwt.sign(
    { sub: claims.staffId, sid: claims.legacySessionId, m: claims.methods, typ: 'b2b-admin', iat, exp: iat + ADMIN_TOKEN_TTL_SECONDS },
    deps.secret,
    { algorithm: 'HS256', audience: 'b2b-admin', issuer: 'musafirbaba-b2b' },
  );
  return { adminToken: token, expiresIn: ADMIN_TOKEN_TTL_SECONDS };
}

/**
 * @param {string} token
 * @param {{ secret: string, clock: import('../../core/clock.js').Clock }} deps
 * @returns {{ staffId: string, legacySessionId: string, methods: string[] } | null}
 */
export function verifyAdminToken(token, deps) {
  try {
    const p = jwt.verify(token, deps.secret, {
      algorithms: ['HS256'],
      audience: 'b2b-admin',
      issuer: 'musafirbaba-b2b',
      clockTimestamp: Math.floor(deps.clock.now().getTime() / 1000),
    });
    if (typeof p !== 'object' || p.typ !== 'b2b-admin' || typeof p.sub !== 'string' || typeof p.sid !== 'string' || !Array.isArray(p.m))
      return null;
    return { staffId: p.sub, legacySessionId: p.sid, methods: p.m.filter((x) => typeof x === 'string') };
  } catch {
    return null;
  }
}
