// @ts-check
/**
 * Plans and subscriptions (S13-T02, T03): placeholder plans seeded once; a plan version is published only by a second
 * person (the old one superseded, one draft at a time); query weights; a client starts on the trial; upgrade now is
 * prorated by days, downgrade waits for the next month; two changes at once → one wins; renewal adds the month's
 * fee and resets the included queries; a trial ending mid-month moves to its next plan with a prorated fee; cancel at
 * period end; overrides and top-ups need two people and win over the plan until they expire.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import {
  createOverrides,
  createPlans,
  createSubscriptions,
  daysLeft,
  effectiveTerms,
  OverrideRecord,
  PlanVersionRecord,
  prorate,
  publishedPlan,
  seedPlans,
  SubscriptionRecord,
  SubSettingsRecord,
} from '../../src/b2b/modules/subscriptions/index.js';
import { startMongo } from './helpers/mongo.js';

let nowMs = Date.parse('2026-11-10T06:30:00Z'); // 10 Nov, 12:00 in India
const clock = { now: () => new Date(nowMs) };
const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
const plans = createPlans({ clock });
const subs = createSubscriptions({ clock });
const overrides = createOverrides({ clock });
let n = 0;
const client = () => `65f0000000000000000d${String((n += 1)).padStart(4, '0')}`;

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
});
afterAll(async () => mongo.stop());
beforeEach(async () => {
  nowMs = Date.parse('2026-11-10T06:30:00Z');
  await PlanVersionRecord.deleteMany({});
  await SubSettingsRecord.deleteMany({});
  await SubscriptionRecord.deleteMany({}).setOptions(S);
  await OverrideRecord.deleteMany({}).setOptions(S);
  await seedPlans();
});

describe('plan catalogue', () => {
  it('placeholder plans seeded once; publish needs a second person; the old version is superseded; one draft at a time', async () => {
    expect(await seedPlans()).toBe(0);
    expect((await plans.published()).map((p) => p.key)).toEqual(['STARTER', 'A', 'B', 'C']);
    const terms = {
      name: 'Plan A',
      monthlyQueryLimit: 4500,
      pricePaise: 319_900,
      limitBehaviour: /** @type {const} */ ('BLOCK'),
      overagePricePerQueryPaise: 0,
      trialDays: 0,
      nextPlanKey: null,
      features: { users: 5, branches: 2, api: false, webhooks: false },
    };
    const draft = await plans.propose('staff:f1', 'A', terms);
    expect(draft).toMatchObject({ version: 2, status: 'DRAFT' });
    await expect(plans.propose('staff:f1', 'A', terms)).rejects.toMatchObject({ code: 'PLAN_DRAFT_EXISTS' });
    await expect(plans.decide('staff:f1', draft.id, { approve: true })).rejects.toMatchObject({ code: 'SECOND_PERSON_REQUIRED' });
    expect((await plans.decide('staff:f2', draft.id, { approve: true })).status).toBe('PUBLISHED');
    expect(await publishedPlan('A')).toMatchObject({ version: 2, monthlyQueryLimit: 4500 });
    expect(await PlanVersionRecord.countDocuments({ planKey: 'A', status: 'SUPERSEDED' })).toBe(1);
    await expect(
      plans.propose('staff:f1', 'D', { ...terms, limitBehaviour: 'OVERAGE', overagePricePerQueryPaise: 0 }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('query weights: booking 0 by default; admin changes them; nonsense refused', async () => {
    expect(await plans.weights()).toMatchObject({ 'hotel.search': 1, 'hotel.order': 0 });
    expect(
      await plans.setWeights('staff:f1', { 'hotel.search': 2, 'hotel.offers': 1, 'hotel.pricecheck': 1, 'hotel.order': 0 }),
    ).toMatchObject({ 'hotel.search': 2 });
    await expect(plans.setWeights('staff:f1', { 'hotel.search': -1 })).rejects.toMatchObject({ code: 'WEIGHTS_INVALID' });
  });
});

