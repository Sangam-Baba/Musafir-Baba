// @ts-check
/** Margin rules (S05-T03): adjustments, matching, precedence, not sellable without a rule, seeded defaults. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import {
  bookingFee,
  compareRules,
  createMarginRulesService,
  DEFAULT_RULES,
  marginAmount,
  MarginRuleRecord,
  marginRuleProblems,
  nightMargin,
  seedDefaultMarginRules,
} from '../../src/b2b/modules/pricing/index.js';
import { startMongo } from './helpers/mongo.js';

/** @typedef {import('../../src/b2b/modules/pricing/domain/margin.js').MarginRule} MarginRule */
/** @typedef {import('../../src/b2b/modules/pricing/domain/margin.js').PriceContext} PriceContext */

const now = new Date('2026-11-18T10:00:00Z');
let seq = 0;
/**
 * @param {Partial<MarginRule>} over
 * @returns {MarginRule}
 */
const rule = (over) => {
  seq += 1;
  return {
    id: `r${String(seq).padStart(3, '0')}`,
    name: 'r',
    priority: 0,
    match: {},
    adjustment: { type: 'FIXED_PER_NIGHT', value: 0 },
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, seq)),
    ...over,
  };
};
const website = rule({ id: 'website', match: { channels: ['WEBSITE'] }, adjustment: { type: 'FIXED_PER_NIGHT', value: 25000 } });
const b2b = rule({ id: 'b2b', match: { channels: ['B2B_PORTAL', 'B2B_API'] }, adjustment: { type: 'FIXED_PER_NIGHT', value: 15000 } });
/** @type {PriceContext} */
const ctx = { channel: 'WEBSITE', hotelOrgId: 'h1', propertyId: 'p1', cityId: 'goa', starRating: 3 };
const at = (/** @type {number} */ netPaise, date = '2026-12-01') => ({ date, now, netPaise });

describe('adjustments (plan §2a, base ₹700)', () => {
  it('website +₹250 → ₹950, B2B +₹150 → ₹850 for the same room', () => {
    expect(nightMargin([website, b2b], ctx, at(70000))).toEqual({ ruleId: 'website', marginPaise: 25000 });
    expect(nightMargin([website, b2b], { ...ctx, channel: 'B2B_PORTAL' }, at(70000)).marginPaise).toBe(15000);
    expect(nightMargin([website, b2b], { ...ctx, channel: 'B2B_API' }, at(70000)).marginPaise).toBe(15000);
  });

  it('20 % → +₹140 (₹840)', () => {
    expect(marginAmount({ type: 'PERCENT', value: 2000 }, 70000)).toBe(14000);
  });

  it('15 % with min ₹100 / max ₹1,500 clamps both ways', () => {
    const a = /** @type {const} */ ({ type: 'PERCENT', value: 1500, minPaise: 10000, maxPaise: 150000 });
    expect(marginAmount(a, 70000)).toBe(10500); // ₹105 → inside
    expect(marginAmount(a, 50000)).toBe(10000); // ₹75 → min ₹100
    expect(marginAmount(a, 2_000_000)).toBe(150000); // ₹3,000 → max ₹1,500
  });

  it('percent is half-up to the paisa', () => {
    expect(marginAmount({ type: 'PERCENT', value: 1500 }, 70001)).toBe(10500); // 10500.15
    expect(marginAmount({ type: 'PERCENT', value: 1500 }, 70003)).toBe(10500); // 10500.45
    expect(marginAmount({ type: 'PERCENT', value: 1500 }, 70004)).toBe(10501); // 10500.6
  });

  it('a per-booking fee is a separate layer, added once', () => {
    const fee = rule({ id: 'fee', adjustment: { type: 'FIXED_PER_BOOKING', value: 9900 } });
    expect(nightMargin([website, fee], ctx, at(70000)).ruleId).toBe('website');
    expect(bookingFee([website, fee], ctx, { date: '2026-12-01', now })).toEqual({ ruleId: 'fee', marginPaise: 9900 });
    expect(bookingFee([website], ctx, { date: '2026-12-01', now })).toBeNull();
  });
});

