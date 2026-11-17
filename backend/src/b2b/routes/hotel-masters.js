// @ts-check
/**
 * Master lists (plan Stage 03 §3.1).
 * GET   /catalog/masters                       — active entries for everyone (reference data, nothing private)
 * GET   /admin/masters                         — everything incl. switched-off entries (`hotel-catalog.listing.read`)
 * POST  /admin/masters/cities                  · PATCH /admin/masters/cities/:id
 * POST  /admin/masters/cities/:id/areas        · PATCH /admin/masters/cities/:id/areas/:areaId
 * POST  /admin/masters/:kind                   · PATCH /admin/masters/:kind/:id   (amenities, property-types, bed-types, meal-plans)
 * Changes need `hotel-catalog.master.manage`. Nothing is deleted — `active: false` switches an entry off.
 */
import express from 'express';
import { z } from 'zod';

import { ForbiddenError, ValidationError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { publicRoute, requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { AMENITY_LEVELS, PERMISSIONS as CATALOG } from '../modules/hotel-catalog/index.js';
import { GST_STATES } from '../modules/kyc/index.js';

const Id = z.string().regex(/^[a-f0-9]{24}$/);
const Key = z.string().regex(/^[a-z][a-z0-9-]{1,40}$/);
const Name = z.string().trim().min(2).max(80);
const Order = z.number().int().min(0).max(10_000);
const Kind = z.enum(['amenities', 'property-types', 'bed-types', 'meal-plans']);
const StateCode = z.string().refine((c) => Object.prototype.hasOwnProperty.call(GST_STATES, c), 'unknown state code');

/** What each kind needs when it is created; on change every field (except the key) is optional. */
const CREATE = {
  amenities: z.strictObject({
    key: Key,
    name: Name,
    level: z.enum(AMENITY_LEVELS),
    group: z.string().trim().min(2).max(40),
    icon: z.string().max(40).nullish(),
    order: Order.optional(),
  }),
  'property-types': z.strictObject({ key: Key, name: Name, order: Order.optional() }),
  'bed-types': z.strictObject({ key: Key, name: Name, order: Order.optional() }),
  'meal-plans': z.strictObject({
    key: Key,
    code: z.string().regex(/^[A-Z]{1,6}$/),
    name: Name,
    description: z.string().trim().max(200).nullish(),
    order: Order.optional(),
  }),
};
const PATCH = {
  amenities: CREATE.amenities.omit({ key: true }).partial().extend({ active: z.boolean().optional() }),
  'property-types': CREATE['property-types'].omit({ key: true }).partial().extend({ active: z.boolean().optional() }),
  'bed-types': CREATE['bed-types'].omit({ key: true }).partial().extend({ active: z.boolean().optional() }),
  'meal-plans': CREATE['meal-plans'].omit({ key: true }).partial().extend({ active: z.boolean().optional() }),
};
const CityBody = z.strictObject({
  name: Name,
  stateCode: StateCode,
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusKm: z.number().int().min(1).max(200),
  order: Order.optional(),
});

/** @param {import('express').Response} res */
function staffOf(res) {
  const { actor } = contextOf(res);
  if (actor.type !== 'staff') throw new ForbiddenError();
  return `staff:${actor.staffId}`;
}

/** @param {(res: import('express').Response) => Promise<unknown>} fn @param {number} [status] @returns {import('express').RequestHandler} */
const handle =
  (fn, status = 200) =>
  (_req, res, next) => {
    Promise.resolve()
      .then(() => fn(res))
      .then((body) => res.status(status).json(body), next);
  };

/** @param {{ masters: ReturnType<typeof import('../modules/hotel-catalog/index.js').createMastersService> }} deps */
export function masterRoutes({ masters }) {
  const router = express.Router();
  const manage = requirePermission(CATALOG.masterManage);
  router.get(
    '/catalog/masters',
    publicRoute(),
    handle(() => masters.list()),
  );
  router.get(
    '/admin/masters',
    requirePermission(CATALOG.listingRead),
    handle(() => masters.list({ includeInactive: true })),
  );
  router.use(cityRoutes(masters, manage));

  router.post('/admin/masters/:kind', manage, validate({ params: z.strictObject({ kind: Kind }) }), (req, res, next) => {
    const kind = /** @type {z.infer<typeof Kind>} */ (res.locals.input.params.kind);
    const body = CREATE[kind].safeParse(req.body);
    if (!body.success) return next(validationError(body.error));
    handle((r) => masters.create(kind, body.data, staffOf(r)), 201)(req, res, next);
  });
  router.patch('/admin/masters/:kind/:id', manage, validate({ params: z.strictObject({ kind: Kind, id: Id }) }), (req, res, next) => {
    const { kind, id } = /** @type {{ kind: z.infer<typeof Kind>, id: string }} */ (res.locals.input.params);
    const body = PATCH[kind].safeParse(req.body);
    if (!body.success) return next(validationError(body.error));
    handle((r) => masters.update(kind, id, body.data, staffOf(r)))(req, res, next);
  });
  return router;
}

/**
 * @param {ReturnType<typeof import('../modules/hotel-catalog/index.js').createMastersService>} masters
 * @param {import('express').RequestHandler} manage
 */
function cityRoutes(masters, manage) {
  const router = express.Router();
  const AreaParams = z.strictObject({ id: Id, areaId: Id });
  router.post(
    '/admin/masters/cities',
    manage,
    validate({ body: CityBody }),
    handle((res) => masters.createCity(res.locals.input.body, staffOf(res)), 201),
  );
  router.patch(
    '/admin/masters/cities/:id',
    manage,
    validate({ params: z.strictObject({ id: Id }), body: CityBody.partial().extend({ active: z.boolean().optional() }) }),
    handle((res) => masters.updateCity(res.locals.input.params.id, res.locals.input.body, staffOf(res))),
  );
  router.post(
    '/admin/masters/cities/:id/areas',
    manage,
    validate({ params: z.strictObject({ id: Id }), body: z.strictObject({ name: Name }) }),
    handle((res) => masters.addArea(res.locals.input.params.id, res.locals.input.body, staffOf(res)), 201),
  );
  router.patch(
    '/admin/masters/cities/:id/areas/:areaId',
    manage,
    validate({ params: AreaParams, body: z.strictObject({ name: Name.optional(), active: z.boolean().optional() }) }),
    handle((res) => masters.updateArea(res.locals.input.params.id, res.locals.input.params.areaId, res.locals.input.body, staffOf(res))),
  );
  return router;
}

/** @param {z.ZodError} error */
function validationError(error) {
  return new ValidationError({ errors: error.issues.map((i) => ({ path: `body.${i.path.join('.')}`, message: i.message, code: i.code })) });
}
