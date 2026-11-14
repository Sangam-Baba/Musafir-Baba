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
      const { userId, orgId } = who(res);
      const [user, mfa, memberships] = await Promise.all([
        deps.users.findById(userId),
        deps.mfa.status(userId),
        deps.orgs.membershipsOf(userId),
      ]);
      if (!user) throw new UnauthorizedError();
      res.json({ user, mfa, memberships, currentOrgId: orgId });
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
