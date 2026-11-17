// @ts-check
/** Pure calendar rules of the hotel-inventory module (Stage 04): prices and rules per night, the grid, bulk edits. */
import { describe, expect, it } from 'vitest';

import { bigChanges, mergedPrices, rateChangeProblems, selectDates } from '../../src/b2b/modules/hotel-inventory/domain/bulk-edit.js';
import { buildCalendar } from '../../src/b2b/modules/hotel-inventory/domain/calendar.js';
import { nights, weekday } from '../../src/b2b/modules/hotel-inventory/domain/dates.js';
import { effectiveDay, EMPTY_DAY, priceFor, priceKeys } from '../../src/b2b/modules/hotel-inventory/domain/rate-day.js';

describe('prices and rules per night', () => {
  const perGuest = { pricingModel: 'PER_OCCUPANCY', derived: null };
  const day = {
    ...EMPTY_DAY,
    prices: [
      { guests: 1, amount: 300000 },
      { guests: 2, amount: 350000 },
    ],
    minLos: 2,
    closedToDeparture: true,
  };

  it('price keys: one per room, or one per number of guests up to the room maximum', () => {
    expect(priceKeys({ pricingModel: 'PER_ROOM' }, { maxOccupancy: 3 })).toEqual([0]);
    expect(priceKeys(perGuest, { maxOccupancy: 3 })).toEqual([1, 2, 3]);
    expect([
      priceFor(day, perGuest, 2),
      priceFor(day, perGuest, 3),
      priceFor({ ...EMPTY_DAY, prices: [{ guests: 0, amount: 1 }] }, { pricingModel: 'PER_ROOM' }, 4),
    ]).toEqual([350000, null, 1]);
  });

  it('a derived plan: prices from the parent; the stricter rules of both', () => {
    const cp = { derived: { adjust: /** @type {const} */ ({ type: 'AMOUNT', value: 50000 }) } };
    const own = { ...EMPTY_DAY, minLos: 1, maxLos: 5, stopSell: false, closedToArrival: true };
    expect(effectiveDay(cp, own, { ...day, maxLos: 7, stopSell: true })).toEqual({
      prices: [
        { guests: 1, amount: 350000 },
        { guests: 2, amount: 400000 },
      ],
      minLos: 2,
      maxLos: 5,
      closedToArrival: true,
      closedToDeparture: true,
      stopSell: true,
    });
    expect(effectiveDay(cp, null, null)).toEqual(EMPTY_DAY); // no parent price → nothing to sell
    expect(effectiveDay({ derived: null }, null, null)).toEqual(EMPTY_DAY);
  });

  it('the calendar grid: rooms per night, plans selling each room type, past nights read-only', () => {
    const grid = buildCalendar({
      dates: ['2026-11-16', '2026-11-17'],
      today: '2026-11-17',
      windowEnd: '2027-11-17',
      roomTypes: [{ id: 'r1', name: 'Deluxe', maxOccupancy: 2 }],
      plans: [
        { id: 'ep', name: 'EP', mealPlanKey: 'ep', pricingModel: 'PER_OCCUPANCY', status: 'ACTIVE', roomTypeIds: ['r1'], derived: null },
        { id: 'x', name: 'Other room', mealPlanKey: 'ep', pricingModel: 'PER_ROOM', status: 'ACTIVE', roomTypeIds: ['r2'], derived: null },
      ],
      nights: [{ roomTypeId: 'r1', date: '2026-11-17', total: 5, booked: 2, held: 1, stopSell: false }],
      rateDays: [{ ratePlanId: 'ep', roomTypeId: 'r1', date: '2026-11-17', prices: [{ guests: 2, amount: 400000 }] }],
    });
    const rt = grid.roomTypes[0];
    expect(rt?.nights).toEqual([
      { date: '2026-11-16', total: 0, booked: 0, held: 0, available: 0, stopSell: false, editable: false },
      { date: '2026-11-17', total: 5, booked: 2, held: 1, available: 2, stopSell: false, editable: true },
    ]);
    expect(rt?.ratePlans.map((p) => [p.id, p.priceKeys])).toEqual([['ep', [1, 2]]]);
    expect(rt?.ratePlans[0]?.days[1]).toMatchObject({ prices: [{ guests: 2, amount: 400000 }], editable: true });
  });
});

describe('bulk edits', () => {
  it('nights by weekday; past and beyond-window nights set aside', () => {
    const all = nights('2026-11-13', '2026-11-23');
    expect(selectDates(all, { weekdays: [5, 6], today: '2026-11-17', windowEnd: '2026-11-21', weekdayOf: weekday })).toEqual({
      dates: ['2026-11-20', '2026-11-21'],
      past: ['2026-11-13', '2026-11-14'],
      beyondWindow: [],
    });
    expect(selectDates(all, { weekdays: null, today: '2026-11-21', windowEnd: '2026-11-21', weekdayOf: weekday }).beyondWindow).toEqual([
      '2026-11-22',
    ]);
  });

  it('price / rule change checks', () => {
    const plan = { roomTypeIds: ['r1'], pricingModel: 'PER_OCCUPANCY', derived: null };
    const room = { maxOccupancy: 2 };
    expect(rateChangeProblems({ ratePlanId: 'x', roomTypeId: 'r1', stopSell: true }, undefined, room)).toEqual(['RATE_PLAN_UNKNOWN']);
    expect(rateChangeProblems({ ratePlanId: 'x', roomTypeId: 'r2', stopSell: true }, plan, room)).toEqual(['ROOM_TYPE_NOT_IN_PLAN']);
    expect(
      rateChangeProblems(
        {
          ratePlanId: 'x',
          roomTypeId: 'r1',
          prices: [
            { guests: 3, amount: 100 },
            { guests: 3, amount: 200 },
          ],
          minLos: 5,
          maxLos: 2,
        },
        plan,
        room,
      ),
    ).toEqual(['PRICE_GUESTS_INVALID', 'PRICE_GUESTS_REPEATED', 'STAY_LIMITS_ORDER']);
    expect(rateChangeProblems({ ratePlanId: 'x', roomTypeId: 'r1', prices: [] }, plan, room)).toEqual(['NOTHING_TO_CHANGE']);
    expect(rateChangeProblems({ ratePlanId: 'x', roomTypeId: 'r1', minLos: null }, plan, room)).toEqual([]); // clearing a rule is a change
  });

  it('> 50 % moves flagged both ways; merged prices keep untouched guests and drop removed ones', () => {
    const current = [
      { guests: 1, amount: 100000 },
      { guests: 2, amount: 200000 },
    ];
    expect(
      bigChanges(current, [
        { guests: 1, amount: 150000 },
        { guests: 2, amount: 90000 },
        { guests: 3, amount: 1 },
      ]),
    ).toEqual([{ guests: 2, from: 200000, to: 90000 }]);
    expect(
      mergedPrices(current, [
        { guests: 2, amount: null },
        { guests: 3, amount: 300000 },
      ]),
    ).toEqual([
      { guests: 1, amount: 100000 },
      { guests: 3, amount: 300000 },
    ]);
  });
});