describe('not sellable', () => {
  it('no rule for the channel → NOT_SELLABLE (never zero margin by accident)', () => {
    expect(() => nightMargin([b2b], ctx, at(70000))).toThrow(/NOT_SELLABLE/);
    expect(() => nightMargin([], ctx, at(70000))).toThrow(/NOT_SELLABLE/);
  });

  it('a fee rule alone does not make a room sellable', () => {
    const fee = rule({ adjustment: { type: 'FIXED_PER_BOOKING', value: 9900 } });
    expect(() => nightMargin([fee], ctx, at(70000))).toThrow(/NOT_SELLABLE/);
  });

  it('below the hotel rate only on a rule that allows it, and never below one paisa', () => {
    expect(
      marginRuleProblems({ name: 'x', priority: 1, match: {}, adjustment: { type: 'FIXED_PER_NIGHT', value: -5000 } }).map((p) => p.code),
    ).toEqual(['BELOW_NET_NOT_ALLOWED']);
    const discount = rule({ priority: 5, allowBelowNet: true, adjustment: { type: 'FIXED_PER_NIGHT', value: -80000 } });
    expect(() => nightMargin([discount, website], ctx, at(70000))).toThrow(
      expect.objectContaining({ code: 'NOT_SELLABLE', details: expect.objectContaining({ reason: 'PRICE_BELOW_ONE_PAISA' }) }),
    );
    expect(nightMargin([discount, website], ctx, at(90000)).marginPaise).toBe(-80000);
  });
});

describe('matching and precedence', () => {
  it('a more specific rule wins at the same priority; a higher priority wins over specificity', () => {
    const goa = rule({ id: 'goa', match: { channels: ['WEBSITE'], cityId: 'goa' }, adjustment: { type: 'FIXED_PER_NIGHT', value: 30000 } });
    const boost = rule({ id: 'boost', priority: 10, adjustment: { type: 'FIXED_PER_NIGHT', value: 40000 } });
    expect(nightMargin([website, goa], ctx, at(70000)).ruleId).toBe('goa');
    expect(nightMargin([website, goa], { ...ctx, cityId: 'jaipur' }, at(70000)).ruleId).toBe('website');
    expect(nightMargin([website, goa, boost], ctx, at(70000)).ruleId).toBe('boost');
  });

  it('stay dates are per night (New Year rule only on those nights)', () => {
    const ny = rule({
      id: 'ny',
      match: { channels: ['WEBSITE'], stayFrom: '2026-12-30', stayTo: '2027-01-01' },
      adjustment: { type: 'FIXED_PER_NIGHT', value: 99900 },
    });
    expect(nightMargin([website, ny], ctx, at(70000, '2026-12-29')).ruleId).toBe('website');
    expect(nightMargin([website, ny], ctx, at(70000, '2026-12-30')).ruleId).toBe('ny');
    expect(nightMargin([website, ny], ctx, at(70000, '2027-01-01')).ruleId).toBe('ny');
    expect(nightMargin([website, ny], ctx, at(70000, '2027-01-02')).ruleId).toBe('website');
  });

  it('effective dates: a scheduled rule waits, an ended rule stops', () => {
    const later = rule({ id: 'later', priority: 5, effectiveFrom: new Date('2026-12-01T00:00:00Z') });
    const ended = rule({ id: 'ended', priority: 5, effectiveTo: new Date('2026-11-18T09:00:00Z') });
    expect(nightMargin([website, later, ended], ctx, at(70000)).ruleId).toBe('website');
    expect(nightMargin([website, later], ctx, { ...at(70000), now: new Date('2026-12-02T00:00:00Z') }).ruleId).toBe('later');
  });

  it('client, category, hotel, property and star rating all narrow the match', () => {
    const gold = rule({
      id: 'gold',
      match: { channels: ['B2B_PORTAL'], clientCategory: 'GOLD' },
      adjustment: { type: 'FIXED_PER_NIGHT', value: 10000 },
    });
    const b2bCtx = { ...ctx, channel: /** @type {const} */ ('B2B_PORTAL'), clientCategory: 'GOLD', clientOrgId: 'c1' };
    expect(nightMargin([b2b, gold], b2bCtx, at(70000)).ruleId).toBe('gold');
    expect(nightMargin([b2b, gold], { ...b2bCtx, clientCategory: 'SILVER' }, at(70000)).ruleId).toBe('b2b');
    const fiveStar = rule({ id: 'five', match: { starRating: 5 } });
    expect(nightMargin([website, fiveStar], ctx, at(70000)).ruleId).toBe('website');
  });

  it('randomised: the same rules in any order give the same winner', () => {
    const pool = Array.from({ length: 12 }, (_, i) =>
      rule({
        priority: i % 3,
        match: i % 2 ? { channels: ['WEBSITE'] } : i % 3 ? { cityId: 'goa' } : {},
        createdAt: new Date(Date.UTC(2026, 0, 1 + (i % 4))),
        adjustment: { type: 'FIXED_PER_NIGHT', value: 1000 * i },
      }),
    );
    const expected = nightMargin(pool, ctx, at(70000)).ruleId;
    for (let n = 0; n < 300; n += 1) {
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      expect(nightMargin(shuffled, ctx, at(70000)).ruleId).toBe(expected);
      expect([...shuffled].sort(compareRules).map((r) => r.id)).toEqual([...pool].sort(compareRules).map((r) => r.id));
    }
  });
});

