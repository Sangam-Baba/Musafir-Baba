// @ts-check
/**
 * Bus fares (S18-T07).
 * - rules: every problem at once (stop pair must board → get off, amounts ₹1–₹10,000, no repeats, date rules valid);
 *   a deck's own fare beats the any-deck fare; the last matching date rule wins, only on its weekdays and dates; a
 *   fare never drops below ₹1 — checked over many generated cases;
 * - saving: whole save with a version check, change log, other operators can't read or write; quote for search.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import {
  checkFares,
  createFares,
  createRoutes,
  createStops,
  FareRecord,
  fareFor,
  MIN_FARE_PAISE,
  RouteRecord,
  StopRecord,
  weekdayOf,
} from '../../src/b2b/modules/bus-catalog/index.js';
import { startMongo } from './helpers/mongo.js';

const clock = { now: () => new Date('2026-12-01T06:30:00Z') };
const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const OP = { orgId: '65f0000000000000000b1841', userId: '65f0000000000000000c1841' };
const OTHER = { orgId: '65f0000000000000000b1842', userId: '65f0000000000000000c1842' };
const STOPS = [
  { stopId: 'd', boarding: true, dropping: false },
  { stopId: 'g', boarding: true, dropping: true },
  { stopId: 'j', boarding: false, dropping: true },
];
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
});
afterAll(async () => mongo.stop());
beforeEach(async () => {
  for (const M of [StopRecord, RouteRecord, FareRecord]) await /** @type {any} */ (M).deleteMany({}).setOptions(S);
});

describe('fare rules', () => {
  it('every problem at once', () => {
    const codes = checkFares(
      STOPS,
      [
        { fromIdx: 0, toIdx: 2, seatType: 'SLEEPER', deck: 'LOWER', netPaise: 90_000 },
        { fromIdx: 0, toIdx: 2, seatType: 'SLEEPER', deck: 'LOWER', netPaise: 80_000 },
        { fromIdx: 2, toIdx: 1, seatType: 'SLEEPER', deck: null, netPaise: 50_000 },
        { fromIdx: 1, toIdx: 0, seatType: 'SEATER', deck: null, netPaise: 50 },
      ],
      [{ id: 'x', label: 'Diwali', from: '2026-11-10', to: '2026-11-01', weekdays: [7], addPaise: 0 }],
    ).map((p) => p.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        'FARE_REPEATED',
        'FARE_STOPS_INVALID',
        'FARE_AMOUNT_INVALID',
        'RULE_DATES_INVALID',
        'WEEKDAYS_INVALID',
        'RULE_AMOUNT_INVALID',
      ]),
    );
  });

  it('deck fare first, last matching date rule wins, never below ₹1 (generated cases)', () => {
    const fares = {
      rows: [
        { fromIdx: 0, toIdx: 2, seatType: /** @type {const} */ ('SLEEPER'), deck: /** @type {const} */ ('LOWER'), netPaise: 90_000 },
        { fromIdx: 0, toIdx: 2, seatType: /** @type {const} */ ('SLEEPER'), deck: null, netPaise: 80_000 },
      ],
      rules: [
        { id: 'wk', label: 'Weekend', from: '2026-12-01', to: '2027-03-31', weekdays: [5, 6, 0], addPaise: 10_000 },
        { id: 'xmas', label: 'Christmas', from: '2026-12-24', to: '2026-12-26', weekdays: [], addPaise: 25_000 },
      ],
    };
    expect(fareFor(fares, { fromIdx: 0, toIdx: 2, seatType: 'SLEEPER', deck: 'LOWER', date: '2026-12-08' })).toEqual({
      netPaise: 90_000,
      baseNetPaise: 90_000,
      ruleId: null,
    });
    expect(fareFor(fares, { fromIdx: 0, toIdx: 2, seatType: 'SLEEPER', deck: 'UPPER', date: '2026-12-11' })).toMatchObject({
      netPaise: 90_000,
      ruleId: 'wk',
    }); // 80k + 10k (Fri)
    expect(fareFor(fares, { fromIdx: 0, toIdx: 2, seatType: 'SLEEPER', deck: 'UPPER', date: '2026-12-26' })).toMatchObject({
      netPaise: 105_000,
      ruleId: 'xmas',
    }); // Sat: last rule wins
    expect(fareFor(fares, { fromIdx: 0, toIdx: 1, seatType: 'SLEEPER', deck: 'UPPER', date: '2026-12-26' })).toBeNull();

    for (let i = 0; i < 2000; i += 1) {
      const base = MIN_FARE_PAISE + ((i * 7919) % 200_000);
      const add = ((i * 104_729) % 400_001) - 200_000 || 1;
      const date = `2027-0${1 + (i % 9)}-${String(1 + (i % 28)).padStart(2, '0')}`;
      const weekdays = [i % 7, (i + 3) % 7];
      const f = fareFor(
        {
          rows: [{ fromIdx: 0, toIdx: 1, seatType: 'SEATER', deck: null, netPaise: base }],
          rules: [{ id: 'r', label: 'r', from: '2027-01-01', to: '2027-12-31', weekdays, addPaise: add }],
        },
        { fromIdx: 0, toIdx: 1, seatType: 'SEATER', deck: 'LOWER', date },
      );
      const applies = weekdays.includes(weekdayOf(date));
      expect(f?.netPaise).toBe(Math.max(MIN_FARE_PAISE, base + (applies ? add : 0)));
      expect(f?.netPaise).toBeGreaterThanOrEqual(MIN_FARE_PAISE);
      expect(Number.isInteger(f?.netPaise)).toBe(true);
    }
  });
});

