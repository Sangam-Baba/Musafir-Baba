// @ts-check
/**
 * Room types of a property (plan Stage 03 §3.3, §5).
 * GET    /hotel/properties/:id/room-types
 * POST   /hotel/properties/:id/room-types
 * PUT    /hotel/properties/:id/room-types/:roomTypeId     — header `If-Match: <version>` required (428 / 412)
 * DELETE /hotel/properties/:id/room-types/:roomTypeId     — while the property is still being prepared
 */
import express from 'express';
import { z } from 'zod';

import { AppError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { PERMISSIONS as CATALOG, plainText } from '../modules/hotel-catalog/index.js';

const Id = z.string().regex(/^[a-f0-9]{24}$/);
const Key = z.string().regex(/^[a-z][a-z0-9-]{1,40}$/);
const Params = z.strictObject({ id: Id });
const OneParams = z.strictObject({ id: Id, roomTypeId: Id });

export const RoomTypeBody = z.strictObject({
  name: z.string().trim().min(2).max(80),
  description: z.string().max(3000).transform(plainText),
  sizeSqm: z.number().int().min(5).max(2000).nullable(),
  beds: z
    .array(z.strictObject({ bedTypeKey: Key, count: z.number().int().min(1).max(10) }))
    .min(1)
    .max(6),
  maxAdults: z.number().int().min(1).max(20),
  maxChildren: z.number().int().min(0).max(10),
  maxOccupancy: z.number().int().min(1).max(30),
  extraBeds: z.strictObject({ allowed: z.boolean(), max: z.number().int().min(0).max(5) }),
  amenities: z.array(Key).max(60),
  order: z.number().int().min(0).max(10_000).optional(),
});

/** @param {import('express').Request} req */
function versionOf(req) {
  const raw = String(req.get('if-match') ?? '')
    .replace(/^W\//, '')
    .replace(/"/g, '');
  if (!/^\d+$/.test(raw)) throw new AppError('VERSION_REQUIRED', 428, 'Send the version you loaded in the If-Match header');
  return Number(raw);
}

/** @param {{ roomTypes: ReturnType<typeof import('../modules/hotel-catalog/index.js').createRoomTypeService> }} deps */
export function roomTypeRoutes({ roomTypes }) {
  const router = express.Router();
  const read = requirePermission(CATALOG.propertyRead);
  const manage = requirePermission(CATALOG.propertyManage);
  const base = '/hotel/properties/:id/room-types';

  router.get(base, read, validate({ params: Params }), (_req, res, next) => {
    roomTypes.list(contextOf(res), res.locals.input.params.id).then((data) => res.json({ data }), next);
  });
  router.post(base, manage, validate({ params: Params, body: RoomTypeBody }), (_req, res, next) => {
    roomTypes
      .create(contextOf(res), res.locals.input.params.id, res.locals.input.body)
      .then((r) => res.status(201).set('ETag', `"${r.version}"`).json(r), next);
  });
  router.put(`${base}/:roomTypeId`, manage, validate({ params: OneParams, body: RoomTypeBody }), (req, res, next) => {
    (async () => {
      const { id, roomTypeId } = res.locals.input.params;
      const r = await roomTypes.update(contextOf(res), {
        propertyId: id,
        id: roomTypeId,
        data: res.locals.input.body,
        version: versionOf(req),
      });
      res.set('ETag', `"${r.version}"`).json(r);
    })().catch(next);
  });
  router.delete(`${base}/:roomTypeId`, manage, validate({ params: OneParams }), (_req, res, next) => {
    const { id, roomTypeId } = res.locals.input.params;
    roomTypes.remove(contextOf(res), id, roomTypeId).then(() => res.status(204).end(), next);
  });
  return router;
}
