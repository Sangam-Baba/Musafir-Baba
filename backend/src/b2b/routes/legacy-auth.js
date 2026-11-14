// @ts-check
/**
 * Existing website-customer and admin logins on /api/v1 — verified READ-ONLY (docs/existing-system-map.md §3).
 * Nothing in the existing app changes; this only reads `users`, `staffs` and `sessions` through legacy-read/.
 * A token is accepted only if ALL of these hold:
 *  - signed with the existing JWT_ACCESS_SECRET (HS256) and not expired;
 *  - shaped like a login token: `{ sub, role, sessionId }` — the 10-minute preview tokens (`{ role }` only,
 *    same secret) are refused;
 *  - the account exists and is active in `users` (role "user") or `staffs` (admin / superadmin / staff);
 *  - its `sessions` row belongs to that account and is `active` (stricter than the existing check,
 *    which only refuses "logout"; being stricter here cannot affect the existing app).
 * Staff get their B2B permissions from platform roles in S01-T14 (none until then).
 */
import jwt from 'jsonwebtoken';

import { findCustomerById, findSessionById, findStaffById } from '../legacy-read/index.js';

const STAFF_ROLES = ['admin', 'superadmin', 'staff'];
const ID = /^[a-f0-9]{24}$/;

/**
 * @param {string} token
 * @param {string} secret
 * @returns {{ sub: string, role: string, sessionId: string } | null}
 */
function readLoginToken(token, secret) {
  try {
    const p = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (typeof p !== 'object' || typeof p.sub !== 'string' || !ID.test(p.sub)) return null;
    if (typeof p.role !== 'string' || typeof p.sessionId !== 'string' || p.sessionId.length === 0) return null;
    if (p.aud !== undefined || p.typ !== undefined) return null; // B2B / other token types are not existing logins
    return { sub: p.sub, role: p.role, sessionId: p.sessionId };
  } catch {
    return null;
  }
}

/**
 * @param {{ secret: string | undefined, staffPermissions?: (staffId: string) => Promise<string[]> }} deps
 * @returns {import('../core/http/context-middleware.js').Authenticator}
 */
export function createLegacyAuthenticator(deps) {
  return async (req) => {
    const header = req.get('authorization');
    if (!deps.secret || !header?.startsWith('Bearer ') || header.length > 4096) return null;
    const claims = readLoginToken(header.slice(7).trim(), deps.secret);
    if (!claims) return null;
    const session = await findSessionById(claims.sessionId);
    if (!session || session.userId !== claims.sub || session.status !== 'active' || session.revoked) return null;
    const actor = await actorFor(claims, deps);
    return actor?.type === 'staff' ? { ...actor, legacySessionId: claims.sessionId } : actor;
  };
}

/**
 * The account behind a valid token: an active website customer or an active staff member.
 * @param {{ sub: string, role: string }} claims
 * @param {{ staffPermissions?: (staffId: string) => Promise<string[]> }} deps
 * @returns {Promise<import('../core/context.js').Actor | null>}
 */
async function actorFor(claims, deps) {
  if (claims.role === 'user') {
    const customer = await findCustomerById(claims.sub);
    return customer?.isActive ? { type: 'customer', customerId: customer.id } : null;
  }
  if (!STAFF_ROLES.includes(claims.role)) return null;
  const staff = await findStaffById(claims.sub);
  if (!staff?.isActive) return null;
  return { type: 'staff', staffId: staff.id, permissions: (await deps.staffPermissions?.(staff.id)) ?? [] };
}

/**
 * Tries each authenticator in turn; the first that recognises the caller wins.
 * @param {...import('../core/http/context-middleware.js').Authenticator} authenticators
 * @returns {import('../core/http/context-middleware.js').Authenticator}
 */
export function firstMatch(...authenticators) {
  return async (req) => {
    for (const authenticate of authenticators) {
      const actor = await authenticate(req);
      if (actor) return actor;
    }
    return null;
  };
}
