// @ts-check
/**
 * Stage 13 mandatory tests (plan §8). Where each one lives:
 * - rating engine property tests (limit, BLOCK vs OVERAGE, totals = Σ lines, never negative) → billing-rating.test.js;
 * - query weights → subscriptions-quota.test.js (weighted use), subscriptions.test.js (weights table);
 * - prorations → subscriptions.test.js (upgrade mid-month, trial end);
 * - entitlement precedence (override > top-up > plan) → here and subscriptions.test.js;
 * - quota thresholds (80 % / 100 %, BLOCK → 429) → subscriptions-quota.test.js and the simulated month here;
 * - dunning state machine → billing-dunning.test.js and the simulated month here;
 * - invoice numbering (gap-free, once per key, at once) → here;
 * - plan change race (version check) → subscriptions.test.js.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { saasInvoiceNumber } from '../../src/b2b/modules/billing/index.js';
import { reserveNumber } from '../../src/b2b/modules/documents/index.js';
import { effectiveTerms, quotaState } from '../../src/b2b/modules/subscriptions/index.js';
import { simulateBillingMonth } from '../../scripts/b2b/billing-simulation.js';
import { startMongo } from './helpers/mongo.js';

const clock = { now: () => new Date('2026-11-10T06:30:00Z') };
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
});
afterAll(async () => mongo.stop());

describe('a simulated billing month (no real clients yet)', () => {
  it('trial → upgrade → 80 % / 100 % → renewal → overage → unpaid → reminders → suspended → top-up → active', async () => {
    const { steps, invoices, final } = await simulateBillingMonth({ client: '65f0000000000000000a2001' });
    const said = steps.map((s) => s.what).join('\n');
    expect(said).toMatch(/STARTER trial/);
    expect(said).toMatch(/upgraded to Plan B/);
    expect(said).toMatch(/\(82 %\)/);
    expect(said).toMatch(/renewed → PAST_DUE/);
    expect(said).toMatch(/→ SUSPENDED/);
    expect(said).toMatch(/unpaidPaid":2.*→ ACTIVE/);
    expect(invoices.map((i) => [i.number, i.lines[0].kind, i.status]).reverse()).toEqual([
      ['S2627DL000001', 'PLAN_FEE', 'PAID'],
      ['S2627DL000002', 'PLAN_FEE', 'PAID'],
      ['S2627DL000003', 'OVERAGE', 'PAID'],
    ]);
    expect(invoices.every((i) => i.totals.totalPaise === i.totals.taxablePaise + i.totals.gstPaise)).toBe(true);
    expect(/** @type {any} */ (final).alerts.sent).toEqual([80, 100]);
    expect(/** @type {any} */ (final).status).toBe('ACTIVE');
  });
});

describe('invoice numbers', () => {
  it('40 SaaS invoices numbered at once → 1…40, no gaps or doubles; the same key again → its number', async () => {
    const series = 'SAAS:07:26-27-test';
    const at = clock.now();
    const got = await Promise.all(Array.from({ length: 40 }, (_, i) => reserveNumber(series, `saas:c:${i}`, at)));
    expect([...got].sort((a, b) => a - b)).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
    expect(await reserveNumber(series, 'saas:c:7', at)).toBe(got[7]);
    expect(saasInvoiceNumber('26-27', '07', 12)).toBe('S2627DL000012');
    expect(saasInvoiceNumber('26-27', '07', 12).length).toBeLessThanOrEqual(16);
  });
});

describe('what wins', () => {
  it('override > top-up > plan; an expired override no longer counts', () => {
    const plan = {
      name: 'Plan A',
      monthlyQueryLimit: 4000,
      pricePaise: 299_900,
      limitBehaviour: 'BLOCK',
      overagePricePerQueryPaise: 0,
      features: {},
    };
    const sub = {
      planKey: 'A',
      override: { queryLimit: 9000, limitBehaviour: 'OVERAGE', overagePricePerQueryPaise: 80, expiresAt: new Date('2026-12-31') },
    };
    const t = effectiveTerms(sub, plan, clock.now());
    expect(t).toMatchObject({ queryLimit: 9000, pricePaise: 299_900, limitBehaviour: 'OVERAGE', overridden: true });
    const allowance = t.queryLimit + 500; // + an approved top-up
    expect(quotaState({ used: 9400, allowance, behaviour: t.limitBehaviour, status: 'ACTIVE' })).toMatchObject({
      blocked: false,
      overageQueries: 0,
    });
    expect(effectiveTerms(sub, plan, new Date('2027-01-02'))).toMatchObject({
      queryLimit: 4000,
      limitBehaviour: 'BLOCK',
      overridden: false,
    });
  });
});
