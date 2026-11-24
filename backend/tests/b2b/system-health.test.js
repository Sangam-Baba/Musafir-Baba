// @ts-check
/**
 * System health (S16-T02): each safety-check run saved; a failing check alerted once per Indian day (again the next
 * day); days clean counted from the last failing run; "stale" when no run for 30 minutes; old runs removed after 90
 * days; the real checks run on an empty database without problems; admin page needs `reporting.health.read`.
 */
import { describe, expect, it } from 'vitest';

import { InvariantRunRecord, recordInvariantRun, systemHealth } from '../../src/b2b/modules/reporting/index.js';
import { runInvariants } from '../../src/b2b/background.js';
import { asStaff, useInventoryApp } from './helpers/inventory-app.js';

let nowMs = Date.parse('2026-11-24T06:30:00Z');
const clock = { now: () => new Date(nowMs) };
const app = useInventoryApp({ clock, models: [InvariantRunRecord] });
const bad = [
  { name: 'inventory: booked + held ≤ total', violations: [{ id: 'night-1', detail: 'booked 3 + held 1 > total 3' }] },
  { name: 'ledger: balanced', violations: [] },
];
const good = [
  { name: 'inventory: booked + held ≤ total', violations: [] },
  { name: 'ledger: balanced', violations: [] },
];

describe('system health', () => {
  it('runs saved; alert once per day per failing check; days clean; stale; 90-day pruning', async () => {
    nowMs = Date.parse('2026-11-01T06:30:00Z');
    expect((await recordInvariantRun({ clock }, good)).ok).toBe(true);
    nowMs = Date.parse('2026-11-10T06:30:00Z');
    expect(await recordInvariantRun({ clock }, bad)).toMatchObject({ ok: false, alerts: ['inventory: booked + held ≤ total'] });
    nowMs += 10 * 60_000;
    expect((await recordInvariantRun({ clock }, bad)).alerts).toEqual([]); // already told today
    nowMs = Date.parse('2026-11-10T19:00:00Z'); // 00:30 on 11 Nov in India → a new day
    expect((await recordInvariantRun({ clock }, bad)).alerts).toEqual(['inventory: booked + held ≤ total']);
    nowMs = Date.parse('2026-11-11T06:30:00Z');
    await recordInvariantRun({ clock }, good);
    nowMs = Date.parse('2026-11-19T06:30:00Z');
    await recordInvariantRun({ clock }, good);
    const h = await systemHealth({ clock });
    expect(h).toMatchObject({ daysClean: 8, stale: false, failingNow: [] });
    expect(h.lastRun?.ok).toBe(true);
    expect(h.problemsLast7Days).toEqual([]);
    nowMs += 31 * 60_000;
    expect((await systemHealth({ clock })).stale).toBe(true);
    nowMs = Date.parse('2027-02-15T06:30:00Z');
    await recordInvariantRun({ clock }, good);
    expect(await InvariantRunRecord.countDocuments({ at: { $lt: new Date('2026-11-17T00:00:00Z') } })).toBe(0); // > 90 days gone
  });

  it('the real checks run clean on an empty database and are saved; the admin page needs its permission', async () => {
    nowMs = Date.parse('2026-11-24T06:30:00Z');
    await InvariantRunRecord.deleteMany({});
    const logger = { info: () => undefined, warn: () => undefined, error: () => undefined, child: () => logger };
    await runInvariants({ clock, logger: /** @type {any} */ (logger), email: null });
    const run = /** @type {any} */ (await InvariantRunRecord.findOne({}).lean());
    expect(run.ok).toBe(true);
    expect(run.checks.length).toBeGreaterThanOrEqual(3); // the start-up checks (more are added when the server starts)
    expect((await app.admin.get('/api/v1/admin/system-health', asStaff('s1:reporting.reports.read'))).status).toBe(403);
    const r = await app.admin.get('/api/v1/admin/system-health', asStaff('s1:reporting.health.read'));
    expect(r.body).toMatchObject({ failingNow: [], stale: false, lastRun: { ok: true } });
  });
});
