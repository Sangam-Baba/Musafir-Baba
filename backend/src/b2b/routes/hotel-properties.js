// @ts-check
/**
 * A hotel's properties (plan Stage 03 §3.2, §5).
 * GET  /hotel/properties                         — the org's properties (only assigned ones for limited members)
 * POST /hotel/properties {name, propertyTypeKey} — a new draft (members with access to the whole org)
 * GET  /hotel/properties/:id                     — one property; `ETag` = its version
 * PUT  /hotel/properties/:id/sections/:section   — save one wizard section; header `If-Match: <version>` is required
 *      (428 without it, 412 when someone saved in between). Sections: basic, location, contacts, times, policies, amenities.
 */
import express from 'express';
import { z } from 'zod';

import { AppError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { isTime, isTimeZone, PERMISSIONS as CATALOG, plainText, SECTIONS } from '../modules/hotel-catalog/index.js';
import { normalisePhone } from '../modules/identity/index.js';

const Id = z.string().regex(/^[a-f0-9]{24}$/);
const Key = z.string().regex(/^[a-z][a-z0-9-]{1,40}$/);
const Phone = z
  .string()
  .max(20)
  .transform((v, ctx) => {
    try {
      return normalisePhone(v);
    } catch {
      ctx.addIssue({ code: 'custom', message: 'not a valid phone number' });
      return z.NEVER;
    }
  });
const Time = z.string().refine(isTime, 'use HH:MM (24-hour)');

export const SECTION_BODIES = {
  basic: z.strictObject({
    name: z.string().trim().min(3).max(120),
    propertyTypeKey: Key,
    starRating: z.number().int().min(0).max(5),
    description: z.string().max(5000).transform(plainText),
  }),
  location: z.strictObject({
    cityId: Id,
    areaId: Id.nullish(),
    line1: z.string().trim().min(3).max(200),
    line2: z.string().trim().max(200).nullish(),
    pin: z.string().regex(/^[1-9]\d{5}$/),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  contacts: z.strictObject({ email: z.string().trim().toLowerCase().email().max(254), phone: Phone, whatsapp: Phone.nullish() }),
  times: z.strictObject({ checkInTime: Time, checkOutTime: Time, timeZone: z.string().refine(isTimeZone, 'unknown time zone') }),
  policies: z.strictObject({
    childrenAllowed: z.boolean(),
    childFreeUntilAge: z.number().int().min(0).max(17),
    extraBeds: z.boolean(),
    petsAllowed: z.boolean(),
    coupleFriendly: z.boolean(),
    localIdAccepted: z.boolean(),
    smoking: z.enum(['NO', 'DESIGNATED', 'YES']),
    idProofs: z.array(z.enum(['AADHAAR', 'PASSPORT', 'DRIVING_LICENCE', 'VOTER_ID'])).max(4),
    notes: z.string().max(2000).transform(plainText).nullish(),
  }),
  amenities: z.strictObject({ amenities: z.array(Key).max(80) }),
};

/** @param {import('express').Request} req */
function versionOf(req) {
  const raw = String(req.get('if-match') ?? '')
    .replace(/^W\//, '')
    .replace(/"/g, '');
  if (!/^\d+$/.test(raw)) throw new AppError('VERSION_REQUIRED', 428, 'Send the version you loaded in the If-Match header');
  return Number(raw);
}

/** @param {{ properties: ReturnType<typeof import('../modules/hotel-catalog/index.js').createPropertyService> }} deps */
export function hotelPropertyRoutes({ properties }) {
  const router = express.Router();
  const read = requirePermission(CATALOG.propertyRead);
  const manage = requirePermission(CATALOG.propertyManage);
  /** @param {import('express').Response} res @param {{ version: number }} p */
  const send = (res, p, status = 200) => res.status(status).set('ETag', `"${p.version}"`).json(p);

  router.get('/hotel/properties', read, (_req, res, next) => {
    properties.list(contextOf(res)).then((data) => res.json({ data }), next);
  });
  router.post(
    '/hotel/properties',
    manage,
    validate({ body: z.strictObject({ name: z.string().trim().min(3).max(120), propertyTypeKey: Key }) }),
    (_req, res, next) => {
      properties.create(contextOf(res), res.locals.input.body).then((p) => send(res, p, 201), next);
    },
  );
  router.get('/hotel/properties/:id', read, validate({ params: z.strictObject({ id: Id }) }), (_req, res, next) => {
    properties.get(contextOf(res), res.locals.input.params.id).then((p) => send(res, p), next);
  });
  router.put(
    '/hotel/properties/:id/sections/:section',
    manage,
    validate({ params: z.strictObject({ id: Id, section: z.enum(SECTIONS) }) }),
    (req, res, next) => {
      (async () => {
        const version = versionOf(req);
        const section = /** @type {import('../modules/hotel-catalog/domain/property.js').Section} */ (res.locals.input.params.section);
        const body = SECTION_BODIES[section].safeParse(req.body);
        if (!body.success)
          throw new AppError('VALIDATION_FAILED', 400, 'The request is not valid', {
            errors: body.error.issues.map((i) => ({ path: `body.${i.path.join('.')}`, message: i.message, code: i.code })),
          });
        send(res, await properties.saveSection(contextOf(res), { id: res.locals.input.params.id, section, data: body.data, version }));
      })().catch(next);
    },
  );
  return router;
}
