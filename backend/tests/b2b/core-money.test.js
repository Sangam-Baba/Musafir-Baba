// @ts-check
import { describe, expect, it } from 'vitest';

import { DomainError } from '../../src/b2b/core/errors.js';
import { Money } from '../../src/b2b/core/money.js';

describe('Money (integer paise)', () => {
  it('adds, subtracts, multiplies and sums', () => {
    expect(Money.inr(1000).add(Money.inr(250)).paise).toBe(1250);
    expect(Money.inr(1000).subtract(Money.inr(250)).paise).toBe(750);
    expect(Money.inr(450000).times(3).paise).toBe(1350000);
    expect(Money.sum([Money.inr(1), Money.inr(2), Money.inr(3)]).paise).toBe(6);
    expect(Money.sum([]).isZero()).toBe(true);
  });

  it('rounds percentages half-up to the paisa (basis points)', () => {
    expect(Money.inr(1000000).percent(1200).paise).toBe(120000); // 12 % GST on ₹10,000
    expect(Money.inr(5).percent(5000).paise).toBe(3); // 2.5 → 3
    expect(Money.inr(3).percent(5000).paise).toBe(2); // 1.5 → 2
    expect(Money.inr(1).percent(4999).paise).toBe(0); // 0.4999 → 0
  });

  it('refuses floats, negatives, unsafe numbers and negative results', () => {
    for (const bad of [10.5, -1, Number.NaN, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => Money.inr(bad)).toThrow(DomainError);
    }
    expect(() => Money.inr(100).subtract(Money.inr(101))).toThrow(/INVALID_MONEY/);
    expect(() => Money.inr(100).percent(12.5)).toThrow(/INVALID_RATE/);
    expect(() => Money.inr(100).times(1.5)).toThrow(/INVALID_QUANTITY/);
  });

  it('is immutable and serialises to the API shape', () => {
    const m = Money.inr(1100000);
    expect(Object.isFrozen(m)).toBe(true);
    expect(JSON.parse(JSON.stringify({ total: m }))).toEqual({ total: { amountPaise: 1100000, currency: 'INR' } });
  });

  it('percent of a sum never differs from the sum of percents by more than 1 paisa per part (random check)', () => {
    for (let i = 0; i < 500; i += 1) {
      const parts = Array.from({ length: 5 }, () => Money.inr(Math.floor(Math.random() * 10_000_000)));
      const bps = Math.floor(Math.random() * 3000);
      const whole = Money.sum(parts).percent(bps).paise;
      const split = parts.reduce((t, p) => t + p.percent(bps).paise, 0);
      expect(Math.abs(whole - split)).toBeLessThanOrEqual(parts.length);
    }
  });
});
