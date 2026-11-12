// @ts-check
/** HTTP layer: permission → validate → service → JSON. No business logic here. */
import express from 'express';

import { contextOf } from '../../core/http/context-middleware.js';
import { requirePermission } from '../../core/http/permissions.js';
import { validate } from '../../core/http/validate.js';
import { PERMISSIONS } from './permissions.js';
import { CreateItemBody } from './validators.js';

/** @param {ReturnType<typeof import('./example.service.js').createExampleService>} service */
export function createRoutes(service) {
  const router = express.Router();
  router.get('/items', requirePermission(PERMISSIONS.itemRead), (_req, res, next) => {
    service.listItems(contextOf(res)).then((data) => res.json({ data }), next);
  });
  router.post('/items', requirePermission(PERMISSIONS.itemCreate), validate({ body: CreateItemBody }), (_req, res, next) => {
    service.createItem(contextOf(res), res.locals.input.body).then((item) => res.status(201).json(item), next);
  });
  return router;
}
