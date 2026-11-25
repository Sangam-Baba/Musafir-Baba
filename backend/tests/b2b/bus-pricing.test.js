// @ts-check
/**
 * Bus pricing (S18-T08) — pure. Hotel margin rules never price buses and bus rules never price hotels (rules made before
 * buses stay hotel rules); bus-only / hotel-only match fields are refused on the other product; net → margin → GST
 * (CGST + SGST when the boarding state is the issuer's, else IGST); per-booking fee once; no BUS rule or no
 * BUS_TRANSPORT tax rule → not sellable; buyers never see the net fare or margin.
 */
import { describe, expect, it } from 'vitest';

import { busBreakdown, busPriceView } from '../../src/b2b/modules/bus-booking/index.js';
import { marginRuleProblems, ruleMatches } from '../../src/b2b/modules/pricing/index.js';

const now = new Date('2026-12-10T10:00:00Z');
const OP = '65f0000000000000000b1851';
const busRule = {
  id: 'r-bus',
  name: 'Bus',
  priority: 0,
  match: { productType: /** @type {const} */ ('BUS') },
  adjustment: { type: /** @type {const} */ ('FIXED_PER_NIGHT'), value: 5_000 },
  createdAt: new Date('2026-01-01'),
};
const hotelRule = {
  id: 'r-hotel',
  name: 'Old hotel rule',
  priority: 9,
  match: {},
  adjustment: { type: /** @type {const} */ ('FIXED_PER_NIGHT'), value: 25_000 },
  createdAt: new Date('2025-01-01'),
};
const taxRule = {
  key: 'bus-test-5',
  appliesTo: /** @type {const} */ ('BUS_TRANSPORT'),
  sac: '996421',
  slabMinPaise: 0,
  slabMaxPaise: null,
  rateBps: 500,
  itcAllowed: false,
  effectiveFrom: '2026-01-01',
  effectiveTo: null,
  sourceNote: 'test rate',
};
const data = {
  rules: [hotelRule, busRule],
  taxRules: [taxRule],
  settings: { model: 'PRINCIPAL', issuers: [{ gstin: null, stateCode: '07', isDefault: true }] },
  now,
};
const ctx = { channel: /** @type {const} */ ('WEBSITE'), operatorOrgId: OP, routeId: 'r1' };

describe('bus pricing', () => {
  it('products never mix; price build-up; GST by boarding state; buyers see no net or margin', () => {
    expect(ruleMatches(hotelRule, { ...ctx, productType: 'BUS' }, { date: '2026-12-12', now })).toBe(false);
    expect(ruleMatches(hotelRule, { channel: 'WEBSITE', hotelOrgId: 'h', propertyId: 'p' }, { date: '2026-12-12', now })).toBe(true);
    expect(ruleMatches(busRule, { channel: 'WEBSITE', hotelOrgId: 'h', propertyId: 'p' }, { date: '2026-12-12', now })).toBe(false);
    expect(
      ruleMatches(
        { ...busRule, match: { productType: 'BUS', routeId: 'other' } },
        { ...ctx, productType: 'BUS' },
        { date: '2026-12-12', now },
      ),
    ).toBe(false);
    expect(marginRuleProblems({ ...busRule, match: { productType: 'BUS', propertyId: 'p' } }).map((p) => p.code)).toEqual([
      'FIELD_NOT_FOR_PRODUCT',
    ]);
    expect(marginRuleProblems({ ...hotelRule, match: { routeId: 'r' } }).map((p) => p.code)).toEqual(['FIELD_NOT_FOR_PRODUCT']);

    const seats = [
      { no: 'L1', seatType: 'SLEEPER', deck: 'LOWER', netPaise: 90_000 },
      { no: 'U1', seatType: 'SLEEPER', deck: 'UPPER', netPaise: 80_000 },
    ];
    const intra = busBreakdown(data, { ctx, date: '2026-12-12', placeOfSupply: '07', seats });
    expect(intra.totals).toMatchObject({
      netPaise: 170_000,
      marginPaise: 10_000,
      sellPaise: 180_000,
      cgstPaise: 4_500,
      sgstPaise: 4_500,
      igstPaise: 0,
      totalPaise: 189_000,
      operatorPayablePaise: 170_000,
    });
    expect(intra.ruleIds).toEqual(['r-bus']); // the higher-priority hotel rule is ignored
    const inter = busBreakdown(data, { ctx, date: '2026-12-12', placeOfSupply: '06', seats });
    expect(inter.totals).toMatchObject({ igstPaise: 9_000, cgstPaise: 0, totalPaise: 189_000 });
    const withFee = busBreakdown(
      { ...data, rules: [...data.rules, { ...busRule, id: 'fee', adjustment: { type: 'FIXED_PER_BOOKING', value: 2_000 } }] },
      { ctx, date: '2026-12-12', placeOfSupply: '07', seats },
    );
    expect(withFee.totals).toMatchObject({ feePaise: 2_000, sellPaise: 182_000, gstPaise: 9_100, totalPaise: 191_100 });
    expect(() => busBreakdown({ ...data, rules: [hotelRule] }, { ctx, date: '2026-12-12', placeOfSupply: '07', seats })).toThrow(
      expect.objectContaining({ code: 'NOT_SELLABLE' }),
    );
    expect(() => busBreakdown({ ...data, taxRules: [] }, { ctx, date: '2026-12-12', placeOfSupply: '07', seats })).toThrow(
      expect.objectContaining({ code: 'NO_TAX_RULE' }),
    );
    expect(busPriceView(intra, 'WEBSITE')).toEqual({ currency: 'INR', totalPaise: 189_000, gstPaise: 9_000 });
    expect(JSON.stringify(busPriceView(intra, 'CLIENT'))).not.toMatch(/netPaise|marginPaise|operatorPayable/);
  });
});
