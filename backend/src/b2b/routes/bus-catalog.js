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
import { systemScope } from '../core/db/tenant-plugin.js';
import { ForbiddenError, ServiceUnavailableError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
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
import { OrganizationRecord } from '../modules/organizations/index.js';
import { handle, staffOf } from './payout-finance-admin.js';

const Id = z.string().regex(/^[a-f0-9]{24}$/);
const Params = z.strictObject({ id: Id });
const Version = z.number().int().min(1);
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

/** The signed-in bus operator. @param {import('express').Response} res */
function operatorOf(res) {
  const { actor } = contextOf(res);
  if (actor.type !== 'member' || actor.orgType !== 'BUS_OPERATOR') throw new ForbiddenError();
  return { orgId: actor.orgId, userId: actor.userId };
}
/** @param {import('express').Response} res */
const input = (res) => /** @type {{ params: any, query: any, body: any }} */ (res.locals.input);

/**
 * @typedef {{ clock: import('../core/clock.js').Clock, env: NodeJS.ProcessEnv,
 *   files: { describe: (orgId: string, fileId: string) => Promise<{ purpose: string } | null> } }} BusCatalogDeps
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

const NAMES_SCOPE = systemScope('bus review: operator company names', { routine: true });

/** Adds each operator's company name and reference to the review queue. @param {{ operatorOrgId: string }[]} list */
async function withOperatorNames(list) {
  const orgs = await OrganizationRecord.find(
    { _id: { $in: [...new Set(list.map((v) => v.operatorOrgId))] } },
    { displayName: 1, reference: 1 },
  )
    .setOptions(NAMES_SCOPE)
    .lean();
  const byId = new Map(orgs.map((o) => [String(o._id), o]));
  return list.map((v) => ({
    ...v,
    operatorName: byId.get(v.operatorOrgId)?.displayName ?? null,
    operatorRef: byId.get(v.operatorOrgId)?.reference ?? null,
  }));
}

/** @param {import('express').Router} router @param {ReturnType<typeof createBusReview>} review */
function reviewRoutes(router, review) {
  const reviewer = requirePermission(BUS.platformReview);
  router.get(
    '/admin/bus/vehicles',
    reviewer,
    validate({
      query: z.strictObject({ status: z.enum(['SUBMITTED', 'APPROVED', 'CHANGES_REQUESTED', 'SUSPENDED', 'DRAFT', 'RETIRED']).optional() }),
    }),
    handle(async (_q, res) => ({ data: await withOperatorNames(await review.queue(input(res).query)) })),
  );
  router.post(
    '/admin/bus/vehicles/:id/decide',
    reviewer,
    validate({
      params: Params,
      body: z.strictObject({
        move: z.enum(['approve', 'requestChanges', 'suspend', 'reinstate', 'retire']),
        note: z.string().trim().max(500).nullish(),
      }),
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
  return router;
}
