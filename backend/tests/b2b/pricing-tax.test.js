// @ts-check
/** GST engine (S05-T02): slab per room per night, CGST + SGST vs IGST, dated rules, issuers, seeded rates. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import {
  createTaxRulesService,
  findTaxRule,
  gstForNight,
  issuerFor,
  overlappingRules,
  SEED_TAX_RULES,
  seedTaxRules,
  splitGst,
  taxRuleProblems,
  TaxRuleRecord,
} from '../../src/b2b/modules/pricing/index.js';
import { startMongo } from './helpers/mongo.js';

/** @typedef {import('../../src/b2b/modules/pricing/domain/tax.js').TaxRule} TaxRule */
/** Today's 5 % rule. @type {TaxRule} */
const FIVE = /** @type {TaxRule} */ (SEED_TAX_RULES.find((r) => r.key === 'accommodation-2025-up-to-7500'));
const DELHI = { gstin: null, stateCode: '07', isDefault: true };
const data = { rules: SEED_TAX_RULES, issuers: [DELHI] };
/**
 * @param {number} taxablePaise
 * @param {string} [placeOfSupply]
 * @param {string} [date]
 */
const night = (taxablePaise, placeOfSupply = '07', date = '2026-12-01') => gstForNight(data, { taxablePaise, date, placeOfSupply });

describe('slab per room per night (from 22 Sep 2025)', () => {
  it.each([
    [749999, 500],
    [750000, 500], // ₹7,500.00 exactly is in the 5 % slab
    [750001, 1800],
    [0, 500],
    [5_000_000, 1800],
  ])('%i paise → %i bps', (paise, bps) => {
    expect(night(paise).rateBps).toBe(bps);
  });

  it('5 % has no input tax credit, 18 % has', () => {
    expect(night(750000).itcAllowed).toBe(false);
    expect(night(750001).itcAllowed).toBe(true);
    expect(night(750000).sac).toBe('996311');
  });

  it('the stay date picks the rate in force that night (old 12 % before 22 Sep 2025)', () => {
    expect(night(500000, '07', '2025-09-21').rateBps).toBe(1200);
    expect(night(500000, '07', '2025-09-22').rateBps).toBe(500);
  });
});

describe('place of supply', () => {
  it('hotel in Delhi (same state as the issuer) → CGST + SGST, half each', () => {
    const g = night(95000); // ₹950 → 5 % = ₹47.50
    expect(g).toMatchObject({ intraState: true, cgstPaise: 2375, sgstPaise: 2375, igstPaise: 0, gstPaise: 4750, issuerState: '07' });
  });

  it('hotel in Goa → IGST', () => {
    const g = night(95000, '30');
    expect(g).toMatchObject({ intraState: false, cgstPaise: 0, sgstPaise: 0, igstPaise: 4750, gstPaise: 4750, placeOfSupply: '30' });
  });

  it('a GSTIN registered in the hotel state is used when there is one', () => {
    const goa = { gstin: '30AAAAA0000A1Z5', stateCode: '30', isDefault: false };
    expect(issuerFor([DELHI, goa], '30')).toBe(goa);
    expect(issuerFor([DELHI, goa], '08')).toBe(DELHI);
    expect(
      gstForNight({ rules: SEED_TAX_RULES, issuers: [DELHI, goa] }, { taxablePaise: 95000, date: '2026-12-01', placeOfSupply: '30' })
        .intraState,
    ).toBe(true);
  });

  it('no issuer at all → refused', () => {
    expect(() => issuerFor([], '07')).toThrow(/NO_GST_ISSUER/);
  });
});

