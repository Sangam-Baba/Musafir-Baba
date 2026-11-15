// @ts-check
/**
 * The bell and notification preferences of a signed-in business user (plan 11 §11). Only a login is
 * needed: what each person sees is filtered by their own permissions in the service.
 * GET  /notifications?after=&before=&limit=&unread=true   GET /notifications/unread-count
 * POST /notifications/:id/read    POST /notifications/read-all
 * GET  /notification-preferences  PUT /notification-preferences {category, inApp, email}
 */
import express from 'express';
import { z } from 'zod';

import { contextOf } from '../core/http/context-middleware.js';
import { requireBusinessUser } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';

const Id = z.string().regex(/^[a-f0-9]{24}$/);
const ListQuery = z.strictObject({
  after: Id.optional(),
  before: Id.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  unread: z.enum(['true', 'false']).optional(),
});

/** @param {{ notifications: ReturnType<typeof import('../modules/notifications/index.js').createNotificationsService> }} deps */
export function notificationRoutes({ notifications }) {
  const router = express.Router();
  const signedIn = requireBusinessUser();
  router.get('/notifications', signedIn, validate({ query: ListQuery }), (_req, res, next) => {
    const q = res.locals.input.query;
    notifications
      .list(contextOf(res), { after: q.after, before: q.before, limit: q.limit, unread: q.unread === 'true' })
      .then((r) => res.json(r), next);
  });
  router.get('/notifications/unread-count', signedIn, (_req, res, next) => {
    notifications.unreadCount(contextOf(res)).then((r) => res.json(r), next);
  });
  router.post('/notifications/read-all', signedIn, (_req, res, next) => {
    notifications.markAllRead(contextOf(res)).then((r) => res.json(r), next);
  });
  router.post('/notifications/:id/read', signedIn, validate({ params: z.strictObject({ id: Id }) }), (_req, res, next) => {
    notifications.markRead(contextOf(res), res.locals.input.params.id).then(() => res.status(204).end(), next);
  });
  router.get('/notification-preferences', signedIn, (_req, res, next) => {
    notifications.preferences(contextOf(res)).then((r) => res.json(r), next);
  });
  router.put(
    '/notification-preferences',
    signedIn,
    validate({ body: z.strictObject({ category: z.string().max(60), inApp: z.boolean(), email: z.boolean() }) }),
    (_req, res, next) => {
      notifications.setPreference(contextOf(res), res.locals.input.body).then(() => res.status(204).end(), next);
    },
  );
  return router;
}
