// @ts-check
/**
 * Roles of the selected org: GET /roles · GET /roles/permissions · POST /roles · PATCH /roles/:id · DELETE /roles/:id
 */
import express from 'express';
import { z } from 'zod';

import { contextOf } from '../../core/http/context-middleware.js';
import { requirePermission } from '../../core/http/permissions.js';
import { validate } from '../../core/http/validate.js';
import { PERMISSIONS } from './permissions.js';

const Code = z.string().min(5).max(80);
const RoleBody = z.strictObject({
  name: z.string().min(2).max(60),
  description: z.string().max(300).optional(),
  permissions: z.array(Code).min(1).max(300),
});
const RolePatch = z
  .strictObject({
    name: z.string().min(2).max(60).optional(),
    description: z.string().max(300).optional(),
    permissions: z.array(Code).min(1).max(300).optional(),
  })
  .refine((b) => Object.keys(b).length > 0, 'Nothing to change');
const Params = z.strictObject({ id: z.string().regex(/^[a-f0-9]{24}$/) });

/** @param {ReturnType<typeof import('./roles.service.js').createRolesService>} roles */
export function roleRoutes(roles) {
  const router = express.Router();
  router.get('/roles', requirePermission(PERMISSIONS.roleRead), (_req, res, next) => {
    roles.list(contextOf(res)).then((data) => res.json({ data }), next);
  });
  router.get('/roles/permissions', requirePermission(PERMISSIONS.roleRead), (_req, res, next) => {
    try {
      res.json({ data: roles.choosablePermissions(contextOf(res)) });
    } catch (error) {
      next(error);
    }
  });
  router.post('/roles', requirePermission(PERMISSIONS.roleManage), validate({ body: RoleBody }), (_req, res, next) => {
    roles.create(contextOf(res), res.locals.input.body).then((r) => res.status(201).json(r), next);
  });
  router.patch(
    '/roles/:id',
    requirePermission(PERMISSIONS.roleManage),
    validate({ params: Params, body: RolePatch }),
    (_req, res, next) => {
      roles.update(contextOf(res), res.locals.input.params.id, res.locals.input.body).then((r) => res.json(r), next);
    },
  );
  router.delete('/roles/:id', requirePermission(PERMISSIONS.roleManage), validate({ params: Params }), (_req, res, next) => {
    roles.remove(contextOf(res), res.locals.input.params.id).then(() => res.status(204).end(), next);
  });
  return router;
}
