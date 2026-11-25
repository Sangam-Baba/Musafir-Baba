// @ts-check
/**
 * Stage 18 B5 — bus search for buyers. Answers 503 `BUS_SELLING_NOT_ENABLED` unless both `B2B_BUS_ENABLED` and
 * `B2B_BUS_SELLING_ENABLED` are `true`.
 *   GET /buses/search?from&to&date[&ac&seatType&departFrom&departTo&maxPrice&operator&sort]   trips A → B on a date
 *   GET /buses/trips/:id/seats?from&to                                                        seat map for a journey
 * Who asks decides the price channel (search gateway): website visitors (per-IP limit) or members of an active client
 * company with `bus-booking.search.use` (B2B prices, per-user and per-company limits). Bus searches use their own
 * limit counters and are not counted as hotel usage.
 */
import express from 'express';
import { z } from 'zod';

import { systemScope } from '../core/db/tenant-plugin.js';
import { ServiceUnavailableError } from '../core/errors.js';
import { publicRoute } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { createBusSearch, PERMISSIONS as BUS_BOOKING } from '../modules/bus-booking/index.js';
import { OrganizationRecord } from '../modules/organizations/index.js';
import { DateStr, Id, input } from './bus-http.js';
import { createSearchGate } from './search-gateway.js';

const SCOPE = systemScope('bus search: company names and status', { routine: true });
const Time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const SearchQuery = z.strictObject({
  from: Id,
  to: Id,
  date: DateStr,
  ac: z.enum(['AC', 'NON_AC']).optional(),
  seatType: z.enum(['SEATER', 'SEMI_SLEEPER', 'SLEEPER']).optional(),
  departFrom: Time.optional(),
  departTo: Time.optional(),
  maxPrice: z.coerce.number().int().min(1).max(10_000_000).optional(),
  operator: Id.optional(),
  sort: z.enum(['departure', 'price']).optional(),
});

/** @param {string[]} ids */
async function operators(ids) {
  const orgs = await OrganizationRecord.find({ _id: { $in: ids }, type: 'BUS_OPERATOR' }, { displayName: 1, status: 1 })
    .setOptions(SCOPE)
    .lean();
  return new Map(orgs.map((o) => [String(o._id), { name: o.displayName, active: o.status === 'ACTIVE' }]));
}

/** @param {string} orgId */
async function orgInfo(orgId) {
  const o = /^[a-f0-9]{24}$/.test(orgId)
    ? await OrganizationRecord.findById(orgId, { type: 1, status: 1, clientCategory: 1 }).setOptions(SCOPE).lean()
    : null;
  return o ? { type: o.type, status: o.status, clientCategory: /** @type {any} */ (o).clientCategory ?? null } : null;
}

/** @param {import('express').Response} res */
const callerOf = (res) => {
  const c = res.locals.searchCaller;
  return { channel: c.channel, clientOrgId: c.clientOrgId, clientCategory: c.clientCategory };
};

/**
 * @param {{ clock: import('../core/clock.js').Clock, env: NodeJS.ProcessEnv, stateOf: (cityId: string) => Promise<string | null> }} deps
 */
export function busSearchRoutes(deps) {
  const router = express.Router();
  if (deps.env.B2B_BUS_ENABLED !== 'true' || deps.env.B2B_BUS_SELLING_ENABLED !== 'true') {
    router.use('/buses', (_req, _res, next) => next(new ServiceUnavailableError('BUS_SELLING_NOT_ENABLED')));
    return router;
  }
  const gate = createSearchGate({ clock: deps.clock, orgInfo, permission: BUS_BOOKING.search, prefix: 'bus-search' });
  const search = createBusSearch({ clock: deps.clock, operators, stateOf: deps.stateOf });
  router.get('/buses/search', publicRoute(), validate({ query: SearchQuery }), gate('bus.search', 'heavy'), (_req, res, next) => {
    const q = input(res).query;
    search
      .search({
        fromCityId: q.from,
        toCityId: q.to,
        date: q.date,
        caller: callerOf(res),
        filters: {
          acType: q.ac,
          seatType: q.seatType,
          departFrom: q.departFrom,
          departTo: q.departTo,
          maxPricePaise: q.maxPrice,
          operatorOrgId: q.operator,
        },
        sort: q.sort,
      })
      .then((data) => res.set('Cache-Control', 'private, no-store').json({ data }), next);
  });
  router.get(
    '/buses/trips/:id/seats',
    publicRoute(),
    validate({ params: z.strictObject({ id: Id }), query: z.strictObject({ from: Id, to: Id }) }),
    gate('bus.seatmap', 'heavy'),
    (_req, res, next) => {
      const { params, query } = input(res);
      search
        .seatMap({ tripId: params.id, fromStopId: query.from, toStopId: query.to, caller: callerOf(res) })
        .then((r) => res.set('Cache-Control', 'private, no-store').json(r), next);
    },
  );
  return router;
}
