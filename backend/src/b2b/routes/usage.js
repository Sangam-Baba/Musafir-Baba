// @ts-check
/**
 * Usage screens (plan Stage 12 §3.12) — client and MusafirBaba read the same daily counters, so the numbers agree:
 *   GET /usage?month=YYYY-MM                  (`metering.usage.read`) the company's month: by kind, by person, by day
 *   GET /admin/usage?month                    (`metering.admin.read`) every client, most used first (with names)
 *   GET /admin/usage.csv?month                (`metering.admin.read`)
 *   GET /admin/usage/:clientOrgId?month       (`metering.admin.read`) one client's month (same as its own screen)
 */
import express from 'express';
import { z } from 'zod';

import { systemScope } from '../core/db/tenant-plugin.js';
import { ForbiddenError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { createUsageReports, PERMISSIONS as MTR } from '../modules/metering/index.js';
import { OrganizationRecord } from '../modules/organizations/index.js';

const Month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const IST_MS = 330 * 60_000;
const SYS = systemScope('metering: usage admin', { routine: true });

/** @param {import('../core/clock.js').Clock} clock @param {string | undefined} m */
const monthOf = (clock, m) => m ?? new Date(clock.now().getTime() + IST_MS).toISOString().slice(0, 7);

/** Every client of the month with its name. @param {ReturnType<typeof createUsageReports>} reports @param {string} month */
async function allWithNames(reports, month) {
  const rows = await reports.allClients(month);
  const ids = rows.map((r) => r.orgId).filter((id) => /^[a-f0-9]{24}$/.test(id));
  const orgs = await OrganizationRecord.find({ _id: { $in: ids } }, { displayName: 1, reference: 1 })
    .setOptions(SYS)
    .lean();
  const byId = new Map(orgs.map((o) => [String(o._id), o]));
  return rows.map((r) => ({
    ...r,
    name: /** @type {any} */ (byId.get(r.orgId))?.displayName ?? r.orgId,
    reference: /** @type {any} */ (byId.get(r.orgId))?.reference ?? null,
  }));
}

/** @param {{ clock: import('../core/clock.js').Clock }} deps */
export function usageRoutes(deps) {
  const router = express.Router();
  const reports = createUsageReports();
  const q = validate({ query: z.strictObject({ month: Month.optional() }) });
  router.get('/usage', requirePermission(MTR.usageRead), q, (_req, res, next) => {
    const { actor } = contextOf(res);
    if (actor.type !== 'member' || actor.orgType !== 'CLIENT') return next(new ForbiddenError());
    reports
      .clientMonth(actor.orgId, monthOf(deps.clock, res.locals.input.query.month))
      .then((r) => res.set('Cache-Control', 'private, no-store').json(r), next);
  });
  router.get('/admin/usage', requirePermission(MTR.adminRead), q, (_req, res, next) => {
    const month = monthOf(deps.clock, res.locals.input.query.month);
    allWithNames(reports, month).then((data) => res.json({ month, data }), next);
  });
  router.get('/admin/usage.csv', requirePermission(MTR.adminRead), q, (_req, res, next) => {
    const month = monthOf(deps.clock, res.locals.input.query.month);
    allWithNames(reports, month).then((rows) => {
      const safe = (/** @type {unknown} */ v) => {
        const c = String(v ?? '');
        const t = /^[=+\-@\t\r]/.test(c) ? `'${c}` : c;
        return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
      };
      const csv = [
        ['client', 'reference', 'org_id', 'counted', 'all_calls'].join(','),
        ...rows.map((r) => [r.name, r.reference, r.orgId, r.billable, r.count].map(safe).join(',')),
      ].join('\n');
      res.type('text/csv').attachment(`musafirbaba-usage-${month}.csv`).send(csv);
    }, next);
  });
  router.get(
    '/admin/usage/:clientOrgId',
    requirePermission(MTR.adminRead),
    validate({
      params: z.strictObject({ clientOrgId: z.string().regex(/^[a-f0-9]{24}$/) }),
      query: z.strictObject({ month: Month.optional() }),
    }),
    (_req, res, next) => {
      reports
        .clientMonth(res.locals.input.params.clientOrgId, monthOf(deps.clock, res.locals.input.query.month))
        .then((r) => res.json(r), next);
    },
  );
  return router;
}
