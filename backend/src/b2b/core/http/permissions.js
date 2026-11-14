// @ts-check
/**
 * Route-level access checks (docs/plan/03-security-baseline.md). Every /api/v1 route
 * declares one of these; object-level checks (`authz.assert` after loading a record)
 * happen in services. Anonymous → 401; signed in but not allowed → 403.
 */
import { ForbiddenError, UnauthorizedError } from '../errors.js';
import { contextOf } from './context-middleware.js';

/** Marks a route as intentionally public (reviewed). */
export function publicRoute() {
  /** @type {import('express').RequestHandler} */
  const handler = (_req, _res, next) => next();
  return handler;
}

/**
 * Website customer routes (their own bookings etc.).
 * @returns {import('express').RequestHandler}
 */
export function requireCustomer() {
  return (_req, res, next) => {
    const { actor } = contextOf(res);
    if (actor.type === 'anonymous') return next(new UnauthorizedError());
    if (actor.type !== 'customer') return next(new ForbiddenError());
    next();
  };
}

/**
 * A signed-in business user acting on their OWN account (password, two-step login, sessions, org list).
 * No permission code: it is their own data. Website customers and staff are refused.
 * @returns {import('express').RequestHandler}
 */
export function requireBusinessUser() {
  return (_req, res, next) => {
    const { actor } = contextOf(res);
    if (actor.type === 'anonymous') return next(new UnauthorizedError());
    if (actor.type !== 'user' && actor.type !== 'member') return next(new ForbiddenError());
    next();
  };
}

/**
 * Staff (admin) and business members need the permission code, e.g. 'hotel.property.approve'.
 * @param {string} permission
 * @returns {import('express').RequestHandler}
 */
export function requirePermission(permission) {
  return (_req, res, next) => {
    const { actor } = contextOf(res);
    if (actor.type === 'anonymous') return next(new UnauthorizedError());
    const allowed = (actor.type === 'staff' || actor.type === 'member') && actor.permissions.includes(permission);
    if (!allowed) return next(new ForbiddenError('PERMISSION_DENIED'));
    next();
  };
}
