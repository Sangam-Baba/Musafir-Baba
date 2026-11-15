// @ts-check
/**
 * "View as client/hotel" (plan Stage 01 §3.7):
 * - POST /admin/view-as {orgId, reason, mode?, code?} — staff with `admin.viewAs.read` (B2B admin pass);
 *   WRITE mode also needs `admin.viewAs.write` and a fresh app code (step-up). Owners are emailed.
 * - The returned pass makes the admin a member of that org with its Owner's view, for 30 minutes.
 *   Every request re-checks the session record and the admin's existing login session.
 * - READ mode: the server refuses every change (viewAsReadOnly); only POST /view-as/end is allowed.
 * - POST /view-as/end — ends it (from the banner in the business area).
 */
import express from 'express';
import { z } from 'zod';

import { queueEmail } from '../core/email.js';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { requireBusinessUser, requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { findSessionById } from '../legacy-read/index.js';
import { PERMISSIONS as IDENTITY } from '../modules/identity/index.js';
import { staffMfaKey } from './admin-auth.js';

const OWNER_ROLE = /** @type {const} */ ({ CLIENT: 'client.owner', HOTEL: 'hotel.owner' });

/**
 * @typedef {{
 *   viewAs: ReturnType<typeof import('../modules/identity/index.js').createViewAsService>,
 *   orgs: ReturnType<typeof import('../modules/organizations/index.js').createOrganizationsService>,
 *   users: ReturnType<typeof import('../modules/identity/index.js').createUserRepository>,
 *   mfa: ReturnType<typeof import('../modules/identity/index.js').createMfaService>,
 *   permissionsOf: (roles: readonly string[], orgType: 'PLATFORM' | 'CLIENT' | 'HOTEL', orgId: string) => Promise<string[]>,
 *   secret: string | undefined,
 *   clock: import('../core/clock.js').Clock,
 * }} ViewAsDeps
 */

/** @param {ViewAsDeps} deps @returns {import('../core/http/context-middleware.js').Authenticator} */
export function createViewAsAuthenticator(deps) {
  return async (req) => {
    const header = req.get('authorization');
    if (!deps.secret || !header?.startsWith('Bearer ') || header.length > 4096) return null;
    const session = await deps.viewAs.find(header.slice(7).trim());
    if (!session) return null;
    const legacy = await findSessionById(session.legacySessionId);
    if (!legacy || legacy.userId !== session.staffId || legacy.status !== 'active' || legacy.revoked) return null; // admin logged out
    const org = await deps.orgs.basicInfo(session.orgId);
    if (!org || org.type === 'PLATFORM') return null;
    const roles = [OWNER_ROLE[org.type]];
    return {
      type: 'member',
      userId: `staff:${session.staffId}`,
      orgId: org.orgId,
      orgType: org.type,
      roles,
      permissions: await deps.permissionsOf(roles, org.type, org.orgId),
      viewAs: { id: session.viewAsId, staffId: session.staffId, mode: session.mode, expiresAt: session.expiresAt, reason: session.reason },
    };
  };
}

/** READ-mode view-as can't change anything (the server refuses — the UI only mirrors it). @type {import('express').RequestHandler} */
export const viewAsReadOnly = (req, res, next) => {
  const { actor } = contextOf(res);
  const changing = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  if (actor.type === 'member' && actor.viewAs?.mode === 'READ' && changing && req.path !== '/view-as/end')
    return next(new ForbiddenError('VIEW_AS_READ_ONLY'));
  next();
};

const Start = z.strictObject({
  orgId: z.string().regex(/^[a-f0-9]{24}$/),
  reason: z.string().trim().min(10).max(500),
  mode: z.enum(['READ', 'WRITE']).optional(),
  code: z
    .string()
    .regex(/^\d{6}$/)
    .optional(),
});

/** @param {ViewAsDeps} deps */
export function viewAsRoutes(deps) {
  const router = express.Router();
  router.post('/admin/view-as', requirePermission(IDENTITY.viewAs), validate({ body: Start }), (_req, res, next) => {
    (async () => {
      const { actor } = contextOf(res);
      if (actor.type !== 'staff' || !actor.legacySessionId) throw new UnauthorizedError();
      const body = /** @type {z.infer<typeof Start>} */ (res.locals.input.body);
      const mode = body.mode ?? 'READ';
      if (mode === 'WRITE') {
        if (!actor.permissions.includes(IDENTITY.viewAsWrite)) throw new ForbiddenError('PERMISSION_DENIED');
        if (!body.code || !(await deps.mfa.isEnabled(staffMfaKey(actor.staffId)))) throw new ForbiddenError('STEP_UP_REQUIRED');
        await deps.mfa.verify(staffMfaKey(actor.staffId), { code: body.code });
      }
      const org = await deps.orgs.basicInfo(body.orgId);
      if (!org || org.type === 'PLATFORM') throw new NotFoundError('ORG_NOT_FOUND');
      const started = await deps.viewAs.start({
        orgId: org.orgId,
        staffId: actor.staffId,
        legacySessionId: actor.legacySessionId,
        reason: body.reason,
        mode,
      });
      await notifyOwners(deps, org, mode, body.reason);
      res.status(201).json({ ...started, mode });
    })().catch(next);
  });
  router.post('/view-as/end', requireBusinessUser(), (_req, res, next) => {
    (async () => {
      const { actor } = contextOf(res);
      if (actor.type !== 'member' || !actor.viewAs) throw new ForbiddenError('NOT_VIEWING_AS');
      await deps.viewAs.end(actor.viewAs.id, actor.orgId);
      res.status(204).end();
    })().catch(next);
  });
  return router;
}

/**
 * Tells the org's Owners that MusafirBaba support opened their workspace, and why.
 * @param {ViewAsDeps} deps @param {{ orgId: string, displayName: string }} org @param {'READ' | 'WRITE'} mode @param {string} reason
 */
async function notifyOwners(deps, org, mode, reason) {
  if (!deps.secret) return;
  const owners = await deps.users.describe(await deps.orgs.ownerUserIds(org.orgId));
  for (const owner of owners) {
    if (!owner.email) continue;
    await queueEmail(
      {
        to: owner.email,
        subject: `MusafirBaba support opened ${org.displayName} on MusafirBaba Business`,
        text: [
          `A MusafirBaba support admin opened your ${org.displayName} workspace ${mode === 'READ' ? 'to look (no changes possible)' : 'with permission to make changes'}.`,
          `Reason given: ${reason}`,
          'It ends automatically within 30 minutes and is recorded in your activity log. Questions? Reply to this email.',
        ].join('\n\n'),
      },
      { secret: deps.secret, clock: deps.clock },
    );
  }
}
