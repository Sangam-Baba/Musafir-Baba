// @ts-check
/**
 * Rating engine (S13-T05, plan §8 — property tests): within the limit → no overage; OVERAGE plan charges extra
 * queries × price; BLOCK plan never charges overage; weights are applied before (quota tests); charges become lines
 * once, never negative; GST 18 % split CGST / SGST or IGST; totals = Σ lines + GST; never negative — 3 000 random cases.
 */
import { describe, expect, it } from 'vitest';

import { chargeLines, intraState, invoiceTotals, overageLines } from '../../src/b2b/modules/billing/index.js';

/** @param {number} seed */
function random(seed) {
  let s = seed;
  return (/** @type {number} */ min, /** @type {number} */ max) => {
    s = (s * 1_103_515_245 + 12_345) % 2_147_483_648;
    return min + (s % (max - min + 1));
  };
}

describe('rating engine', () => {
  it('overage: none within the limit or on BLOCK; extra × price on OVERAGE', () => {
    const base = { allowance: 4000, overagePricePerQueryPaise: 100, planName: 'Plan B', month: '2026-11' };
    expect(overageLines({ ...base, used: 3999, behaviour: 'OVERAGE' })).toEqual([]);
    expect(overageLines({ ...base, used: 4500, behaviour: 'BLOCK' })).toEqual([]);
    expect(overageLines({ ...base, used: 4500, behaviour: 'OVERAGE' })).toEqual([
      expect.objectContaining({ kind: 'OVERAGE', quantity: 500, amountPaise: 50_000, ref: 'overage:2026-11' }),
    ]);
  });

  it('GST: CGST + SGST in the same state (or no GSTIN), IGST otherwise; place of supply', () => {
    const lines = chargeLines([{ id: 'a', kind: 'PLAN_FEE', description: 'Plan A', amountPaise: 299_900 }]);
    expect(invoiceTotals(lines, { intraState: true })).toEqual({
      taxablePaise: 299_900,
      cgstPaise: 26_991,
      sgstPaise: 26_991,
      igstPaise: 0,
      gstPaise: 53_982,
      totalPaise: 353_882,
    });
    expect(invoiceTotals(lines, { intraState: false })).toMatchObject({ igstPaise: 53_982, cgstPaise: 0, totalPaise: 353_882 });
    expect(intraState('07', null)).toBe(true);
    expect(intraState('07', '07ABCDE1234F1Z5')).toBe(true);
    expect(intraState('07', '27ABCDE1234F1Z5')).toBe(false);
  });

  it('3 000 random months: totals = Σ lines + GST, GST split adds up, never negative, broken charges dropped', () => {
    const rnd = random(13);
    for (let i = 0; i < 3000; i += 1) {
      const charges = Array.from({ length: rnd(0, 4) }, (_, k) => ({
        id: `c${k}`,
        kind: 'PLAN_FEE',
        description: 'fee',
        amountPaise: rnd(-500, 1_000_000),
      }));
      const allowance = rnd(0, 20_000);
      const lines = [
        ...chargeLines(charges),
        ...overageLines({
          used: rnd(0, 30_000),
          allowance,
          behaviour: rnd(0, 1) ? 'OVERAGE' : 'BLOCK',
          overagePricePerQueryPaise: rnd(0, 300),
          planName: 'P',
          month: '2026-11',
        }),
      ];
      const t = invoiceTotals(lines, { intraState: rnd(0, 1) === 1 });
      expect(lines.every((l) => l.amountPaise > 0)).toBe(true);
      expect(t.taxablePaise).toBe(lines.reduce((s, l) => s + l.amountPaise, 0));
      expect(t.cgstPaise + t.sgstPaise + t.igstPaise).toBe(t.gstPaise);
      expect(t.totalPaise).toBe(t.taxablePaise + t.gstPaise);
      expect(t.totalPaise).toBeGreaterThanOrEqual(0);
      expect(Math.abs(t.gstPaise - (t.taxablePaise * 18) / 100)).toBeLessThanOrEqual(0.5);
    }
  });
});
