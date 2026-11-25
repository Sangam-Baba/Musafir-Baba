// @ts-check
/**
 * Photos (plan Stage 03 §3.4, D32).
 * POST   /hotel/properties/:id/photos            — multipart form: files `thumb`, `card`, `gallery` (+ optional `hero`) made by the
 *        browser, fields `placeholder` (tiny data URL), `category`, `caption`, `roomTypeId` (for a room type's photo)
 * PATCH  /hotel/properties/:id/photos/:photoId   — {caption?, category?, order?, isCover?: true}
 * DELETE /hotel/properties/:id/photos/:photoId
 * GET    /media/<key>                            — local development only: serves the public folder from disk (production: cdn.musafirbaba.com)
 */
import express from 'express';
import { z } from 'zod';

import { AppError, NotFoundError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { publicRoute, requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { isPublicKey } from '../modules/files/index.js';
import { PERMISSIONS as CATALOG, PHOTO_CATEGORIES, VARIANTS } from '../modules/hotel-catalog/index.js';

const Id = z.string().regex(/^[a-f0-9]{24}$/);
const PhotoFields = z.strictObject({
  placeholder: z.string().max(3000),
  category: z.enum(PHOTO_CATEGORIES),
  caption: z.string().trim().max(140).optional(),
  roomTypeId: Id.optional(),
});
const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
export const rawForm = express.raw({ type: 'multipart/form-data', limit: MAX_UPLOAD_BYTES });

/**
 * Reads the multipart form with Node's built-in web `Response.formData()` (no extra package): the sizes as
 * files, everything else as text fields.
 * @param {import('express').Request} req
 */
export async function readForm(req) {
  if (!Buffer.isBuffer(req.body)) throw new AppError('PHOTO_UPLOAD_INVALID', 400, 'Send the photo as a multipart form');
  let form;
  try {
    form = await new Response(req.body, { headers: { 'content-type': String(req.get('content-type')) } }).formData();
  } catch {
    throw new AppError('PHOTO_UPLOAD_INVALID', 400, 'Send the photo as a multipart form');
  }
  /** @type {Record<string, Buffer>} */
  const files = {};
  /** @type {Record<string, string>} */
  const fields = {};
  for (const [name, value] of form.entries()) {
    if (typeof value === 'string') fields[name] = value;
    else if (name in VARIANTS) files[name] = Buffer.from(await value.arrayBuffer());
    else throw new AppError('PHOTO_UPLOAD_INVALID', 400, `Unexpected file "${name}"`);
  }
  return { files, fields };
}

/** @param {z.ZodError} error */
const invalid = (error) =>
  new AppError('VALIDATION_FAILED', 400, 'The request is not valid', {
    errors: error.issues.map((i) => ({ path: `body.${i.path.join('.')}`, message: i.message, code: i.code })),
  });

/**
 * @param {{ photos: ReturnType<typeof import('../modules/hotel-catalog/index.js').createPhotoService>,
 *   properties: ReturnType<typeof import('../modules/hotel-catalog/index.js').createPropertyService>,
 *   store: import('../modules/files/public-storage.js').PublicStore }} deps
 */
export function photoRoutes(deps) {
  const router = express.Router();
  const manage = requirePermission(CATALOG.propertyManage);
  const one = z.strictObject({ id: Id, photoId: Id });

  router.post('/hotel/properties/:id/photos', manage, validate({ params: z.strictObject({ id: Id }) }), rawForm, (req, res, next) => {
    (async () => {
      const form = await readForm(req);
      const fields = PhotoFields.safeParse(form.fields);
      if (!fields.success) throw invalid(fields.error);
      const files = form.files;
      const ctx = contextOf(res);
      const photoId = await deps.photos.add(ctx, res.locals.input.params.id, {
        files,
        placeholder: fields.data.placeholder,
        category: fields.data.category,
        caption: fields.data.caption ?? null,
        roomTypeId: fields.data.roomTypeId ?? null,
      });
      const property = await deps.properties.get(ctx, res.locals.input.params.id);
      res.status(201).json({ photoId, property });
    })().catch(next);
  });

  router.patch(
    '/hotel/properties/:id/photos/:photoId',
    manage,
    validate({
      params: one,
      body: z.strictObject({
        caption: z.string().trim().max(140).nullable().optional(),
        category: z.enum(PHOTO_CATEGORIES).optional(),
        order: z.number().int().min(0).max(100_000).optional(),
        isCover: z.literal(true).optional(),
      }),
    }),
    (_req, res, next) => {
      const { id, photoId } = res.locals.input.params;
      const ctx = contextOf(res);
      deps.photos
        .update(ctx, { propertyId: id, photoId, patch: res.locals.input.body })
        .then(() => deps.properties.get(ctx, id))
        .then((p) => res.json(p), next);
    },
  );

  router.delete('/hotel/properties/:id/photos/:photoId', manage, validate({ params: one }), (_req, res, next) => {
    const { id, photoId } = res.locals.input.params;
    deps.photos.remove(contextOf(res), id, photoId).then(() => res.status(204).end(), next);
  });

  router.use(mediaRoute(deps.store));
  return router;
}

/** Local development: the public folder served from disk. @param {import('../modules/files/public-storage.js').PublicStore} store */
function mediaRoute(store) {
  const router = express.Router();
  const deps = { store };
  router.get('/media/*key', publicRoute(), (req, res, next) => {
    const key = [req.params.key].flat().join('/');
    if (!deps.store.read || !isPublicKey(key)) return next(new NotFoundError());
    deps.store.read(key).then(
      (bytes) =>
        res
          .set({
            'Content-Type': key.endsWith('.webp') ? 'image/webp' : 'image/jpeg',
            'Cache-Control': 'public, max-age=86400',
            'X-Content-Type-Options': 'nosniff',
          })
          .send(bytes),
      () => next(new NotFoundError()),
    );
  });
  return router;
}
