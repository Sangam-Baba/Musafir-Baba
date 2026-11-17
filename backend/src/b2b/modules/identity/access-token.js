// @ts-check
/**
 * Business-user access tokens: HS256 JWT with the existing `jsonwebtoken` package, signed with
 * B2B_AUTH_SECRET (never the existing JWT secrets), audience `b2b-api`, 15 minutes.
 * Claims: sub = user id, sid = session id, org = current org (or null).
 */
import jwt from 'jsonwebtoken';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const AUDIENCE = 'b2b-api';
const ISSUER = 'musafirbaba-b2b';

/** @typedef {{ userId: string, sessionId: string, orgId: string | null }} AccessClaims */

/**
 * @param {AccessClaims} claims
 * @param {{ secret: string, clock: import('../../core/clock.js').Clock }} deps
 * @returns {{ accessToken: string, expiresIn: number }}
 */
export function signAccessToken(claims, deps) {
  const iat = Math.floor(deps.clock.now().getTime() / 1000);
  const accessToken = jwt.sign(
    { sub: claims.userId, sid: claims.sessionId, org: claims.orgId, typ: 'b2b', iat, exp: iat + ACCESS_TOKEN_TTL_SECONDS },
    deps.secret,
    { algorithm: 'HS256', audience: AUDIENCE, issuer: ISSUER },
  );
  return { accessToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
}

/**
 * @param {string} token
 * @param {{ secret: string, clock: import('../../core/clock.js').Clock }} deps
 * @returns {AccessClaims | null} null if forged, expired, or not a B2B token
 */
export function verifyAccessToken(token, deps) {
  try {
    const p = jwt.verify(token, deps.secret, {
      algorithms: ['HS256'],
      audience: AUDIENCE,
      issuer: ISSUER,
      clockTimestamp: Math.floor(deps.clock.now().getTime() / 1000),
    });
    if (typeof p !== 'object' || p.typ !== 'b2b' || typeof p.sub !== 'string' || typeof p.sid !== 'string') return null;
    return { userId: p.sub, sessionId: p.sid, orgId: typeof p.org === 'string' ? p.org : null };
  } catch {
    return null;
  }
}
