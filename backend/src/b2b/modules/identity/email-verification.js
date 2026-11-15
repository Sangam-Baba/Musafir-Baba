// @ts-check
/**
 * Email verification links (plan Stage 02 §3.1 "email (verification link)"): HS256 JWT with
 * B2B_AUTH_SECRET, audience `b2b-email-verify`, 48 hours, naming the user and the email it was sent to
 * (a changed email makes old links useless).
 */
import jwt from 'jsonwebtoken';

export const EMAIL_VERIFY_TTL_SECONDS = 48 * 60 * 60;

/**
 * @param {{ userId: string, email: string }} claims
 * @param {{ secret: string, clock: import('../../core/clock.js').Clock }} deps
 */
export function signEmailVerification(claims, deps) {
  const iat = Math.floor(deps.clock.now().getTime() / 1000);
  return jwt.sign({ sub: claims.userId, em: claims.email, typ: 'email-verify', iat, exp: iat + EMAIL_VERIFY_TTL_SECONDS }, deps.secret, {
    algorithm: 'HS256',
    audience: 'b2b-email-verify',
    issuer: 'musafirbaba-b2b',
  });
}

/**
 * @param {string} token
 * @param {{ secret: string, clock: import('../../core/clock.js').Clock }} deps
 * @returns {{ userId: string, email: string } | null}
 */
export function verifyEmailVerification(token, deps) {
  try {
    const p = jwt.verify(token, deps.secret, {
      algorithms: ['HS256'],
      audience: 'b2b-email-verify',
      issuer: 'musafirbaba-b2b',
      clockTimestamp: Math.floor(deps.clock.now().getTime() / 1000),
    });
    if (typeof p !== 'object' || p.typ !== 'email-verify' || typeof p.sub !== 'string' || typeof p.em !== 'string') return null;
    return { userId: p.sub, email: p.em };
  } catch {
    return null;
  }
}
