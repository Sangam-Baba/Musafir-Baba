// @ts-check
/** The price build-up (S05-T05): net → margin → sell → GST → totals; plan examples; who sees what; cache. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { evictCachedPrefix } from '../../src/b2b/core/cache.js';
import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { SIGNALS_COLLECTION } from '../../src/b2b/core/realtime/signals.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import {
  buildBreakdown,
  createPricingCacheSignals,
  createQuoteService,
  DEFAULT_SETTINGS,
  MarginRuleRecord,
  priceView,
  PricingSettingsRecord,
  readSettings,
  SEED_TAX_RULES,
  seedDefaultMarginRules,
  seedPricingSettings,
  seedTaxRules,
} from '../../src/b2b/modules/pricing/index.js';
import { startMongo } from './helpers/mongo.js';

/** @typedef {import('../../src/b2b/modules/pricing/domain/margin.js').MarginRule} MarginRule */

const now = new Date('2026-11-18T10:00:00Z');
const created = new Date('2026-01-01T00:00:00Z');
/** @param {string} id @param {MarginRule['match']} match @param {MarginRule['adjustment']} adjustment @returns {MarginRule} */
const rule = (id, match, adjustment) => ({ id, name: id, priority: 0, match, adjustment, createdAt: created });
const website = rule('website', { channels: ['WEBSITE'] }, { type: 'FIXED_PER_NIGHT', value: 25000 });
const b2b = rule('b2b', { channels: ['B2B_PORTAL', 'B2B_API'] }, { type: 'FIXED_PER_NIGHT', value: 15000 });
const data = { rules: [website, b2b], taxRules: SEED_TAX_RULES, settings: DEFAULT_SETTINGS, now };
const delhi = { stateCode: '07', gstRegistered: true };
/**
 * @param {number[][]} perNight amounts per room for each night
 * @param {'WEBSITE' | 'B2B_PORTAL' | 'B2B_API'} [channel]
 * @param {{ stateCode: string, gstRegistered: boolean }} [property]
 */
const input = (perNight, channel = 'WEBSITE', property = delhi) => ({
  ctx: { channel, hotelOrgId: 'h', propertyId: 'p' },
  property,
  checkIn: '2026-12-01',
  checkOut: `2026-12-${String(1 + perNight.length).padStart(2, '0')}`,
  nightly: perNight.map((amounts, i) => ({ date: `2026-12-${String(1 + i).padStart(2, '0')}`, amounts })),
});

describe('plan examples (one room, one night)', () => {
  it('₹700 → website ₹950 + ₹47.50 GST = ₹997.50 (CGST + SGST in Delhi)', () => {
    const b = buildBreakdown(data, input([[70000]]));
    expect(b.totals).toMatchObject({
      netPaise: 70000,
      marginPaise: 25000,
      sellPaise: 95000,
      cgstPaise: 2375,
      sgstPaise: 2375,
      igstPaise: 0,
      gstPaise: 4750,
      totalPaise: 99750,
    });
    expect(b.ruleIds).toEqual(['website']);
    expect(b.taxRuleKeys).toEqual(['accommodation-2025-up-to-7500']);
  });

  it('₹700 → B2B ₹850 + ₹42.50 GST = ₹892.50; a Goa hotel pays IGST', () => {
    expect(buildBreakdown(data, input([[70000]], 'B2B_PORTAL')).totals.totalPaise).toBe(89250);
    const goa = buildBreakdown(data, input([[70000]], 'B2B_API', { stateCode: '30', gstRegistered: true })).totals;
    expect(goa).toMatchObject({ igstPaise: 4250, cgstPaise: 0, totalPaise: 89250 });
  });

  it('switching the website rule to 20 % → ₹840 + ₹42 GST', () => {
    const pct = rule('pct', { channels: ['WEBSITE'] }, { type: 'PERCENT', value: 2000 });
    expect(buildBreakdown({ ...data, rules: [pct] }, input([[70000]])).totals).toMatchObject({
      sellPaise: 84000,
      gstPaise: 4200,
      totalPaise: 88200,
    });
  });

  it('brief: ₹10,000 + ₹1,000 = ₹11,000 to the B2B client, + 18 % GST (above ₹7,500) = ₹12,980', () => {
    const brief = rule('brief', { channels: ['B2B_PORTAL'] }, { type: 'FIXED_PER_NIGHT', value: 100000 });
    const t = buildBreakdown({ ...data, rules: [brief] }, input([[1_000_000]], 'B2B_PORTAL')).totals;
    expect(t).toMatchObject({ sellPaise: 1_100_000, cgstPaise: 99000, sgstPaise: 99000, gstPaise: 198000, totalPaise: 1_298_000 });
  });

  it('the slab follows the sell price: ₹7,300 + ₹250 = ₹7,550 is in the 18 % slab', () => {
    expect(buildBreakdown(data, input([[730000]])).lines[0]?.gst.rateBps).toBe(1800);
    expect(buildBreakdown(data, input([[725000]])).lines[0]?.gst.rateBps).toBe(500); // ₹7,500.00 exactly
  });
});

