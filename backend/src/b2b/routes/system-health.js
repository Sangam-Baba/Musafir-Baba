// @ts-check
/**
 * Stage 16: GET /admin/system-health (`reporting.health.read`) — the safety checks' last run, what is failing now,
 * problems in the last 7 days and the days-clean count (go-live needs 7).
 */
import express from 'express';

import { requirePermission } from '../core/http/permissions.js';
import { PERMISSIONS as RPT, systemHealth } from '../modules/reporting/index.js';
import { handle } from './payout-finance-admin.js';

/** @param {{ clock: import('../core/clock.js').Clock }} deps */
export function systemHealthRoutes(deps) {
  const router = express.Router();
  router.get(
    '/admin/system-health',
    requirePermission(RPT.healthRead),
    handle(async () => systemHealth(deps)),
  );
  return router;
}
