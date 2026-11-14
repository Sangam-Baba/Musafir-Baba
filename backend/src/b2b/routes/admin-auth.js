// @ts-check
/**
 * MusafirBaba admins in the B2B system (plan Stage 01 §3.6, D1). The existing admin login is untouched.
 * 1. With their existing admin token, a staff member who holds a B2B platform role asks for a
 *    **B2B admin pass**: POST /admin/auth/session {code | recoveryCode}.
 *    Two-step login is required; staff granted a role get 7 days to set it up
 *    (POST /admin/auth/mfa/setup → /admin/auth/mfa/enable), after which a pass without it is refused.
 * 2. The pass (Bearer) gives the staff member their platform-role permissions on /api/v1/admin/*.
 *    On every request: the pass is valid, the existing admin session it names is still open, the
 *    staff account is active and still has B2B roles (all read-only checks).
 */
import express from 'express';
import { z } from 'zod';

import { ForbiddenError, RateLimitError, UnauthorizedError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { requireStaff } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { findSessionById, findStaffById } from '../legacy-read/index.js';
import { signAdminToken, verifyAdminToken } from '../modules/identity/index.js';

export const MFA_ENROLMENT_WINDOW_MS = 7 * 24 * 60 * 60_000;
/** @param {string} staffId */
export const staffMfaKey = (staffId) => `staff:${staffId}`;

/**
 * @typedef {{
 *   secret: string | undefined,
 *   clock: import('../core/clock.js').Clock,
 *   staffRoles: ReturnType<typeof import('../modules/access/index.js').createStaffRolesService>,
 *   mfa?: ReturnType<typeof import('../modules/identity/index.js').createMfaService>,
 *   verifyLimiter?: ReturnType<typeof import('../core/rate-limit.js').createRateLimiter>,
 * }} AdminDeps
 */

/** @param {AdminDeps} deps @returns {import('../core/http/context-middleware.js').Authenticator} */
export function createAdminAuthenticator(deps) {
  return async (req) => {
    const header = req.get('authorization');
    if (!deps.secret || !header?.startsWith('Bearer ') || header.length > 4096) return null;
    const pass = verifyAdminToken(header.slice(7).trim(), { secret: deps.secret, clock: deps.clock });
    if (!pass) return null;
    const session = await findSessionById(pass.legacySessionId);
    if (!session || session.userId !== pass.staffId || session.status !== 'active' || session.revoked) return null;
    const staff = await findStaffById(pass.staffId);
    if (!staff?.isActive) return null;
    const roles = await deps.staffRoles.get(pass.staffId);
    if (!roles) return null;
    return {
      type: 'staff',
      staffId: pass.staffId,
      permissions: deps.staffRoles.permissionsOf(roles.roles),
      legacySessionId: pass.legacySessionId,
      viaAdminToken: true,
    };
  };
}

/** @param {import('express').Response} res */
function staffOf(res) {
  const { actor } = contextOf(res);
  if (actor.type !== 'staff' || !actor.legacySessionId) throw new UnauthorizedError();
  return { staffId: actor.staffId, legacySessionId: actor.legacySessionId };
}

const Code = z.string().regex(/^\d{6}$/);
const Proof = z.strictObject({ code: Code.optional(), recoveryCode: z.string().trim().min(10).max(20).optional() });

/** @param {Required<AdminDeps>} deps */
export function adminAuthRoutes(deps) {
  const router = express.Router();
  /** @param {string} staffId */
  const requireRole = async (staffId) => {
    const roles = await deps.staffRoles.get(staffId);
    if (!roles) throw new ForbiddenError('NO_B2B_ADMIN_ROLE');
    return roles;
  };
  /** @param {{ staffId: string, legacySessionId: string }} who @param {string[]} methods */
  const pass = (who, methods) => {
    if (!deps.secret) throw new UnauthorizedError();
    return signAdminToken({ ...who, methods }, { secret: deps.secret, clock: deps.clock });
  };

  router.post('/admin/auth/mfa/setup', requireStaff(), (_req, res, next) => {
    (async () => {
      const who = staffOf(res);
      await requireRole(who.staffId);
      const staff = await findStaffById(who.staffId);
      res.json(await deps.mfa.setup(staffMfaKey(who.staffId), staff?.email ?? who.staffId));
    })().catch(next);
  });

  router.post('/admin/auth/mfa/enable', requireStaff(), validate({ body: z.strictObject({ code: Code }) }), (_req, res, next) => {
    (async () => {
      const who = staffOf(res);
      await requireRole(who.staffId);
      const { recoveryCodes } = await deps.mfa.enable(staffMfaKey(who.staffId), res.locals.input.body.code);
      res.json({ recoveryCodes, ...pass(who, ['password', 'totp']) });
    })().catch(next);
  });

  router.post('/admin/auth/session', requireStaff(), validate({ body: Proof }), (_req, res, next) => {
    (async () => {
      const who = staffOf(res);
      const roles = await requireRole(who.staffId);
      const body = /** @type {z.infer<typeof Proof>} */ (res.locals.input.body);
      if (await deps.mfa.isEnabled(staffMfaKey(who.staffId))) {
        const limit = await deps.verifyLimiter.consume(who.staffId);
        if (!limit.allowed) throw new RateLimitError(limit.retryAfterSeconds);
        const method = await deps.mfa.verify(staffMfaKey(who.staffId), body);
        res.json({ ...pass(who, ['password', method]), mfaSetupRequiredBy: null });
        return;
      }
      const deadline = new Date(roles.firstGrantedAt.getTime() + MFA_ENROLMENT_WINDOW_MS);
      if (deps.clock.now().getTime() >= deadline.getTime()) throw new ForbiddenError('MFA_ENROLMENT_REQUIRED');
      res.json({ ...pass(who, ['password']), mfaSetupRequiredBy: deadline.toISOString() });
    })().catch(next);
  });
  return router;
}
