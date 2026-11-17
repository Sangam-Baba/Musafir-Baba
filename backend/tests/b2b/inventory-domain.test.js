// @ts-check
/** Pure rules of the hotel-inventory module (Stage 04): cancellation policies. */
import { describe, expect, it } from 'vitest';

import { normalisePolicy, penaltyAt, summarise } from '../../src/b2b/modules/hotel-inventory/domain/cancellation.js';

/** @typedef {import('../../src/b2b/modules/hotel-inventory/domain/cancellation.js').PolicyInput} PolicyInput */

/** @type {PolicyInput} */
const flexible = {
  name: ' Flexible ',
  nonRefundable: false,
  rules: [
    { hoursBefore: 24, penalty: { type: 'NIGHTS', value: 1 } },
    { hoursBefore: 72, penalty: { type: 'PERCENT', value: 25 } },
    { hoursBefore: 0, penalty: { type: 'PERCENT', value: 100 } },
  ],
  noShow: { type: 'PERCENT', value: 100 },
};

/** @param {() => unknown} fn */
const codes = (fn) => {
  try {
    fn();
  } catch (e) {
    return /** @type {any} */ (e).details.errors.map((/** @type {any} */ x) => x.code);
  }
  return [];
};

describe('cancellation policies', () => {
  it('rules are kept furthest from check-in first; the name is trimmed', () => {
    const p = normalisePolicy(flexible);
    expect(p.name).toBe('Flexible');
    expect(p.rules.map((r) => r.hoursBefore)).toEqual([72, 24, 0]);
  });

  it('refuses (all problems at once): rules on a non-refundable plan, repeated hours, out-of-range values, cheaper closer to check-in', () => {
    expect(codes(() => normalisePolicy({ ...flexible, nonRefundable: true }))).toEqual(['NON_REFUNDABLE_HAS_RULES']);
    const bad = codes(() =>
      normalisePolicy({
        ...flexible,
        rules: [
          { hoursBefore: 48, penalty: { type: 'PERCENT', value: 50 } },
          { hoursBefore: 48, penalty: { type: 'PERCENT', value: 150 } },
          { hoursBefore: 12, penalty: { type: 'PERCENT', value: 20 } },
          { hoursBefore: 9000, penalty: { type: 'FIXED', value: 50 } },
        ],
        noShow: { type: 'NIGHTS', value: 0 },
      }),
    );
    expect(bad).toEqual([
      'RULE_HOURS_REPEATED',
      'RULE_HOURS_OUT_OF_RANGE',
      'PENALTY_FIXED_OUT_OF_RANGE',
      'PENALTY_PERCENT_OUT_OF_RANGE',
      'PENALTY_DECREASES_CLOSER_TO_CHECK_IN',
      'PENALTY_NIGHTS_OUT_OF_RANGE',
    ]);
  });

  it('summary text the guest reads', () => {
    expect(summarise(normalisePolicy(flexible))).toBe(
      'Free cancellation until 3 days before check-in. Cancelled within 3 days of check-in: 25% of the booking amount. ' +
        "Cancelled within 1 day of check-in: the first night's price. Cancelled after check-in time: the full booking amount. " +
        'No-show: the full booking amount.',
    );
    expect(summarise({ name: 'NR', nonRefundable: true, rules: [], noShow: { type: 'PERCENT', value: 100 } })).toBe(
      'Non-refundable: cancelling costs the full booking amount. No-show: the full booking amount.',
    );
    expect(summarise({ name: 'Free', nonRefundable: false, rules: [], noShow: { type: 'FIXED', value: 150050 } })).toBe(
      'Free cancellation until check-in. No-show: ₹1,500.50.',
    );
    expect(summarise({ ...flexible, rules: [{ hoursBefore: 6, penalty: { type: 'NIGHTS', value: 2 } }] })).toBe(
      'Free cancellation until 6 hours before check-in. Cancelled within 6 hours of check-in: the price of 2 nights. No-show: the full booking amount.',
    );
  });

  it('which penalty applies at a moment', () => {
    const p = normalisePolicy(flexible);
    expect(penaltyAt(p, 100)).toBeNull();
    expect(penaltyAt(p, 72)).toBeNull(); // exactly 72 h before: still free
    expect(penaltyAt(p, 71.5)).toEqual({ type: 'PERCENT', value: 25 });
    expect(penaltyAt(p, 10)).toEqual({ type: 'NIGHTS', value: 1 });
    expect(penaltyAt(p, 0)).toEqual({ type: 'NIGHTS', value: 1 });
    expect(penaltyAt(p, -1)).toEqual({ type: 'PERCENT', value: 100 });
    expect(penaltyAt({ ...p, nonRefundable: true, rules: [] }, 500)).toEqual({ type: 'PERCENT', value: 100 });
  });
});

