// @ts-check
/**
 * GET /api/v1/realtime/token — a short-lived token for the self-hosted Socket.IO server,
 * listing the personal rooms of the signed-in caller (docs/plan/11-… §5).
 */
import express from 'express';

import { AppError, UnauthorizedError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { roomsForActor } from '../core/realtime/rooms.js';
import { signRealtimeToken } from '../core/realtime/token.js';

/** @param {{ secret?: string | undefined }} options */
export function realtimeRoutes(options) {
  const router = express.Router();
  router.get('/token', (_req, res, next) => {
    const ctx = contextOf(res);
    if (ctx.actor.type === 'anonymous' || ctx.actor.type === 'system') return next(new UnauthorizedError());
    if (!options.secret) return next(new AppError('REALTIME_NOT_CONFIGURED', 503, 'Live updates are not available'));
    const rooms = roomsForActor(ctx.actor);
    const sub = rooms[0] ?? 'unknown';
    res.json(signRealtimeToken({ sub, rooms }, { secret: options.secret, clock: ctx.clock }));
  });
  return router;
}
