// @ts-check
/**
 * Stage 18 B3 routes (mounted by `busCatalogRoutes`, so they also answer 503 `BUS_NOT_ENABLED` while the switch is off):
 *   operator  GET / POST /bus/stops · PATCH /bus/stops/:id
 *             GET / POST /bus/routes · GET / PATCH /bus/routes/:id · POST /bus/routes/:id/copy|submit|retire
 *             GET / POST /bus/schedules · POST /bus/schedules/:id/end {from}
 *             (`bus-catalog.route.read` to read, `.manage` to change)
 *             GET /bus/trips?from&to&routeId · GET /bus/trips/:id   (`bus-inventory.trip.read`)
 *             GET / PUT /bus/routes/:id/fares {rows, rules, expectedVersion}   (read: route.read · save: `bus-catalog.fare.manage`)
 *             GET / PUT /bus/cancellation-policy {slabs, expectedVersion}   (read: route.read · save: `bus-catalog.fare.manage`)
 *   admin     GET /admin/bus/routes?status · POST /admin/bus/routes/:id/decide {move, note}   (`platform.bus.review`)
 */
import { z } from 'zod';

import { DomainError } from '../core/errors.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import {
  addDays,
  createCancellationPolicies,
  createFares,
  createRouteReview,
  createRoutes,
  createSchedules,
  createStops,
  MAX_STOPS,
  PERMISSIONS as BUS,
} from '../modules/bus-catalog/index.js';
import { createTrips, PERMISSIONS as TRIPS } from '../modules/bus-inventory/index.js';
import { DateStr, Id, input, operatorOf, Params, ReviewBody, ReviewStatus, Version, withOperatorNames } from './bus-http.js';
import { handle, staffOf } from './payout-finance-admin.js';

/** @typedef {{ clock: import('../core/clock.js').Clock, today: () => string, cityExists: (cityId: string) => Promise<boolean> }} BusRouteDeps */

const Name = z.string().trim().min(2).max(80);
const StopFields = {
  name: Name,
  address: z.string().trim().max(200).nullish(),
  landmark: z.string().trim().max(80).nullish(),
  lat: z.number().min(-90).max(90).nullish(),
  lng: z.number().min(-180).max(180).nullish(),
};
const RouteStops = z
  .array(
    z.strictObject({
      stopId: Id,
      dayOffset: z.number().int().min(0).max(3),
      time: z.string().regex(/^\d{2}:\d{2}$/),
      boarding: z.boolean(),
      dropping: z.boolean(),
    }),
  )
  .min(2)
  .max(MAX_STOPS);

/** @param {import('express').Router} router @param {ReturnType<typeof createStops>} stops */
function stopRoutes(router, stops) {
  const read = requirePermission(BUS.routeRead);
  const manage = requirePermission(BUS.routeManage);
  router.get(
    '/bus/stops',
    read,
    handle(async (_q, res) => ({ data: await stops.list(operatorOf(res).orgId) })),
  );
  router.post(
    '/bus/stops',
    manage,
    validate({ body: z.strictObject({ cityId: Id, ...StopFields }) }),
    handle(async (_q, res) => stops.create(operatorOf(res), input(res).body), 201),
  );
  router.patch(
    '/bus/stops/:id',
    manage,
    validate({
      params: Params,
      body: z.strictObject({ ...StopFields, name: Name.optional(), active: z.boolean().optional(), expectedVersion: Version }),
    }),
    handle(async (_q, res) => stops.update(operatorOf(res), input(res).params.id, input(res).body)),
  );
}

/** @param {import('express').Router} router @param {ReturnType<typeof createRoutes>} routes */
function routeRoutes(router, routes) {
  const read = requirePermission(BUS.routeRead);
  const manage = requirePermission(BUS.routeManage);
  router.get(
    '/bus/routes',
    read,
    handle(async (_q, res) => ({ data: await routes.list(operatorOf(res).orgId) })),
  );
  router.post(
    '/bus/routes',
    manage,
    validate({ body: z.strictObject({ name: z.string().trim().min(2).max(120), stops: RouteStops }) }),
    handle(async (_q, res) => routes.create(operatorOf(res), input(res).body), 201),
  );
  router.get(
    '/bus/routes/:id',
    read,
    validate({ params: Params }),
    handle(async (_q, res) => routes.get(operatorOf(res).orgId, input(res).params.id)),
  );
  router.patch(
    '/bus/routes/:id',
    manage,
    validate({
      params: Params,
      body: z.strictObject({ name: z.string().trim().min(2).max(120).optional(), stops: RouteStops.optional(), expectedVersion: Version }),
    }),
    handle(async (_q, res) => routes.update(operatorOf(res), input(res).params.id, input(res).body)),
  );
  router.post(
    '/bus/routes/:id/copy',
    manage,
    validate({ params: Params, body: z.strictObject({ name: z.string().trim().min(2).max(120) }) }),
    handle(async (_q, res) => routes.copy(operatorOf(res), input(res).params.id, input(res).body.name), 201),
  );
  for (const action of /** @type {const} */ (['submit', 'retire']))
    router.post(
      `/bus/routes/:id/${action}`,
      manage,
      validate({ params: Params, body: z.strictObject({ expectedVersion: Version }) }),
      handle(async (_q, res) => routes[action](operatorOf(res), input(res).params.id, input(res).body.expectedVersion)),
    );
}

/**
 * Schedules; ending one cancels its unsold trips at once (the trip job repeats it).
 * @param {import('express').Router} router @param {ReturnType<typeof createSchedules>} schedules @param {ReturnType<typeof createTrips>} trips
 */
