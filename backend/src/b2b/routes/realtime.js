// @ts-check
/**
 * GET /api/v1/realtime/stream — live updates as Server-Sent Events (docs/plan/11-… §5, ADR-0015).
 * - Signed-in callers (Authorization header, so the frontend opens it with fetch) get their
 *   personal rooms automatically. The server decides these; the browser never names them.
 * - Anyone may add public availability rooms: `?rooms=availability:property:<property id>,…` (max 20) — only for
 *   LIVE properties; a hotel's own people may also follow their unpublished properties (the calendar page), staff any
 *   (`canFollow`, Stage 06). Anonymous visitors can use plain `new EventSource(url)`.
 * - No token in the URL: the existing request logger prints URLs.
 */
import express from 'express';
import { z } from 'zod';

import { NotFoundError, ValidationError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { publicRoute } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { isPublicRoom, roomsForActor } from '../core/realtime/rooms.js';

const MAX_PUBLIC_ROOMS = 20;

const StreamQuery = z.strictObject({
  rooms: z
    .string()
    .max(2000)
    .optional()
    .transform((raw) => [...new Set((raw ?? '').split(',').map((r) => r.trim()))].filter(Boolean))
    .pipe(
      z
        .array(z.string().refine(isPublicRoom, 'Only availability:property:<id> rooms can be followed'))
        .max(MAX_PUBLIC_ROOMS, `At most ${MAX_PUBLIC_ROOMS} rooms`),
    ),
});

/**
 * @param {{ hub: ReturnType<typeof import('../core/realtime/stream.js').createStreamHub>,
 *   canFollow?: (actor: import('../core/context.js').Actor, rooms: string[]) => Promise<boolean> }} options
 */
export function realtimeRoutes(options) {
  const router = express.Router();
  router.get('/stream', publicRoute(), validate({ query: StreamQuery }), (req, res, next) => {
    const ctx = contextOf(res);
    const { rooms: publicRooms } = /** @type {z.infer<typeof StreamQuery>} */ (res.locals.input.query);
    const rooms = [...roomsForActor(ctx.actor), ...publicRooms];
    if (rooms.length === 0) {
      return next(
        new ValidationError({ errors: [{ path: 'query.rooms', message: 'Sign in or name at least one room', code: 'no_rooms' }] }),
      );
    }
    if (publicRooms.length > 0 && options.canFollow) {
      options
        .canFollow(ctx.actor, publicRooms)
        .then((ok) => (ok ? openStream(options, { req, res, next }, rooms) : next(new NotFoundError('PROPERTY_NOT_FOUND'))), next);
      return;
    }
    openStream(options, { req, res, next }, rooms);
  });
  return router;
}

/**
 * @param {{ hub: ReturnType<typeof import('../core/realtime/stream.js').createStreamHub> }} options
 * @param {{ req: import('express').Request, res: import('express').Response, next: import('express').NextFunction }} http
 * @param {string[]} rooms
 */
function openStream(options, { req, res, next }, rooms) {
  const ctx = contextOf(res);
  const ip = String(req.get('cf-connecting-ip') ?? req.ip ?? 'unknown');
  options.hub.open(req, res, { rooms, ip, lastEventId: req.get('last-event-id') }).catch((error) => {
    if (res.headersSent) {
      ctx.logger.warn({ err: error }, 'realtime: stream failed after it started');
      res.end();
      return;
    }
    next(error);
  });
}
