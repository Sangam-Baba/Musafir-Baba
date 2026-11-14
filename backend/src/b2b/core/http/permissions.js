// @ts-check
/**
 * Route-level access checks (docs/plan/03-security-baseline.md). Every /api/v1 route
 * declares one of these; object-level checks (`authz.assert` after loading a record)
 * happen in services. Anonymous → 401; signed in but not allowed → 403.
 * Each guard carries a `b2bAccess` label; tests/b2b/route-permissions.test.js walks every /api/v1
 * route and fails if one has no labelled guard (plan Stage 01 §3.5).
 */
import { ForbiddenError, UnauthorizedError } from '../errors.js';
import { contextOf } from './context-middleware.js';

/**
 * @param {import('express').RequestHandler} handler
 * @param {string} access e.g. 'public', 'permission:organizations.member.read'
 * @returns {import('express').RequestHandler & { b2bAccess: string }}
 */
const label = (handler, access) => Object.assign(handler, { b2bAccess: access });

/** Marks a route as intentionally public (reviewed). */
export function publicRoute() {
  /** @type {import('express').RequestHandler} */
  const handler = (_req, _res, next) => next();
  return label(handler, 'public');
}

/**
 * Website customer routes (their own bookings etc.).
 * @returns {import('express').RequestHandler}
 */
export function requireCustomer() {
  return label((_req, res, next) => {
    const { actor } = contextOf(res);
    if (actor.type === 'anonymous') return next(new UnauthorizedError());
    if (actor.type !== 'customer') return next(new ForbiddenError());
    next();
  }, 'customer');
}

/**
 * A signed-in business user acting on their OWN account (password, two-step login, sessions, org list).
 * No permission code: it is their own data. Website customers and staff are refused.
 * @returns {import('express').RequestHandler}
 */
export function requireBusinessUser() {
  return label((_req, res, next) => {
    const { actor } = contextOf(res);
    if (actor.type === 'anonymous') return next(new UnauthorizedError());
    if (actor.type !== 'user' && actor.type !== 'member') return next(new ForbiddenError());
    next();
  }, 'business-user');
}

/**
 * A MusafirBaba staff member signed in with their existing admin login (used to obtain the B2B admin
 * pass). B2B admin actions themselves need `requirePermission(...)`.
 * @returns {import('express').RequestHandler}
 */
export function requireStaff() {
  return label((_req, res, next) => {
    const { actor } = contextOf(res);
    if (actor.type === 'anonymous') return next(new UnauthorizedError());
    if (actor.type !== 'staff') return next(new ForbiddenError());
    next();
  }, 'staff');
}

/**
 * Staff (admin) and business members need the permission code, e.g. 'hotel.property.approve'.
 * @param {string} permission
 * @returns {import('express').RequestHandler}
 */
export function requirePermission(permission) {
  return label((_req, res, next) => {
    const { actor } = contextOf(res);
    if (actor.type === 'anonymous') return next(new UnauthorizedError());
    const allowed = (actor.type === 'staff' || actor.type === 'member') && actor.permissions.includes(permission);
    if (!allowed) return next(new ForbiddenError('PERMISSION_DENIED'));
    next();
  }, `permission:${permission}`);
}
