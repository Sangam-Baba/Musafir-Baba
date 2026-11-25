// @ts-check
/**
 * Stage 18 B2 routes — answer 503 `BUS_NOT_ENABLED` unless `B2B_BUS_ENABLED=true`:
 *   operator  GET /bus/layout-templates · GET / POST /bus/layouts · PATCH /bus/layouts/:id · POST /bus/layouts/:id/copy
 *             GET / POST /bus/vehicles · GET / PATCH /bus/vehicles/:id · PUT /bus/vehicles/:id/papers
 *             POST /bus/vehicles/:id/submit · POST /bus/vehicles/:id/retire
 *             (`bus-catalog.vehicle.read` to read, `.manage` to change; bus operators only)
 *   admin     GET /admin/bus/vehicles?status · POST /admin/bus/vehicles/:id/decide {move, note}   (`platform.bus.review`)
 * Papers are uploaded first with `POST /files?purpose=bus-paper`, then attached here with their number and expiry.
 */
import express from 'express';
import { z } from 'zod';

import { todayIn } from '../core/dates.js';
import { ServiceUnavailableError } from '../core/errors.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import {
  AMENITIES,
  createBusReview,
  createLayouts,
  createVehicles,
  DECKS,
  PAPER_KINDS,
  PERMISSIONS as BUS,
  SEAT_TYPES,
} from '../modules/bus-catalog/index.js';
import { Id, input, operatorOf, Params, ReviewBody, ReviewStatus, Version, withOperatorNames } from './bus-http.js';
import { addBusRouteRoutes } from './bus-routes.js';
import { addBusSeatRoutes } from './bus-seats.js';
import { handle, staffOf } from './payout-finance-admin.js';

const Seat = z.strictObject({
  no: z.string().trim().min(1).max(6),
  row: z.number().int().min(0).max(19),
  col: z.number().int().min(0).max(7),
  type: z.enum(SEAT_TYPES),
  ladies: z.boolean().optional(),
  span: z.union([z.literal(1), z.literal(2)]).optional(),
});
const Decks = z
  .array(
    z.strictObject({
      deck: z.enum(DECKS),
      rows: z.number().int().min(1).max(20),
      cols: z.number().int().min(1).max(8),
      seats: z.array(Seat).max(80),
    }),
  )
  .min(1)
  .max(2);
const Kind = z.enum(['SEATER', 'SLEEPER', 'SEMI_SLEEPER', 'MIXED']);

/**
 * @typedef {{ clock: import('../core/clock.js').Clock, env: NodeJS.ProcessEnv,
 *   files: { describe: (orgId: string, fileId: string) => Promise<{ purpose: string } | null> },
 *   cityExists: (cityId: string) => Promise<boolean> }} BusCatalogDeps
 */

/** @param {import('express').Router} router @param {ReturnType<typeof createLayouts>} layouts */
function layoutRoutes(router, layouts) {
  const read = requirePermission(BUS.vehicleRead);
  const manage = requirePermission(BUS.vehicleManage);
  router.get(
    '/bus/layout-templates',
    read,
    handle(async () => ({ data: layouts.templates() })),
  );
  router.get(
    '/bus/layouts',
    read,
    handle(async (_q, res) => ({ data: await layouts.list(operatorOf(res).orgId) })),
  );
  router.post(
    '/bus/layouts',
    manage,
    validate({
      body: z.strictObject({ name: z.string().trim().min(2).max(80), template: z.string().max(40).optional(), decks: Decks.optional() }),
    }),
    handle(async (_q, res) => layouts.create(operatorOf(res), input(res).body), 201),
  );
  router.patch(
    '/bus/layouts/:id',
    manage,
    validate({
      params: Params,
      body: z.strictObject({ name: z.string().trim().min(2).max(80).optional(), decks: Decks.optional(), expectedVersion: Version }),
    }),
    handle(async (_q, res) => layouts.update(operatorOf(res), input(res).params.id, input(res).body)),
  );
  router.post(
    '/bus/layouts/:id/copy',
    manage,
    validate({ params: Params, body: z.strictObject({ name: z.string().trim().min(2).max(80) }) }),
    handle(async (_q, res) => layouts.copy(operatorOf(res), input(res).params.id, input(res).body.name), 201),
  );
}

