// @ts-check
/**
 * Accepting an invitation (identity + organizations, so it lives in the routes layer):
 * - GET  /invitations/lookup?token=…  → what the accept page shows (org name, invited email). Public.
 * - POST /invitations/accept {token, name?, password?} (header `X-B2B-Auth: 1`)
 *     signed in  → the invitation must be for the signed-in user's email; joins the org.
 *     signed out → creates the account (email counts as verified: the link arrived there) and signs in.
 *     signed out but the email already has an account → 409 ACCOUNT_EXISTS_SIGN_IN (sign in first).
 */
import express from 'express';
import { z } from 'zod';

import { ConflictError, NotFoundError, UnauthorizedError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { publicRoute } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { clientIp } from '../core/rate-limit.js';
import { requireAuthHeader, sendTokens } from '../modules/identity/session-routes.js';

const Token = z.string().min(30).max(200);
const Accept = z.strictObject({
  token: Token,
  name: z.string().trim().min(2).max(120).optional(),
  password: z.string().min(1).max(200).optional(),
});

/**
 * @param {{
 *   invitations: ReturnType<typeof import('../modules/organizations/index.js').createInvitationsService>,
 *   users: ReturnType<typeof import('../modules/identity/index.js').createUserRepository>,
 *   sessions: ReturnType<typeof import('../modules/identity/index.js').createSessionService>,
 *   secureCookies: boolean,
 * }} deps
 */
export function invitationRoutes(deps) {
  const router = express.Router();

  router.get('/invitations/lookup', publicRoute(), validate({ query: z.strictObject({ token: Token }) }), (_req, res, next) => {
    deps.invitations
      .lookup(res.locals.input.query.token)
      .then((info) => (info ? res.json(info) : next(new NotFoundError('INVITATION_INVALID'))), next);
  });

  router.post('/invitations/accept', publicRoute(), requireAuthHeader, validate({ body: Accept }), (req, res, next) => {
    const body = /** @type {z.infer<typeof Accept>} */ (res.locals.input.body);
    const { actor } = contextOf(res);
    (async () => {
      if (actor.type === 'user' || actor.type === 'member') {
        const me = await deps.users.findById(actor.userId);
        if (!me?.email) throw new UnauthorizedError();
        res.json(await deps.invitations.accept(body.token, me.id, me.email));
        return;
      }
      const email = await deps.invitations.emailFor(body.token);
      if (!email) throw new NotFoundError('INVITATION_INVALID');
      if (await deps.users.findByLogin(email)) throw new ConflictError('ACCOUNT_EXISTS_SIGN_IN');
      if (!body.name || !body.password) throw new ConflictError('NAME_AND_PASSWORD_REQUIRED');
      const user = await deps.users.create({ email, name: body.name, password: body.password, emailVerified: true });
      const { orgId } = await deps.invitations.accept(body.token, user.id, email);
      const tokens = await deps.sessions.create({
        userId: user.id,
        orgId,
        methods: ['invitation'],
        ip: clientIp(req),
        userAgent: req.get('user-agent') ?? null,
      });
      sendTokens(res, tokens, deps.secureCookies);
    })().catch(next);
  });
  return router;
}