describe('subscriptions', () => {
  it('starts on the trial (repeat-safe); upgrade during the trial → prorated fee charged now, ACTIVE', async () => {
    const c = client();
    const s = await subs.start(c);
    expect(s).toMatchObject({ planKey: 'STARTER', status: 'TRIAL', period: '2026-11', includedQueries: 1000, charges: [] });
    expect((await subs.start(c))._id).toEqual(s._id);
    const p = await subs.preview(c, 'B');
    const { left, total } = daysLeft(clock.now());
    expect(left).toBe(21); // 10 → 30 Nov
    expect(p).toMatchObject({ kind: 'UPGRADE', chargeNowPaise: prorate(349_900, 21, 30), includedQueries: prorate(5000, 21, 30) });
    const r = await subs.change({ clientOrgId: c, planKey: 'B', expectedVersion: s.version, by: 'user:u1' });
    expect(r.subscription).toMatchObject({ planKey: 'B', status: 'ACTIVE', trialEndsAt: null });
    expect(r.subscription?.charges).toEqual([expect.objectContaining({ kind: 'PLAN_FEE', amountPaise: prorate(349_900, left, total) })]);
  });

  it('upgrade mid-month on a paid plan: the price difference and included queries prorated; downgrade waits; two changes at once → one wins', async () => {
    const c = client();
    let s = await subs.start(c);
    s = /** @type {any} */ ((await subs.change({ clientOrgId: c, planKey: 'A', expectedVersion: s.version, by: 'u' })).subscription);
    nowMs = Date.parse('2026-11-20T06:30:00Z'); // 11 days left
    const up = await subs.change({ clientOrgId: c, planKey: 'C', expectedVersion: s.version, by: 'u' });
    expect(up).toMatchObject({ kind: 'UPGRADE', chargeNowPaise: prorate(599_900 - 299_900, 11, 30) });
    expect(up.subscription?.includedQueries).toBe(prorate(4000, 19, 30) + prorate(10_000, 11, 30));
    s = /** @type {any} */ (up.subscription);
    const both = await Promise.allSettled([
      subs.change({ clientOrgId: c, planKey: 'A', expectedVersion: s.version, by: 'u' }),
      subs.change({ clientOrgId: c, planKey: 'B', expectedVersion: s.version, by: 'u' }),
    ]);
    expect(both.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    const now = /** @type {any} */ (await subs.current(c));
    expect(now.planKey).toBe('C'); // a downgrade only books the change
    expect(now.pending).toMatchObject({ action: 'DOWNGRADE' });
  });

  it('renewal: pending downgrade applied, the month fee added, queries reset; cancel at period end; trial ending mid-month', async () => {
    const c = client();
    let s = await subs.start(c);
    s = /** @type {any} */ ((await subs.change({ clientOrgId: c, planKey: 'C', expectedVersion: s.version, by: 'u' })).subscription);
    await subs.change({ clientOrgId: c, planKey: 'A', expectedVersion: s.version, by: 'u' });
    nowMs = Date.parse('2026-12-01T00:10:00Z'); // 1 Dec in India
    expect(await subs.renew(/** @type {any} */ (await subs.current(c)))).toBe(true);
    expect(await subs.renew(/** @type {any} */ (await subs.current(c)))).toBe(false);
    s = /** @type {any} */ (await subs.current(c));
    expect(s).toMatchObject({ planKey: 'A', period: '2026-12', includedQueries: 4000, pending: null });
    expect(s.charges.at(-1)).toMatchObject({ kind: 'PLAN_FEE', amountPaise: 299_900, period: '2026-12' });
    await subs.cancel(c, 'u');
    nowMs = Date.parse('2027-01-01T00:10:00Z');
    await subs.renew(/** @type {any} */ (await subs.current(c)));
    expect(await subs.current(c)).toMatchObject({ status: 'CANCELLED' });

    const t = client();
    nowMs = Date.parse('2026-11-01T06:30:00Z');
    await subs.start(t); // trial 30 days → ends 1 Dec 12:00
    nowMs = Date.parse('2026-12-01T00:10:00Z');
    await subs.renew(/** @type {any} */ (await subs.current(t))); // still in trial at midnight
    expect(await subs.current(t)).toMatchObject({ status: 'TRIAL', period: '2026-12' });
    nowMs = Date.parse('2026-12-01T07:00:00Z');
    expect(await subs.endTrial(/** @type {any} */ (await subs.current(t)))).toBe(true);
    const after = /** @type {any} */ (await subs.current(t));
    expect(after).toMatchObject({ status: 'ACTIVE', planKey: 'A' });
    expect(after.charges.at(-1)).toMatchObject({ kind: 'PLAN_FEE', amountPaise: 299_900 }); // all 31 days left of December
  });

  it('overrides and top-ups need two people; an override wins until it expires', async () => {
    const c = client();
    await subs.start(c);
    const o = await overrides.propose('staff:f1', {
      clientOrgId: c,
      kind: 'OVERRIDE',
      reason: 'Pilot client',
      terms: { queryLimit: 20_000, pricePaise: 0, expiresAt: new Date('2026-12-31T00:00:00Z') },
    });
    await expect(overrides.decide('staff:f1', o.id, { approve: true })).rejects.toMatchObject({ code: 'SECOND_PERSON_REQUIRED' });
    await overrides.decide('staff:f2', o.id, { approve: true });
    await expect(overrides.decide('staff:f2', o.id, { approve: true })).rejects.toMatchObject({ code: 'OVERRIDE_ALREADY_DECIDED' });
    const top = await overrides.propose('staff:f1', { clientOrgId: c, kind: 'TOPUP', reason: 'Peak season', queries: 500 });
    await overrides.decide('staff:f2', top.id, { approve: true });
    await overrides.applyDue();
    const s = /** @type {any} */ (await subs.current(c));
    expect(s.extraQueries).toBe(500);
    const plan = /** @type {any} */ (await publishedPlan('STARTER'));
    expect(effectiveTerms(s, plan, clock.now())).toMatchObject({ queryLimit: 20_000, pricePaise: 0, overridden: true });
    expect(effectiveTerms(s, plan, new Date('2027-01-05T00:00:00Z'))).toMatchObject({ queryLimit: 1000, overridden: false });
  });
});
