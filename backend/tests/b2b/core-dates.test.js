// @ts-check
import { describe, expect, it } from 'vitest';

import { fixedClock } from '../../src/b2b/core/clock.js';
import { addDays, hotelDeadline, isStayDate, nightsOf, todayIn, toStayDate } from '../../src/b2b/core/dates.js';

const d = toStayDate;

describe('stay dates', () => {
  it('accepts only real calendar dates', () => {
    expect(isStayDate('2026-12-24')).toBe(true);
    expect(isStayDate('2028-02-29')).toBe(true);
    for (const bad of ['2026-02-29', '2026-13-01', '2026-1-1', '24-12-2026', '2026-12-24T00:00:00Z', 20261224, null]) {
      expect(isStayDate(bad)).toBe(false);
    }
    expect(() => toStayDate('2026-02-30')).toThrow(/INVALID_STAY_DATE/);
  });

  it('lists the nights of a stay as [check-in, check-out)', () => {
    expect(nightsOf(d('2026-12-30'), d('2027-01-02'))).toEqual(['2026-12-30', '2026-12-31', '2027-01-01']);
    expect(nightsOf(d('2028-02-28'), d('2028-03-01'))).toEqual(['2028-02-28', '2028-02-29']);
  });

  it('refuses empty, reversed and very long stays', () => {
    expect(() => nightsOf(d('2026-12-24'), d('2026-12-24'))).toThrow(/INVALID_STAY/);
    expect(() => nightsOf(d('2026-12-25'), d('2026-12-24'))).toThrow(/INVALID_STAY/);
    expect(() => nightsOf(d('2026-01-01'), d('2026-03-01'))).toThrow(
      expect.objectContaining({ code: 'INVALID_STAY', details: { reason: 'at most 30 nights' } }),
    );
  });

  it('adds days across months and years', () => {
    expect(addDays(d('2026-12-31'), 1)).toBe('2027-01-01');
    expect(addDays(d('2026-03-01'), -1)).toBe('2026-02-28');
  });
});

describe('hotel-time deadlines', () => {
  it('computes an instant in the hotel time zone (India, +05:30)', () => {
    expect(hotelDeadline(d('2026-12-22'), '12:00', 'Asia/Kolkata').toISOString()).toBe('2026-12-22T06:30:00.000Z');
  });

  it('handles time zones with daylight saving (London summer and winter)', () => {
    expect(hotelDeadline(d('2026-07-01'), '12:00', 'Europe/London').toISOString()).toBe('2026-07-01T11:00:00.000Z');
    expect(hotelDeadline(d('2026-12-01'), '12:00', 'Europe/London').toISOString()).toBe('2026-12-01T12:00:00.000Z');
  });

  it('knows "today" in the hotel time zone', () => {
    const clock = fixedClock(new Date('2026-12-23T20:00:00Z')); // 01:30 on the 24th in India
    expect(todayIn(clock, 'Asia/Kolkata')).toBe('2026-12-24');
    expect(todayIn(clock, 'UTC')).toBe('2026-12-23');
  });

  it('refuses malformed local times', () => {
    expect(() => hotelDeadline(d('2026-12-22'), '24:00', 'Asia/Kolkata')).toThrow(/INVALID_LOCAL_TIME/);
  });
});