describe("hotel's GST, settings, fees", () => {
  it("a registered hotel's GST on its rate is recorded (cost; payable with the rate); none without GST", () => {
    expect(buildBreakdown(data, input([[70000]])).totals).toMatchObject({ hotelGstPaise: 3500, hotelPayablePaise: 73500 });
    const unreg = buildBreakdown(data, input([[70000]], 'WEBSITE', { stateCode: '07', gstRegistered: false })).totals;
    expect(unreg).toMatchObject({ hotelGstPaise: 0, hotelPayablePaise: 70000, gstPaise: 4750, totalPaise: 99750 });
  });

  it('hotels without GST are sellable while the setting allows it (owner, 18 Nov 2026)', () => {
    const off = { ...data, settings: { ...DEFAULT_SETTINGS, sellUnregisteredHotels: false } };
    expect(() => buildBreakdown(off, input([[70000]], 'WEBSITE', { stateCode: '07', gstRegistered: false }))).toThrow(
      expect.objectContaining({ code: 'NOT_SELLABLE', details: { reason: 'HOTEL_NOT_GST_REGISTERED' } }),
    );
  });

  it('the agent model is refused until it is built (CA decision)', () => {
    expect(() => buildBreakdown({ ...data, settings: { ...DEFAULT_SETTINGS, model: 'AGENT' } }, input([[70000]]))).toThrow(
      /PRICING_MODEL_NOT_BUILT/,
    );
  });

  it('a per-booking fee is added once and taxed at the first night rate', () => {
    const fee = rule('fee', {}, { type: 'FIXED_PER_BOOKING', value: 9900 });
    const b = buildBreakdown(
      { ...data, rules: [website, fee] },
      input([
        [70000, 70000],
        [70000, 70000],
      ]),
    );
    expect(b.fee).toEqual({ ruleId: 'fee', sellPaise: 9900, cgstPaise: 248, sgstPaise: 248, igstPaise: 0, gstPaise: 496 });
    expect(b.totals.sellPaise).toBe(4 * 95000 + 9900);
    expect(b.ruleIds).toEqual(['fee', 'website']);
  });

  it('no rule, no price → not sellable', () => {
    expect(() => buildBreakdown({ ...data, rules: [b2b] }, input([[70000]]))).toThrow(/NOT_SELLABLE/);
    expect(() => buildBreakdown(data, input([[0]]))).toThrow(/NOT_SELLABLE/);
    expect(() => buildBreakdown(data, input([[70000], [70000, 70000]]))).toThrow(/NOT_SELLABLE/);
  });
});

describe('totals = Σ parts', () => {
  it('randomised: 1 000 stays (1–9 rooms, 1–10 nights, mixed rules, both states)', () => {
    const pct = rule(
      'pct',
      { channels: ['WEBSITE'], stayFrom: '2026-12-03' },
      { type: 'PERCENT', value: 1750, minPaise: 10000, maxPaise: 300000 },
    );
    pct.priority = 1;
    for (let i = 0; i < 1000; i += 1) {
      const rooms = 1 + (i % 9);
      const nights = 1 + (i % 10);
      const perNight = Array.from({ length: nights }, () => Array.from({ length: rooms }, () => 1 + Math.floor(Math.random() * 2_000_000)));
      const state = i % 2 ? '07' : '29';
      const b = buildBreakdown(
        { ...data, rules: [website, b2b, pct] },
        input(perNight, i % 3 ? 'WEBSITE' : 'B2B_API', { stateCode: state, gstRegistered: i % 4 !== 0 }),
      );
      const t = b.totals;
      const sum = (/** @type {(l: any) => number} */ f) => b.lines.reduce((s, l) => s + f(l), 0);
      expect(b.lines).toHaveLength(rooms * nights);
      expect(t.netPaise).toBe(sum((l) => l.netPaise));
      expect(t.sellPaise).toBe(sum((l) => l.sellPaise));
      expect(t.sellPaise).toBe(t.netPaise + t.marginPaise);
      expect(t.gstPaise).toBe(sum((l) => l.gst.gstPaise));
      expect(t.gstPaise).toBe(t.cgstPaise + t.sgstPaise + t.igstPaise);
      expect(t.totalPaise).toBe(t.sellPaise + t.gstPaise);
      expect(state === '07' ? t.igstPaise : t.cgstPaise + t.sgstPaise).toBe(0);
      for (const l of b.lines) expect(l.sellPaise).toBeGreaterThan(l.netPaise);
    }
  });
});

