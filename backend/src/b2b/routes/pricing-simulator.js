// @ts-check
/**
 * MusafirBaba admin: price simulator and rule reach (plan Stage 05 §3.8, §2a).
 * POST /admin/pricing/simulate          — `sample` (a typed hotel rate) or `property` (its real calendar for a stay),
 *                                          for a channel / client, optionally with draft rules (`pricing.simulator.use`)
 * GET  /admin/margin-rules/:id/reach    — how many LIVE properties a rule's match covers (`pricing.rules.read`)
 * Wiring only: the property's facts and nightly rates come from hotel-catalog / hotel-inventory through the
 * functions passed in; the prices from pricing's simulator. Nothing is saved.
 */
import express from 'express';
import { z } from 'zod';

import { DomainError } from '../core/errors.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { CHANNELS, PERMISSIONS as PRC } from '../modules/pricing/index.js';
import { Id } from './inventory-http.js';

const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Guests = z.strictObject({ adults: z.number().int().min(1).max(12), children: z.number().int().min(0).max(12) });
const SimulateBody = z
  .strictObject({
    channel: z.enum(CHANNELS),
    clientOrgId: Id.nullish(),
    clientCategory: z.string().trim().min(1).max(40).nullish(),
    draftRuleIds: z.array(Id).max(10).default([]),
    sample: z
      .strictObject({
        netPaise: z.number().int().min(1).max(100_000_000),
        date: Day,
        nights: z.number().int().min(1).max(30).default(1),
        rooms: z.number().int().min(1).max(9).default(1),
        stateCode: z.string().regex(/^\d{2}$/),
        gstRegistered: z.boolean().default(true),
        cityId: Id.nullish(),
        starRating: z.number().int().min(0).max(5).nullish(),
      })
      .optional(),
    property: z.strictObject({ propertyId: Id, checkIn: Day, checkOut: Day, rooms: z.array(Guests).min(1).max(9) }).optional(),
  })
  .refine((b) => Boolean(b.sample) !== Boolean(b.property), { message: 'Send either sample or property' });

/**
 * @typedef {{ id: string, name: string, hotelOrgId: string, cityId: string | null, starRating: number | null,
 *   stateCode: string | null, timeZone: string, gstRegistered: boolean, roomTypes: { id: string, name: string, maxOccupancy: number }[] }} SimProperty
 * @typedef {{
 *   simulator: ReturnType<typeof import('../modules/pricing/index.js').createSimulatorService>,
 *   rules: ReturnType<typeof import('../modules/pricing/index.js').createRuleAdminService>,
 *   propertyFacts: (id: string) => Promise<SimProperty>,
 *   offersFor: (p: SimProperty, stay: { checkIn: string, checkOut: string, rooms: { adults: number, children: number }[] }) =>
 *     Promise<{ roomTypeId: string, ratePlanId: string, mealPlanKey: string, available: number, nightly: { date: string, amounts: number[] }[] }[]>,
 *   reach: (match: Record<string, unknown>) => Promise<{ count: number, capped: boolean }>,
 * }} SimulatorDeps
 */

/** @param {string} date @param {number} days */
const addDays = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** @param {Record<string, any>} b */
const buyerOf = (b) => ({ channel: b.channel, clientOrgId: b.clientOrgId ?? null, clientCategory: b.clientCategory ?? null });

/** @param {SimulatorDeps} deps @param {Record<string, any>} b */
async function simulateSample(deps, b) {
  const s = b.sample;
  const nightly = Array.from({ length: s.nights }, (_, i) => ({ date: addDays(s.date, i), amounts: Array(s.rooms).fill(s.netPaise) }));
  const input = {
    ctx: { ...buyerOf(b), hotelOrgId: 'sample', propertyId: 'sample', cityId: s.cityId ?? null, starRating: s.starRating ?? null },
    property: { stateCode: s.stateCode, gstRegistered: s.gstRegistered },
    checkIn: s.date,
    checkOut: addDays(s.date, s.nights),
    nightly,
  };
  const out = await deps.simulator.simulate([input], b.draftRuleIds);
  return { mode: 'sample', ...out };
}

/** @param {SimulatorDeps} deps @param {Record<string, any>} b */
async function simulateProperty(deps, b) {
  const p = await deps.propertyFacts(b.property.propertyId);
  if (!p.stateCode) throw new DomainError('PROPERTY_LOCATION_MISSING');
  const offers = await deps.offersFor(p, b.property);
  const ctx = { ...buyerOf(b), hotelOrgId: p.hotelOrgId, propertyId: p.id, cityId: p.cityId, starRating: p.starRating };
  const inputs = offers.map((o) => ({
    ctx,
    property: { stateCode: /** @type {string} */ (p.stateCode), gstRegistered: p.gstRegistered },
    checkIn: b.property.checkIn,
    checkOut: b.property.checkOut,
    nightly: o.nightly,
  }));
  const out = await deps.simulator.simulate(inputs, b.draftRuleIds);
  const names = new Map(p.roomTypes.map((r) => [r.id, r.name]));
  return {
    mode: 'property',
    property: { id: p.id, name: p.name, stateCode: p.stateCode, gstRegistered: p.gstRegistered },
    offers: offers.map((o, i) => ({
      roomTypeId: o.roomTypeId,
      roomTypeName: names.get(o.roomTypeId) ?? null,
      ratePlanId: o.ratePlanId,
      mealPlanKey: o.mealPlanKey,
      available: o.available,
      ...out.results[i],
    })),
    ruleNames: out.ruleNames,
    draftsUsed: out.draftsUsed,
  };
}

/** @param {SimulatorDeps} deps */
export function pricingSimulatorRoutes(deps) {
  const router = express.Router();
  router.post('/admin/pricing/simulate', requirePermission(PRC.simulate), validate({ body: SimulateBody }), (_req, res, next) => {
    const b = res.locals.input.body;
    (b.sample ? simulateSample(deps, b) : simulateProperty(deps, b)).then(
      (r) => res.set('Cache-Control', 'private, no-store').json(r),
      next,
    );
  });
  router.get(
    '/admin/margin-rules/:id/reach',
    requirePermission(PRC.rulesRead),
    validate({ params: z.strictObject({ id: Id }) }),
    (_req, res, next) => {
      (async () => {
        const rule = await deps.rules.get(res.locals.input.params.id);
        res.json(await deps.reach(rule.match));
      })().catch(next);
    },
  );
  return router;
}