describe('rule checks', () => {
  it('all problems at once', () => {
    const codes = marginRuleProblems({
      name: 'x',
      priority: -1,
      match: { channels: [], starRating: 9, stayFrom: '2027-01-02', stayTo: '2027-01-01' },
      adjustment: { type: 'FIXED_PER_NIGHT', value: 100, minPaise: 5 },
    }).map((p) => p.code);
    expect(codes).toEqual(['PRIORITY_INVALID', 'CHANNEL_INVALID', 'STAR_INVALID', 'DATE_RANGE', 'BOUNDS_ONLY_FOR_PERCENT']);
    expect(
      marginRuleProblems({
        name: 'x',
        priority: 0,
        match: {},
        adjustment: { type: 'PERCENT', value: 1500, minPaise: 500, maxPaise: 100 },
      }).map((p) => p.code),
    ).toEqual(['BOUNDS_RANGE']);
    expect(
      marginRuleProblems({ name: 'x', priority: 0, match: {}, adjustment: { type: 'PERCENT', value: 900000 } }).map((p) => p.code),
    ).toEqual(['VALUE_INVALID']);
  });

  it('the seeded defaults are valid', () => {
    for (const r of DEFAULT_RULES) expect(marginRuleProblems(r)).toEqual([]);
  });
});

describe('stored rules', () => {
  /** @type {Awaited<ReturnType<typeof startMongo>>} */
  let mongo;
  beforeAll(async () => {
    mongo = await startMongo();
    await runMigrations(MIGRATIONS, { clock: { now: () => now }, owner: 'test' });
  });
  afterAll(async () => mongo.stop());

  it('the two defaults are seeded once; a retired default is not brought back', async () => {
    expect(await seedDefaultMarginRules()).toBe(2);
    await MarginRuleRecord.updateOne({ key: 'default-b2b' }, { $set: { status: 'RETIRED' } });
    expect(await seedDefaultMarginRules()).toBe(0);
    const active = await createMarginRulesService().activeRules();
    expect(active.map((r) => r.name)).toEqual(['Website default']);
  });

  it('stored rules price exactly like the plan example', async () => {
    await MarginRuleRecord.updateOne({ key: 'default-b2b' }, { $set: { status: 'ACTIVE' } });
    const rules = await createMarginRulesService().activeRules();
    expect(nightMargin(rules, ctx, at(70000)).marginPaise).toBe(25000);
    expect(nightMargin(rules, { ...ctx, channel: 'B2B_API' }, at(70000)).marginPaise).toBe(15000);
    expect(() =>
      nightMargin(
        rules.filter((r) => r.name !== 'Website default'),
        ctx,
        at(70000),
      ),
    ).toThrow(/NOT_SELLABLE/);
  });
});
