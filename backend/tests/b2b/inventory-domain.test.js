// @ts-check
/** Pure rules of the hotel-inventory module (Stage 04): cancellation policies, rate plans, stay dates (calendar rules: inventory-domain-calendar.test.js). */
import { describe, expect, it } from 'vitest';

import { normalisePolicy, penaltyAt, summarise } from '../../src/b2b/modules/hotel-inventory/domain/cancellation.js';
import { addDays, daysBetween, isDate, nights, todayIn, weekday } from '../../src/b2b/modules/hotel-inventory/domain/dates.js';
import { checkRatePlan, derivedPrice } from '../../src/b2b/modules/hotel-inventory/domain/rate-plan.js';

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

describe('rate plans', () => {
  /** @type {import('../../src/b2b/modules/hotel-inventory/domain/rate-plan.js').RatePlanInput} */
  const ep = {
    name: ' Room only ',
    roomTypeIds: ['r1', 'r2', 'r1'],
    mealPlanKey: 'ep',
    cancellationPolicyId: 'p1',
    pricingModel: 'PER_OCCUPANCY',
    minAdvanceDays: 0,
    maxAdvanceDays: 365,
    derived: null,
  };
  const facts = {
    roomTypeIds: ['r1', 'r2', 'r3'],
    mealPlanKeys: ['ep', 'cp'],
    policyIds: ['p1'],
    parent: null,
    selfId: null,
    childRoomTypeIds: null,
    childPricingModel: null,
  };
  const parent = { id: 'ep1', status: 'ACTIVE', pricingModel: 'PER_OCCUPANCY', roomTypeIds: ['r1', 'r2'], derived: null };
  /** @param {() => unknown} fn */
  const codes = (fn) => {
    try {
      fn();
    } catch (e) {
      return /** @type {any} */ (e).details.errors.map((/** @type {any} */ x) => x.code);
    }
    return [];
  };

  it('a valid plan: name trimmed, room types once each', () => {
    expect(checkRatePlan(ep, facts)).toMatchObject({ name: 'Room only', roomTypeIds: ['r1', 'r2'] });
  });

  it('refuses unknown room types, meal plans, policies and a booking window the wrong way round — all at once', () => {
    expect(
      codes(() =>
        checkRatePlan(
          { ...ep, roomTypeIds: ['r9'], mealPlanKey: 'xx', cancellationPolicyId: 'p9', minAdvanceDays: 10, maxAdvanceDays: 5 },
          facts,
        ),
      ),
    ).toEqual(['ROOM_TYPE_UNKNOWN', 'MEAL_PLAN_UNKNOWN', 'POLICY_UNKNOWN', 'ADVANCE_DAYS_ORDER']);
    expect(codes(() => checkRatePlan({ ...ep, roomTypeIds: [] }, facts))).toEqual(['ROOM_TYPE_REQUIRED']);
  });

  it("derived plans: one level, same pricing model, only the parent's room types, a sensible adjustment", () => {
    const cp = {
      ...ep,
      mealPlanKey: 'cp',
      derived: { parentRatePlanId: 'ep1', adjust: /** @type {const} */ ({ type: 'AMOUNT', value: 50000 }) },
    };
    expect(checkRatePlan(cp, { ...facts, parent }).derived).toEqual(cp.derived);
    expect(codes(() => checkRatePlan({ ...cp, roomTypeIds: ['r3'], pricingModel: 'PER_ROOM' }, { ...facts, parent }))).toEqual([
      'PARENT_PRICING_MODEL_DIFFERS',
      'ROOM_TYPE_NOT_IN_PARENT',
    ]);
    expect(codes(() => checkRatePlan(cp, { ...facts, parent: { ...parent, derived: { x: 1 } } }))).toEqual(['PARENT_IS_DERIVED']);
    expect(codes(() => checkRatePlan(cp, { ...facts, parent: { ...parent, status: 'ARCHIVED' } }))).toEqual(['PARENT_UNKNOWN']);
    expect(codes(() => checkRatePlan(cp, { ...facts, parent, selfId: 'ep1' }))).toEqual(['PARENT_IS_SELF']);
    expect(
      codes(() =>
        checkRatePlan({ ...cp, derived: { parentRatePlanId: 'ep1', adjust: { type: 'PERCENT', value: -95 } } }, { ...facts, parent }),
      ),
    ).toEqual(['ADJUST_OUT_OF_RANGE']);
    expect(codes(() => checkRatePlan(cp, { ...facts, parent, childRoomTypeIds: ['r1'], childPricingModel: 'PER_OCCUPANCY' }))).toEqual([
      'PLANS_DERIVED_FROM_IT',
    ]);
  });

  it('a plan others follow keeps what they need', () => {
    const f = { ...facts, childRoomTypeIds: ['r2'], childPricingModel: 'PER_OCCUPANCY' };
    expect(codes(() => checkRatePlan({ ...ep, roomTypeIds: ['r1'], pricingModel: 'PER_ROOM' }, f))).toEqual([
      'DERIVED_PLANS_NEED_PRICING_MODEL',
      'DERIVED_PLANS_NEED_ROOM_TYPE',
    ]);
  });

  it('derived price: amount or percent of the parent, never below ₹1, nothing without a parent price', () => {
    expect(derivedPrice(300000, { type: 'AMOUNT', value: 50000 })).toBe(350000);
    expect(derivedPrice(300000, { type: 'PERCENT', value: -10 })).toBe(270000);
    expect(derivedPrice(333, { type: 'PERCENT', value: 15 })).toBe(383);
    expect(derivedPrice(20000, { type: 'AMOUNT', value: -50000 })).toBe(100);
    expect(derivedPrice(null, { type: 'AMOUNT', value: 100 })).toBeNull();
  });
});

describe('stay dates', () => {
  it('real calendar dates only', () => {
    expect(['2026-12-24', '2028-02-29'].map(isDate)).toEqual([true, true]);
    expect(['2026-02-29', '2026-13-01', '24-12-2026', '2026-12-24T00:00', 20261224].map(isDate)).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it('nights are [from, to): to excluded; across months and leap days; wrong way round / too long refused', () => {
    expect(nights('2026-12-30', '2027-01-02')).toEqual(['2026-12-30', '2026-12-31', '2027-01-01']);
    expect(nights('2028-02-28', '2028-03-01')).toEqual(['2028-02-28', '2028-02-29']);
    expect(() => nights('2026-12-02', '2026-12-02')).toThrow(expect.objectContaining({ code: 'DATE_RANGE_EMPTY' }));
    expect(() => nights('2026-01-01', '2026-03-01', 30)).toThrow(expect.objectContaining({ code: 'DATE_RANGE_TOO_LONG' }));
    expect(() => nights('2026-02-30', '2026-03-01')).toThrow(expect.objectContaining({ code: 'DATE_INVALID' }));
    expect([addDays('2026-12-31', 1), daysBetween('2026-11-17', '2027-11-17'), weekday('2026-12-25')]).toEqual(['2027-01-01', 365, 5]);
  });

  it("today is the property's own date", () => {
    const lateEvening = new Date('2026-11-17T20:00:00Z'); // 01:30 on the 18th in India
    expect(todayIn('Asia/Kolkata', lateEvening)).toBe('2026-11-18');
    expect(todayIn('America/New_York', lateEvening)).toBe('2026-11-17');
  });
});
