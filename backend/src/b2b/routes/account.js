// @ts-check
/**
 * The signed-in business user's own account across modules (identity + organizations):
 * GET /me — profile, two-step status, the orgs they can open, the org open now.
 * POST /orgs/switch {orgId} — open another org they belong to (new access token, same session).
 * Belongs to the routes layer so neither module imports the other.
 */
import express from 'express';
import { z } from 'zod';

import { NotFoundError, UnauthorizedError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { requireBusinessUser } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';

/**
 * `/me` while a MusafirBaba admin views an org: the org's Owner view, and who is looking.
 * @param {import('express').Response} res
 * @param {{ orgs: ReturnType<typeof import('../modules/organizations/index.js').createOrganizationsService> }} deps
 */
function viewAsMe(res, deps) {
  const { actor } = contextOf(res);
  if (actor.type !== 'member' || !actor.viewAs) return null;
  const { viewAs, orgId, roles = [], permissions } = actor;
  return deps.orgs.basicInfo(orgId).then((org) => ({
    user: {
      id: actor.userId,
      name: 'MusafirBaba support (view as)',
      email: null,
      phone: null,
      status: 'ACTIVE',
      emailVerified: false,
      phoneVerified: false,
      hasPassword: false,
      lastLoginAt: null,
    },
    mfa: { totp: 'off', recoveryCodesLeft: 0 },
    memberships: org ? [{ orgId, reference: '', displayName: org.displayName, type: org.type, status: org.status, roles: [...roles] }] : [],
    blockedOrgs: [],
    currentOrgId: orgId,
    permissions: [...permissions],
    viewAs: { mode: viewAs.mode, expiresAt: viewAs.expiresAt, reason: viewAs.reason },
  }));
}

/**
 * @param {{
 *   users: ReturnType<typeof import('../modules/identity/index.js').createUserRepository>,
 *   mfa: ReturnType<typeof import('../modules/identity/index.js').createMfaService>,
 *   sessions: ReturnType<typeof import('../modules/identity/index.js').createSessionService>,
 *   orgs: ReturnType<typeof import('../modules/organizations/index.js').createOrganizationsService>,
 *   sign: (claims: { userId: string, sessionId: string, orgId: string | null }) => { accessToken: string, expiresIn: number },
 * }} deps
 */
export function accountRoutes(deps) {
  const router = express.Router(); // mounted at the /api/v1 root: checks go on each route, never router.use()

  /** @param {import('express').Response} res */
  const who = (res) => {
    const { actor } = contextOf(res);
    if ((actor.type !== 'user' && actor.type !== 'member') || !actor.sessionId) throw new UnauthorizedError();
    return { userId: actor.userId, sessionId: actor.sessionId, orgId: actor.type === 'member' ? actor.orgId : null };
  };

  router.get('/me', requireBusinessUser(), (_req, res, next) => {
    (async () => {
      const viewing = viewAsMe(res, deps);
      if (viewing) return res.json(await viewing);
      const { userId, orgId } = who(res);
      const [user, mfa, memberships, blockedOrgs] = await Promise.all([
        deps.users.findById(userId),
        deps.mfa.status(userId),
        deps.orgs.membershipsOf(userId),
        deps.orgs.blockedMembershipsOf(userId),
      ]);
      if (!user) throw new UnauthorizedError();
      const { actor } = contextOf(res);
      const permissions = actor.type === 'member' ? [...actor.permissions] : [];
      res.json({ user, mfa, memberships, blockedOrgs, currentOrgId: orgId, permissions }); // permissions: to show only usable buttons — the server still checks
    })().catch(next);
  });

  router.post(
    '/orgs/switch',
    requireBusinessUser(),
    validate({ body: z.strictObject({ orgId: z.string().regex(/^[a-f0-9]{24}$/) }) }),
    (_req, res, next) => {
      (async () => {
        const { userId, sessionId } = who(res);
        const { orgId } = res.locals.input.body;
        if (!(await deps.orgs.usableMembership(orgId, userId))) throw new NotFoundError('ORG_NOT_FOUND'); // not a member = doesn't exist
        const token = await deps.sessions.switchOrg(sessionId, userId, orgId, deps.sign);
        res.json({ ...token, tokenType: 'Bearer', orgId });
      })().catch(next);
    },
  );
  return router;
}