function scheduleRoutes(router, schedules, trips) {
  const read = requirePermission(BUS.routeRead);
  const manage = requirePermission(BUS.routeManage);
  router.get(
    '/bus/schedules',
    read,
    handle(async (_q, res) => ({ data: await schedules.list(operatorOf(res).orgId) })),
  );
  router.post(
    '/bus/schedules',
    manage,
    validate({
      body: z.strictObject({
        routeId: Id,
        vehicleId: Id,
        weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
        validFrom: DateStr,
        validTo: DateStr.nullable(),
      }),
    }),
    handle(async (_q, res) => schedules.create(operatorOf(res), input(res).body), 201),
  );
  router.post(
    '/bus/schedules/:id/end',
    manage,
    validate({ params: Params, body: z.strictObject({ from: DateStr, expectedVersion: Version }) }),
    handle(async (_q, res) => {
      const s = await schedules.end(operatorOf(res), input(res).params.id, input(res).body);
      return { ...s, tripsCancelled: await trips.cancelUnsold(s.id, input(res).body.from) };
    }),
  );
}

/** @param {import('express').Router} router @param {ReturnType<typeof createTrips>} trips @param {() => string} today */
function tripRoutes(router, trips, today) {
  const read = requirePermission(TRIPS.tripRead);
  router.get(
    '/bus/trips',
    read,
    validate({ query: z.strictObject({ from: DateStr.optional(), to: DateStr.optional(), routeId: Id.optional() }) }),
    handle(async (_q, res) => {
      const q = input(res).query;
      const from = q.from ?? today();
      const to = q.to ?? addDays(from, 6);
      if (to < from || to > addDays(from, 31)) throw new DomainError('DATE_RANGE_INVALID');
      return { data: await trips.list(operatorOf(res).orgId, { from, to, routeId: q.routeId }) };
    }),
  );
  router.get(
    '/bus/trips/:id',
    read,
    validate({ params: Params }),
    handle(async (_q, res) => trips.get(operatorOf(res).orgId, input(res).params.id)),
  );
}

const FareRows = z
  .array(
    z.strictObject({
      fromIdx: z
        .number()
        .int()
        .min(0)
        .max(MAX_STOPS - 1),
      toIdx: z
        .number()
        .int()
        .min(1)
        .max(MAX_STOPS - 1),
      seatType: z.enum(['SEATER', 'SEMI_SLEEPER', 'SLEEPER']),
      deck: z.enum(['LOWER', 'UPPER']).nullable(),
      netPaise: z.number().int(),
    }),
  )
  .max(2000);
const DateRules = z
  .array(
    z.strictObject({
      id: z.string().max(20).nullish(),
      label: z.string().trim().min(1).max(60),
      from: DateStr,
      to: DateStr,
      weekdays: z.array(z.number().int().min(0).max(6)).max(7),
      addPaise: z.number().int(),
    }),
  )
  .max(50);

/** @param {import('express').Router} router @param {ReturnType<typeof createFares>} fares */
function fareRoutes(router, fares) {
  router.get(
    '/bus/routes/:id/fares',
    requirePermission(BUS.routeRead),
    validate({ params: Params }),
    handle(async (_q, res) => fares.get(operatorOf(res).orgId, input(res).params.id)),
  );
  router.put(
    '/bus/routes/:id/fares',
    requirePermission(BUS.fareManage),
    validate({ params: Params, body: z.strictObject({ rows: FareRows, rules: DateRules, expectedVersion: z.number().int().min(0) }) }),
    handle(async (_q, res) => fares.save(operatorOf(res), input(res).params.id, input(res).body)),
  );
}

/** @param {import('express').Router} router @param {ReturnType<typeof createCancellationPolicies>} policies */
function policyRoutes(router, policies) {
  router.get(
    '/bus/cancellation-policy',
    requirePermission(BUS.routeRead),
    handle(async (_q, res) => policies.get(operatorOf(res).orgId)),
  );
  router.put(
    '/bus/cancellation-policy',
    requirePermission(BUS.fareManage),
    validate({
      body: z.strictObject({
        slabs: z.array(z.strictObject({ hoursBefore: z.number().int(), percent: z.number().int() })).max(8),
        expectedVersion: z.number().int().min(0),
      }),
    }),
    handle(async (_q, res) => policies.save(operatorOf(res), input(res).body)),
  );
}

/** @param {import('express').Router} router @param {ReturnType<typeof createRouteReview>} review */
function routeReviewRoutes(router, review) {
  const reviewer = requirePermission(BUS.platformReview);
  router.get(
    '/admin/bus/routes',
    reviewer,
    validate({ query: z.strictObject({ status: ReviewStatus.optional() }) }),
    handle(async (_q, res) => ({ data: await withOperatorNames(await review.queue(input(res).query)) })),
  );
  router.post(
    '/admin/bus/routes/:id/decide',
    reviewer,
    validate({ params: Params, body: ReviewBody }),
    handle(async (_q, res) => review.decide(staffOf(res), input(res).params.id, input(res).body.move, input(res).body.note ?? null)),
  );
}

/** @param {import('express').Router} router @param {BusRouteDeps} deps */
export function addBusRouteRoutes(router, deps) {
  const stops = createStops({ cityExists: deps.cityExists });
  const schedules = createSchedules({ today: deps.today });
  const trips = createTrips({ today: deps.today, catalog: schedules });
  stopRoutes(router, stops);
  routeRoutes(router, createRoutes({ clock: deps.clock, stops }));
  fareRoutes(router, createFares({ clock: deps.clock }));
  policyRoutes(router, createCancellationPolicies({ clock: deps.clock }));
  scheduleRoutes(router, schedules, trips);
  tripRoutes(router, trips, deps.today);
  routeReviewRoutes(router, createRouteReview({ clock: deps.clock }));
}