describe('rounding', () => {
  it('each line half-up to the paisa', () => {
    // 10001 × 5 % = 500.05 → 500; CGST 250.025 → 250 each
    expect(splitGst(10001, 500, false).igstPaise).toBe(500);
    expect(splitGst(10001, 500, true)).toMatchObject({ cgstPaise: 250, sgstPaise: 250, gstPaise: 500 });
    // 10010 × 5 % = 500.5 → 501; CGST 250.25 → 250
    expect(splitGst(10010, 500, false).igstPaise).toBe(501);
    // 10030 × 2.5 % = 250.75 → 251 each
    expect(splitGst(10030, 500, true)).toMatchObject({ cgstPaise: 251, sgstPaise: 251, gstPaise: 502 });
  });

  it('randomised: lines always add up, never negative, within a paisa of the exact rate', () => {
    for (let i = 0; i < 2000; i += 1) {
      const paise = Math.floor(Math.random() * 3_000_000);
      const rate = [0, 500, 1200, 1800, 2800][i % 5] ?? 0;
      for (const intra of [true, false]) {
        const g = splitGst(paise, rate, intra);
        expect(g.cgstPaise + g.sgstPaise + g.igstPaise).toBe(g.gstPaise);
        expect(Math.min(g.cgstPaise, g.sgstPaise, g.igstPaise)).toBeGreaterThanOrEqual(0);
        expect(Math.abs(g.gstPaise - (paise * rate) / 10000)).toBeLessThanOrEqual(1);
        if (intra) expect(g.cgstPaise).toBe(g.sgstPaise);
      }
    }
  });
});

describe('rules as data', () => {
  it('the seeded rates are valid and never overlap', () => {
    for (const r of SEED_TAX_RULES) expect(taxRuleProblems(r)).toEqual([]);
    expect(overlappingRules(SEED_TAX_RULES)).toEqual([]);
  });

  it('every accommodation value on every date since July 2022 has exactly one rate', () => {
    for (const date of ['2022-07-18', '2024-01-01', '2025-09-21', '2025-09-22', '2030-01-01'])
      for (const valuePaise of [0, 1, 750000, 750001, 99_999_999])
        expect(() => findTaxRule(SEED_TAX_RULES, { appliesTo: 'ACCOMMODATION', valuePaise, date })).not.toThrow();
  });

  it('no rule → refused; two rules for the same value → refused (never guessed)', () => {
    expect(() => findTaxRule(SEED_TAX_RULES, { appliesTo: 'ACCOMMODATION', valuePaise: 1000, date: '2020-01-01' })).toThrow(/NO_TAX_RULE/);
    const extra = { ...FIVE, key: 'dup' };
    expect(() => findTaxRule([...SEED_TAX_RULES, extra], { appliesTo: 'ACCOMMODATION', valuePaise: 1000, date: '2026-01-01' })).toThrow(
      /TAX_RULES_OVERLAP/,
    );
    expect(overlappingRules([...SEED_TAX_RULES, extra])).toEqual([['accommodation-2025-up-to-7500', 'dup']]);
  });

  it('problems are all listed at once', () => {
    const bad = { ...FIVE, sac: '12', rateBps: 18000, slabMinPaise: 10, slabMaxPaise: 5, effectiveTo: '2020-01-01' };
    expect(taxRuleProblems(bad).map((p) => p.code)).toEqual(['SAC_INVALID', 'SLAB_RANGE', 'RATE_INVALID', 'DATE_RANGE']);
  });
});

describe('stored rates', () => {
  /** @type {Awaited<ReturnType<typeof startMongo>>} */
  let mongo;
  beforeAll(async () => {
    mongo = await startMongo();
    await runMigrations(MIGRATIONS, { clock: { now: () => new Date('2026-11-18T10:00:00Z') }, owner: 'test' });
  });
  afterAll(async () => mongo.stop());

  it('seeding adds the starter rates once and never changes an existing one', async () => {
    expect(await seedTaxRules()).toBe(SEED_TAX_RULES.length);
    await TaxRuleRecord.updateOne({ key: 'saas-2017' }, { $set: { rateBps: 1234 } });
    expect(await seedTaxRules()).toBe(0);
    expect((await TaxRuleRecord.findOne({ key: 'saas-2017' }).lean())?.rateBps).toBe(1234);
  });

  it('only approved rules are used for prices', async () => {
    await TaxRuleRecord.create({ ...FIVE, key: 'proposed', rateBps: 100, status: 'PENDING_APPROVAL', proposedBy: 'staff:1' });
    const rules = await createTaxRulesService().activeRules();
    expect(rules.map((r) => r.key)).not.toContain('proposed');
    expect(rules).toHaveLength(SEED_TAX_RULES.length);
    expect(gstForNight({ rules, issuers: [DELHI] }, { taxablePaise: 95000, date: '2026-12-01', placeOfSupply: '07' }).gstPaise).toBe(4750);
  });
});
