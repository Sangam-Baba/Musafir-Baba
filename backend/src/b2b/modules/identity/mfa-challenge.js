// @ts-check
/**
 * The short "now enter your app code" pass given after a correct password or email code when two-step
 * login is on: HS256 JWT (existing `jsonwebtoken`, B2B_AUTH_SECRET), audience `b2b-mfa`, 5 minutes.
 * It is NOT an access token (different audience and type), so it opens nothing else.
 */
import jwt from 'jsonwebtoken';

export const MFA_CHALLENGE_TTL_SECONDS = 5 * 60;

/**
 * @param {{ userId: string, methods: string[] }} claims
 * @param {{ secret: string, clock: import('../../core/clock.js').Clock }} deps
 */
export function signMfaChallenge(claims, deps) {
  const iat = Math.floor(deps.clock.now().getTime() / 1000);
  return jwt.sign({ sub: claims.userId, m: claims.methods, typ: 'mfa', iat, exp: iat + MFA_CHALLENGE_TTL_SECONDS }, deps.secret, {
    algorithm: 'HS256',
    audience: 'b2b-mfa',
    issuer: 'musafirbaba-b2b',
  });
}

/**
 * @param {string} token
 * @param {{ secret: string, clock: import('../../core/clock.js').Clock }} deps
 * @returns {{ userId: string, methods: string[] } | null}
 */
export function verifyMfaChallenge(token, deps) {
  try {
    const p = jwt.verify(token, deps.secret, {
      algorithms: ['HS256'],
      audience: 'b2b-mfa',
      issuer: 'musafirbaba-b2b',
      clockTimestamp: Math.floor(deps.clock.now().getTime() / 1000),
    });
    if (typeof p !== 'object' || p.typ !== 'mfa' || typeof p.sub !== 'string' || !Array.isArray(p.m)) return null;
    return { userId: p.sub, methods: p.m.filter((x) => typeof x === 'string') };
  } catch {
    return null;
  }
}
