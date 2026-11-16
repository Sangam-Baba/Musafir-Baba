// @ts-check
/**
 * MusafirBaba's listing tools (plan Stage 03 §3.5, §3.7). Reading needs `hotel-catalog.listing.read`, everything else
 * `hotel-catalog.listing.review`.
 * GET  /admin/properties?status=&cityId=&hotelOrgId=&q=&queue=true    — all properties, or the approval queue (oldest first)
 * GET  /admin/properties/:id                                          — detail: property, organisation, room types, checklist + possible duplicates
 * POST /admin/properties/:id/{approve|request-changes|suspend|reactivate|archive} — {note, comments: [{section, note}]}
 * PUT  /admin/properties/:id/sections/:section                         — direct edit (no revision); `If-Match` required
 * POST /admin/properties/:id/revision/decision                         — {revisionId, decision: APPROVE | REJECT, note}
 */
import express from 'express';
import { z } from 'zod';

import { AppError, ForbiddenError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { PERMISSIONS as CATALOG, PROPERTY_STATUSES, SECTIONS } from '../modules/hotel-catalog/index.js';
import { SECTION_BODIES } from './hotel-properties.js';

const Id = z.string().regex(/^[a-f0-9]{24}$/);

/** @param {import('express').Response} res */
function staffOf(res) {
  const { actor } = contextOf(res);
  if (actor.type !== 'staff') throw new ForbiddenError();
  return { staffId: actor.staffId };
}

const ACTIONS = /** @type {const} */ ({
  approve: 'approve',
  'request-changes': 'requestChanges',
  suspend: 'suspend',
  reactivate: 'reactivate',
  archive: 'archive',
});
const COMMENT_SECTIONS = [...SECTIONS, 'roomTypes', 'photos'];
const ActionBody = z.strictObject({
  note: z.string().trim().min(1).max(2000).nullish(),
  comments: z
    .array(
      z.strictObject({
        section: z.enum(/** @type {[string, ...string[]]} */ (COMMENT_SECTIONS)),
        note: z.string().trim().min(1).max(1000),
      }),
    )
    .max(20)
    .optional(),
});

/** @param {import('express').Request} req */
function versionOf(req) {
  const raw = String(req.get('if-match') ?? '')
    .replace(/^W\//, '')
    .replace(/"/g, '');
  if (!/^\d+$/.test(raw)) throw new AppError('VERSION_REQUIRED', 428, 'Send the version you loaded in the If-Match header');
  return Number(raw);
}

/**
 * @param {{ revisions: ReturnType<typeof import('../modules/hotel-catalog/index.js').createRevisionService>,
 *   adminListing: ReturnType<typeof import('../modules/hotel-catalog/index.js').createAdminListingService>,
 *   properties: ReturnType<typeof import('../modules/hotel-catalog/index.js').createPropertyService> }} deps
 */
export function hotelAdminRoutes({ revisions, adminListing, properties }) {
  const router = express.Router();
  router.use(listingReadRoutes(adminListing));
  router.use(listingActionRoutes(adminListing, properties));
  router.post(
    '/admin/properties/:id/revision/decision',
    requirePermission(CATALOG.listingReview),
    validate({
      params: z.strictObject({ id: Id }),
      body: z.strictObject({ revisionId: Id, decision: z.enum(['APPROVE', 'REJECT']), note: z.string().trim().min(1).max(2000).nullish() }),
    }),
    (_req, res, next) => {
      (async () => {
        const { params, body } = res.locals.input;
        res.json(
          await revisions.decide(staffOf(res), params.id, {
            revisionId: body.revisionId,
            decision: body.decision,
            note: body.note ?? null,
          }),
        );
      })().catch(next);
    },
  );
  return router;
}

/** @param {ReturnType<typeof import('../modules/hotel-catalog/index.js').createAdminListingService>} adminListing */
function listingReadRoutes(adminListing) {
  const router = express.Router();
  const read = requirePermission(CATALOG.listingRead);
  const ListQuery = z.strictObject({
    status: z.enum(PROPERTY_STATUSES).optional(),
    cityId: Id.optional(),
    hotelOrgId: Id.optional(),
    q: z.string().trim().max(80).optional(),
    queue: z.enum(['true', 'false']).optional(),
  });
  router.get('/admin/properties', read, validate({ query: ListQuery }), (_req, res, next) => {
    const q = res.locals.input.query;
    adminListing
      .list({ status: q.status, cityId: q.cityId, hotelOrgId: q.hotelOrgId, q: q.q, queue: q.queue === 'true' })
      .then((data) => res.json({ data }), next);
  });
  router.get('/admin/properties/:id', read, validate({ params: z.strictObject({ id: Id }) }), (_req, res, next) => {
    adminListing.detail(res.locals.input.params.id).then((d) => res.json(d), next);
  });
  return router;
}

/**
 * @param {ReturnType<typeof import('../modules/hotel-catalog/index.js').createAdminListingService>} adminListing
 * @param {ReturnType<typeof import('../modules/hotel-catalog/index.js').createPropertyService>} properties
 */
function listingActionRoutes(adminListing, properties) {
  const router = express.Router();
  const review = requirePermission(CATALOG.listingReview);
  router.post(
    '/admin/properties/:id/:action',
    review,
    validate({
      params: z.strictObject({
        id: Id,
        action: z.enum(/** @type {[keyof typeof ACTIONS, ...(keyof typeof ACTIONS)[]]} */ (Object.keys(ACTIONS))),
      }),
      body: ActionBody,
    }),
    (_req, res, next) => {
      (async () => {
        const { params, body } = res.locals.input;
        const action = ACTIONS[/** @type {keyof typeof ACTIONS} */ (params.action)];
        res.json(await adminListing.act(staffOf(res), params.id, { action, note: body.note ?? null, comments: body.comments }));
      })().catch(next);
    },
  );
  router.put(
    '/admin/properties/:id/sections/:section',
    review,
    validate({ params: z.strictObject({ id: Id, section: z.enum(SECTIONS) }) }),
    (req, res, next) => {
      (async () => {
        const section = /** @type {import('../modules/hotel-catalog/domain/property.js').Section} */ (res.locals.input.params.section);
        const body = SECTION_BODIES[section].safeParse(req.body);
        if (!body.success)
          throw new AppError('VALIDATION_FAILED', 400, 'The request is not valid', {
            errors: body.error.issues.map((i) => ({ path: `body.${i.path.join('.')}`, message: i.message, code: i.code })),
          });
        const view = await properties.adminSaveSection(staffOf(res), {
          id: res.locals.input.params.id,
          section,
          data: body.data,
          version: versionOf(req),
        });
        res.set('ETag', `"${view.version}"`).json(view);
      })().catch(next);
    },
  );
  return router;
}