describe('saving fares', () => {
  it('version check, change log, own routes only, quote', async () => {
    const stops = createStops({ cityExists: async () => true });
    const d = await stops.create(OP, { cityId: 'c-d', name: 'Delhi' });
    const j = await stops.create(OP, { cityId: 'c-j', name: 'Jaipur' });
    const route = await createRoutes({ clock, stops }).create(OP, {
      name: 'Delhi → Jaipur',
      stops: [
        { stopId: d.id, dayOffset: 0, time: '22:00', boarding: true, dropping: false },
        { stopId: j.id, dayOffset: 1, time: '04:30', boarding: false, dropping: true },
      ],
    });
    const fares = createFares({ clock });
    expect(await fares.get(OP.orgId, route.id)).toMatchObject({ rows: [], version: 0 });
    const row = { fromIdx: 0, toIdx: 1, seatType: /** @type {const} */ ('SLEEPER'), deck: null, netPaise: 80_000 };
    const v1 = await fares.save(OP, route.id, {
      rows: [row],
      rules: [{ label: 'Weekend', from: '2026-12-01', to: '2027-03-31', weekdays: [5, 6, 0], addPaise: 10_000 }],
      expectedVersion: 0,
    });
    expect(v1).toMatchObject({
      version: 1,
      history: [expect.objectContaining({ summary: '0 changed, 1 added, 0 removed · 1 date rule' })],
    });
    expect(v1.rules[0]?.id).toMatch(/^[a-f0-9]{8}$/);
    await expect(fares.save(OP, route.id, { rows: [row], rules: [], expectedVersion: 0 })).rejects.toMatchObject({
      code: 'VERSION_CONFLICT',
    });
    await expect(fares.save(OP, route.id, { rows: [{ ...row, toIdx: 0 }], rules: [], expectedVersion: 1 })).rejects.toMatchObject({
      code: 'FARES_INVALID',
    });
    const v2 = await fares.save(OP, route.id, {
      rows: [
        { ...row, netPaise: 85_000 },
        { ...row, deck: 'LOWER', netPaise: 95_000 },
      ],
      rules: v1.rules,
      expectedVersion: 1,
    });
    expect(v2.history[0]?.summary).toBe('1 changed, 1 added, 0 removed · 1 date rule');
    await expect(fares.save(OP, route.id, { rows: [], rules: [], expectedVersion: 1 })).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });

    await expect(fares.get(OTHER.orgId, route.id)).rejects.toMatchObject({ code: 'ROUTE_NOT_FOUND' });
    await expect(fares.save(OTHER, route.id, { rows: [], rules: [], expectedVersion: 2 })).rejects.toMatchObject({
      code: 'ROUTE_NOT_FOUND',
    });
    expect(await fares.quote(route.id, { fromIdx: 0, toIdx: 1, seatType: 'SLEEPER', deck: 'UPPER', date: '2026-12-12' })).toMatchObject({
      netPaise: 95_000,
      ruleId: expect.any(String),
    }); // Sat: 85k + 10k
    expect(await fares.quote(route.id, { fromIdx: 0, toIdx: 1, seatType: 'SLEEPER', deck: 'LOWER', date: '2026-12-08' })).toMatchObject({
      netPaise: 95_000,
      ruleId: null,
    });
  });
});