describe('who sees what', () => {
  const b = buildBreakdown(
    data,
    input([
      [70000, 80000],
      [70000, 80000],
    ]),
  );
  it('website: the final price only', () => {
    const v = priceView(b, 'WEBSITE');
    expect(v).toEqual({
      currency: 'INR',
      checkIn: '2026-12-01',
      checkOut: '2026-12-03',
      rooms: 2,
      nights: 2,
      totalPaise: b.totals.totalPaise,
      gstPaise: b.totals.gstPaise,
    });
  });

  it('B2B client: price and GST lines, never the hotel rate or the margin', () => {
    const text = JSON.stringify(priceView(b, 'CLIENT'));
    for (const hidden of ['netPaise', 'marginPaise', 'hotelGst', 'ruleId', 'hotelPayable', '70000', '80000'])
      expect(text).not.toContain(hidden);
    expect(text).toContain('"sellPaise":95000');
  });

  it('admin: everything', () => {
    expect(priceView(b, 'ADMIN')).toBe(b);
  });
});

describe('quote service', () => {
  /** @type {Awaited<ReturnType<typeof startMongo>>} */
  let mongo;
  const clock = { now: () => now };
  beforeAll(async () => {
    mongo = await startMongo();
    await runMigrations(MIGRATIONS, { clock, owner: 'test' });
    await Promise.all([seedTaxRules(), seedDefaultMarginRules({ clock }), seedPricingSettings()]);
  });
  afterAll(async () => mongo.stop());

  it("settings are seeded with the owner's choices, once", async () => {
    expect(await seedPricingSettings()).toBe(0);
    expect(await readSettings()).toEqual({
      model: 'PRINCIPAL',
      issuers: [{ gstin: null, stateCode: '07', isDefault: true }],
      sellUnregisteredHotels: true,
    });
  });

  it('prices from stored rules; a rule change shows after the cache is dropped (pricing events do that)', async () => {
    const quotes = createQuoteService({ clock });
    expect((await quotes.quote(input([[70000]]))).totals.totalPaise).toBe(99750);
    await MarginRuleRecord.updateOne({ key: 'default-website' }, { $set: { 'adjustment.value': 30000 } });
    expect((await quotes.quote(input([[70000]]))).totals.totalPaise).toBe(99750); // cached (≤ 1 minute)
    evictCachedPrefix('pricing:');
    expect((await quotes.quote(input([[70000]]))).totals.totalPaise).toBe(105000); // ₹1,000 + 5 %
    await MarginRuleRecord.updateOne({ key: 'default-website' }, { $set: { 'adjustment.value': 25000 } });
  });

  it('a pricing event sends cache:evict for pricing: to every process', async () => {
    await createPricingCacheSignals({ clock, logger: /** @type {any} */ ({ warn: () => {} }) }).handle();
    const signal = await mongo.db.collection(SIGNALS_COLLECTION).find({}).sort({ $natural: -1 }).limit(1).next();
    expect(signal).toMatchObject({ room: 'cache:evict', data: { prefix: 'pricing:' } });
  });

  it('the settings switch is read from the database', async () => {
    await PricingSettingsRecord.updateOne({ _id: 'pricing' }, { $set: { sellUnregisteredHotels: false } });
    evictCachedPrefix('pricing:');
    await expect(
      createQuoteService({ clock }).quote(input([[70000]], 'WEBSITE', { stateCode: '07', gstRegistered: false })),
    ).rejects.toThrow(/NOT_SELLABLE/);
  });
});