/** @param {import('express').Router} router @param {ReturnType<typeof createVehicles>} vehicles */
function vehicleRoutes(router, vehicles) {
  const read = requirePermission(BUS.vehicleRead);
  const manage = requirePermission(BUS.vehicleManage);
  const Details = {
    name: z.string().trim().max(80).nullish(),
    acType: z.enum(['AC', 'NON_AC']),
    kind: Kind,
    layoutId: Id.nullish(),
    amenities: z.array(z.enum(AMENITIES)).max(AMENITIES.length).optional(),
  };
  router.get(
    '/bus/vehicles',
    read,
    handle(async (_q, res) => ({ data: await vehicles.list(operatorOf(res).orgId) })),
  );
  router.post(
    '/bus/vehicles',
    manage,
    validate({ body: z.strictObject({ regNo: z.string().trim().min(4).max(15), ...Details }) }),
    handle(async (_q, res) => vehicles.create(operatorOf(res), input(res).body), 201),
  );
  router.get(
    '/bus/vehicles/:id',
    read,
    validate({ params: Params }),
    handle(async (_q, res) => vehicles.get(operatorOf(res).orgId, input(res).params.id)),
  );
  router.patch(
    '/bus/vehicles/:id',
    manage,
    validate({
      params: Params,
      body: z.strictObject({
        name: Details.name,
        acType: Details.acType.optional(),
        kind: Kind.optional(),
        layoutId: Details.layoutId,
        amenities: Details.amenities,
        expectedVersion: Version,
      }),
    }),
    handle(async (_q, res) => vehicles.update(operatorOf(res), input(res).params.id, input(res).body)),
  );
  vehicleActions(router, vehicles, manage);
}

/** Papers, submit and retire. @param {import('express').Router} router @param {ReturnType<typeof createVehicles>} vehicles @param {import('express').RequestHandler} manage */
function vehicleActions(router, vehicles, manage) {
  router.put(
    '/bus/vehicles/:id/papers',
    manage,
    validate({
      params: Params,
      body: z.strictObject({
        kind: z.enum(PAPER_KINDS),
        fileId: Id,
        number: z.string().trim().min(2).max(40),
        expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        expectedVersion: Version,
      }),
    }),
    handle(async (_q, res) => vehicles.setPaper(operatorOf(res), input(res).params.id, input(res).body)),
  );
  for (const action of /** @type {const} */ (['submit', 'retire']))
    router.post(
      `/bus/vehicles/:id/${action}`,
      manage,
      validate({ params: Params, body: z.strictObject({ expectedVersion: Version }) }),
      handle(async (_q, res) => vehicles[action](operatorOf(res), input(res).params.id, input(res).body.expectedVersion)),
    );
}

/** @param {import('express').Router} router @param {ReturnType<typeof createBusReview>} review */
function reviewRoutes(router, review) {
  const reviewer = requirePermission(BUS.platformReview);
  router.get(
    '/admin/bus/vehicles',
    reviewer,
    validate({
      query: z.strictObject({ status: ReviewStatus.optional() }),
    }),
    handle(async (_q, res) => ({ data: await withOperatorNames(await review.queue(input(res).query)) })),
  );
  router.post(
    '/admin/bus/vehicles/:id/decide',
    reviewer,
    validate({
      params: Params,
      body: ReviewBody,
    }),
    handle(async (_q, res) => review.decide(staffOf(res), input(res).params.id, input(res).body.move, input(res).body.note ?? null)),
  );
}

/** @param {BusCatalogDeps} deps */
export function busCatalogRoutes(deps) {
  const router = express.Router();
  if (deps.env.B2B_BUS_ENABLED !== 'true') {
    router.use(['/bus', '/admin/bus'], (_req, _res, next) => next(new ServiceUnavailableError('BUS_NOT_ENABLED')));
    return router;
  }
  const today = () => todayIn(deps.clock, 'Asia/Kolkata');
  layoutRoutes(router, createLayouts());
  vehicleRoutes(router, createVehicles({ clock: deps.clock, today, files: deps.files }));
  reviewRoutes(router, createBusReview({ clock: deps.clock, today }));
  addBusRouteRoutes(router, { clock: deps.clock, today, cityExists: deps.cityExists });
  addBusSeatRoutes(router, { clock: deps.clock });
  return router;
}
