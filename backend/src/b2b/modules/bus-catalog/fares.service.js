// @ts-check
/**
 * Fares per route (plan Stage 18 B4): read, save whole (version check; every problem at once), change log of the last
 * 100 saves, and the net fare for a seat on a journey and date (`quote`, used by search and booking in B5–B6).
 * Fares can change at any time; a booking keeps the price it was sold at.
 */
import { randomUUID } from 'node:crypto';

import { systemScope } from '../../core/db/tenant-plugin.js';
import { ConflictError, DomainError, NotFoundError } from '../../core/errors.js';
import { checkFares, fareChangeSummary, fareFor } from './domain/fares.js';
import { FareRecord } from './models/fare.model.js';
import { RouteRecord } from './models/route.model.js';

const SCOPE = systemScope('bus-catalog: fare quotes', { routine: true });
const HISTORY = 100;

/** @typedef {{ orgId: string, userId: string }} Operator */
/** @typedef {import('./domain/fares.js').FareRow} FareRow */
/** @typedef {Omit<import('./domain/fares.js').DateRule, 'id'> & { id?: string | null }} RuleInput */

/** @param {string} routeId @param {Record<string, any> | null} f */
const faresDto = (routeId, f) => ({
  routeId,
  rows: (f?.rows ?? []).map((/** @type {any} */ r) => ({
    fromIdx: r.fromIdx,
    toIdx: r.toIdx,
    seatType: r.seatType,
    deck: r.deck,
    netPaise: r.netPaise,
  })),
  rules: (f?.rules ?? []).map((/** @type {any} */ d) => ({
    id: d.id,
    label: d.label,
    from: d.from,
    to: d.to,
    weekdays: d.weekdays,
    addPaise: d.addPaise,
  })),
  version: f?.version ?? 0,
  history: [...(f?.history ?? [])].reverse().slice(0, 20),
});

/** @param {string} orgId @param {string} routeId */
async function ownRoute(orgId, routeId) {
  const r = /^[a-f0-9]{24}$/.test(routeId) ? await RouteRecord.findOne({ _id: routeId, operatorOrgId: orgId }).lean() : null;
  if (!r) throw new NotFoundError('ROUTE_NOT_FOUND');
  return /** @type {Record<string, any>} */ (r);
}

/** @param {{ clock: import('../../core/clock.js').Clock }} deps */
export function createFares(deps) {
  return {
    /** @param {string} orgId @param {string} routeId */
    async get(orgId, routeId) {
      await ownRoute(orgId, routeId);
      return faresDto(routeId, await FareRecord.findOne({ routeId, operatorOrgId: orgId }).lean());
    },
    /**
     * Save all fares of a route (`expectedVersion` 0 for the first save).
     * @param {Operator} who @param {string} routeId @param {{ rows: FareRow[], rules: RuleInput[], expectedVersion: number }} a
     */
    async save(who, routeId, a) {
      const route = await ownRoute(who.orgId, routeId);
      if (route.status === 'RETIRED') throw new ConflictError('ROUTE_NOT_EDITABLE', { status: route.status });
      const rules = a.rules.map((d) => ({ ...d, label: d.label.trim(), id: d.id || randomUUID().slice(0, 8) }));
      const problems = checkFares(route.stops, a.rows, rules);
      if (problems.length) throw new DomainError('FARES_INVALID', { problems });
      const old = await FareRecord.findOne({ routeId, operatorOrgId: who.orgId }).lean();
      const before = /** @type {FareRow[]} */ (old?.rows ?? []);
      const entry = { at: deps.clock.now(), by: `user:${who.userId}`, summary: fareChangeSummary(before, a.rows, rules.length) };
      if (a.expectedVersion === 0) {
        if (old) throw new ConflictError('VERSION_CONFLICT');
        await FareRecord.create({ operatorOrgId: who.orgId, routeId, rows: a.rows, rules, history: [entry] }).catch(
          (/** @type {any} */ e) => {
            throw e?.code === 11000 ? new ConflictError('VERSION_CONFLICT') : e;
          },
        );
      } else {
        const res = await FareRecord.updateOne(
          { routeId, operatorOrgId: who.orgId, version: a.expectedVersion },
          { $set: { rows: a.rows, rules }, $inc: { version: 1 }, $push: { history: { $each: [entry], $slice: -HISTORY } } },
        );
        if (res.modifiedCount !== 1) throw new ConflictError('VERSION_CONFLICT');
      }
      return faresDto(routeId, await FareRecord.findOne({ routeId, operatorOrgId: who.orgId }).lean());
    },
    /**
     * Net fare for one seat (system scope — search and booking read any operator's fares).
     * @param {string} routeId @param {{ fromIdx: number, toIdx: number, seatType: string, deck: string, date: string }} q
     */
    async quote(routeId, q) {
      const f = await FareRecord.findOne({ routeId }).setOptions(SCOPE).lean();
      return f ? fareFor(/** @type {any} */ (f), q) : null;
    },
  };
}
