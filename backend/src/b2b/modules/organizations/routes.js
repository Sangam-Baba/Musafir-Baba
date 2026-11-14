// @ts-check
/**
 * Organisation endpoints for the selected org (the org always comes from the session, never the body):
 * GET /members · GET /branches · POST /branches · PATCH /branches/:id
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
const BranchParams = z.strictObject({ id: z.string().regex(/^[a-f0-9]{24}$/) });

/** @param {ReturnType<typeof import('./organizations.service.js').createOrganizationsService>} service */
export function organizationRoutes(service) {
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
  return router;
}
