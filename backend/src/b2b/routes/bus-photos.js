// @ts-check
/**
 * Stage 18 B8 — bus photos (mounted by `busCatalogRoutes`, 503 while `B2B_BUS_ENABLED` is off):
 *   POST   /bus/vehicles/:id/photos           multipart: files `thumb`, `card`, `gallery` (+ `hero`) made by the browser,
 *                                            fields `placeholder`, `category` (OUTSIDE | INSIDE | SEATS | OTHER), `caption`
 *   DELETE /bus/vehicles/:id/photos/:photoId                                                  (`bus-catalog.vehicle.manage`)
 * Same checks and public folder as hotel photos (the hotel photo check is passed into the bus module, which never
 * imports hotel code).
 */
import { z } from 'zod';

import { AppError } from '../core/errors.js';
import { systemScope } from '../core/db/tenant-plugin.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { BUS_PHOTO_CATEGORIES, createBusPhotos, PERMISSIONS as BUS } from '../modules/bus-catalog/index.js';
import { publicStoreFromEnv } from '../modules/files/index.js';
import { checkPhoto, checkPlaceholder } from '../modules/hotel-catalog/index.js';
import { OrganizationRecord } from '../modules/organizations/index.js';
import { Id, input, operatorOf, Params } from './bus-http.js';
import { rawForm, readForm } from './hotel-photos.js';
import { handle } from './payout-finance-admin.js';

const SCOPE = systemScope('bus photos: company reference', { routine: true });
const Fields = z.strictObject({
  placeholder: z.string().max(3000),
  category: z.enum(BUS_PHOTO_CATEGORIES),
  caption: z.string().trim().max(140).optional(),
});

/** @param {import('express').Router} router @param {{ env: NodeJS.ProcessEnv, clock: import('../core/clock.js').Clock }} deps */
export function addBusPhotoRoutes(router, deps) {
  const photos = createBusPhotos({
    store: publicStoreFromEnv(deps.env),
    clock: deps.clock,
    checkPhoto: /** @type {any} */ (checkPhoto),
    checkPlaceholder,
  });
  const manage = requirePermission(BUS.vehicleManage);
  router.post('/bus/vehicles/:id/photos', manage, validate({ params: Params }), rawForm, (req, res, next) => {
    (async () => {
      const who = operatorOf(res);
      const { files, fields } = await readForm(req);
      const parsed = Fields.safeParse(fields);
      if (!parsed.success) throw new AppError('VALIDATION_FAILED', 400, 'The request is not valid');
      const org = await OrganizationRecord.findById(who.orgId, { reference: 1 }).setOptions(SCOPE).lean();
      if (!org?.reference) throw new AppError('ORG_NOT_FOUND', 404, 'Company not found');
      const r = await photos.add({ ...who, orgRef: org.reference }, input(res).params.id, { files, ...parsed.data });
      res.status(201).json(r);
    })().catch(next);
  });
  router.delete(
    '/bus/vehicles/:id/photos/:photoId',
    manage,
    validate({ params: z.strictObject({ id: Id, photoId: Id }) }),
    handle(async (_q, res) => photos.remove(operatorOf(res), input(res).params.id, input(res).params.photoId)),
  );
}
