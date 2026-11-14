// @ts-check
/**
 * Organisation endpoints for the selected org (the org always comes from the session, never the body):
 * GET /members · DELETE /members/:userId · GET /branches · POST /branches · PATCH /branches/:id
 * · GET /invitations · POST /invitations · DELETE /invitations/:id
 */
import express from 'express';
import { z } from 'zod';

import { contextOf } from '../../core/http/context-middleware.js';
import { requirePermission } from '../../core/http/permissions.js';
import { validate } from '../../core/http/validate.js';
import { PERMISSIONS } from './permissions.js';

const BranchBody = z.strictObject({
  name: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(80).optional(),
  stateCode: z
    .string()
    .regex(/^\d{2}$/, 'Two-digit GST state code')
    .optional(),
});
const BranchPatch = BranchBody.partial()
  .extend({ status: z.enum(['ACTIVE', 'CLOSED']).optional() })
  .strict();
const Id = z.string().regex(/^[a-f0-9]{24}$/);
const BranchParams = z.strictObject({ id: Id });
const InviteBody = z.strictObject({
  email: z.string().trim().min(3).max(254),
  roles: z.array(z.string().min(3).max(60)).min(1).max(5),
  branchIds: z.array(Id).max(50).optional(),
  propertyIds: z.array(Id).max(200).optional(),
});

/**
 * @param {ReturnType<typeof import('./organizations.service.js').createOrganizationsService>} service
 * @param {ReturnType<typeof import('./invitations.service.js').createInvitationsService>} invitations
 */
export function organizationRoutes(service, invitations) {
  const router = express.Router();
  router.get('/members', requirePermission(PERMISSIONS.memberRead), (_req, res, next) => {
    service.listMembers(contextOf(res)).then((data) => res.json({ data }), next);
  });
  router.get('/branches', requirePermission(PERMISSIONS.branchRead), (_req, res, next) => {
    service.listBranches(contextOf(res)).then((data) => res.json({ data }), next);
  });
  router.post('/branches', requirePermission(PERMISSIONS.branchManage), validate({ body: BranchBody }), (_req, res, next) => {
    service.createBranch(contextOf(res), res.locals.input.body).then((b) => res.status(201).json(b), next);
  });
  router.patch(
    '/branches/:id',
    requirePermission(PERMISSIONS.branchManage),
    validate({ params: BranchParams, body: BranchPatch }),
    (_req, res, next) => {
      service.updateBranch(contextOf(res), res.locals.input.params.id, res.locals.input.body).then((b) => res.json(b), next);
    },
  );
  router.delete(
    '/members/:userId',
    requirePermission(PERMISSIONS.memberRemove),
    validate({ params: z.strictObject({ userId: Id }) }),
    (_req, res, next) => {
      invitations.removeMember(contextOf(res), res.locals.input.params.userId).then(() => res.status(204).end(), next);
    },
  );
  router.get('/invitations', requirePermission(PERMISSIONS.memberRead), (_req, res, next) => {
    invitations.list(contextOf(res)).then((data) => res.json({ data }), next);
  });
  router.post('/invitations', requirePermission(PERMISSIONS.memberInvite), validate({ body: InviteBody }), (_req, res, next) => {
    invitations.invite(contextOf(res), res.locals.input.body).then((i) => res.status(201).json(i), next);
  });
  router.delete('/invitations/:id', requirePermission(PERMISSIONS.memberInvite), validate({ params: BranchParams }), (_req, res, next) => {
    invitations.revoke(contextOf(res), res.locals.input.params.id).then(() => res.status(204).end(), next);
  });
  return router;
}
