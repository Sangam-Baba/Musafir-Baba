// @ts-check
/**
 * Bulk calendar edits (S04-T06): range + weekdays, past nights skipped, rooms never below booked + held (dates
 * listed), partial price changes kept, derived plans, preview, > 50 % confirmation, repeat-safe request id,
 * undo of the latest change, change history, limits.
 */
import { describe, expect, it } from 'vitest';

import {
  CancellationPolicyRecord,
  ChangeLogRecord,
  InventoryDayRecord,
  RateDayRecord,
  RatePlanRecord,
} from '../../src/b2b/modules/hotel-inventory/index.js';
import { auth, SYSTEM, useInventoryApp } from './helpers/inventory-app.js';

const clock = { now: () => new Date('2026-11-17T10:00:00Z') };
const app = useInventoryApp({
  clock,
  models: [CancellationPolicyRecord, RatePlanRecord, InventoryDayRecord, RateDayRecord, ChangeLogRecord],
});
let n = 0;
const rid = () => `req-${String((n += 1)).padStart(6, '0')}`;

async function setup() {
  const h = await app.hotelWithProperty();
  const room = await app.roomType(h.token, h.propertyId);
  const policy = (
    await app.srv.post(
      `/api/v1/hotel/properties/${h.propertyId}/cancellation-policies`,
      { name: 'Flexible', nonRefundable: false, rules: [], noShow: { type: 'PERCENT', value: 100 } },
      auth(h.token),
    )
  ).body.id;
  const plan = { roomTypeIds: [room], cancellationPolicyId: policy, pricingModel: 'PER_OCCUPANCY', minAdvanceDays: 0, maxAdvanceDays: 365 };
  const plans = `/api/v1/hotel/properties/${h.propertyId}/rate-plans`;
  const ep = (await app.srv.post(plans, { ...plan, name: 'Room only', mealPlanKey: 'ep', derived: null }, auth(h.token))).body.id;
  const cp = (
    await app.srv.post(
      plans,
      { ...plan, name: 'Breakfast', mealPlanKey: 'cp', derived: { parentRatePlanId: ep, adjust: { type: 'AMOUNT', value: 50000 } } },
      auth(h.token),
    )
  ).body.id;
  const url = `/api/v1/hotel/properties/${h.propertyId}/calendar`;
  /** @param {Record<string, unknown>} body @param {string} [token] */
  const put = (body, token = h.token) => app.srv.put(url, { requestId: rid(), ...body }, auth(token));
  /** @param {string} from @param {string} to */
  const read = async (from, to) => (await app.srv.get(`${url}?from=${from}&to=${to}`, auth(h.token))).body.roomTypes[0];
  return { ...h, room, ep, cp, url, put, read };
}

describe('changing the calendar in bulk', () => {
  it('every Fri–Sat of a range; past nights skipped and listed; preview writes nothing', async () => {
    const s = await setup();
    const change = { from: '2026-11-13', to: '2026-11-29', weekdays: [5, 6], rooms: [{ roomTypeId: s.room, total: 5 }] };
    const preview = await s.put({ ...change, preview: true });
    expect(preview.body).toMatchObject({ preview: true, nights: 4, skipped: { past: ['2026-11-13', '2026-11-14'] }, refused: [] });
    expect((await s.read('2026-11-20', '2026-11-21')).nights[0].total).toBe(0);
    const done = await s.put(change);
    expect(done.body).toMatchObject({ preview: false, nights: 4, changeId: expect.any(String) });
    const log = /** @type {any} */ (await ChangeLogRecord.findById(done.body.changeId).setOptions(SYSTEM).lean());
    expect(log.pendingEvents.map((/** @type {any} */ e) => [e.type, e.payload])).toEqual([
      [
        'hotel-inventory.inventory.changed',
        { orgId: s.orgId, propertyId: s.propertyId, roomTypeIds: [s.room], dateFrom: '2026-11-20', dateTo: '2026-11-29' },
      ],
    ]); // stored with the change → relayed → live availability:changed (inventory-signals.test.js)
    const nights = (await s.read('2026-11-17', '2026-11-29')).nights;
    expect(nights.filter((/** @type {any} */ x) => x.total === 5).map((/** @type {any} */ x) => x.date)).toEqual([
      '2026-11-20',
      '2026-11-21',
      '2026-11-27',
      '2026-11-28',
    ]);
  });

  it('rooms never go below booked + held: those nights are listed and keep their rooms', async () => {
    const s = await setup();
    await s.put({ from: '2026-12-01', to: '2026-12-04', rooms: [{ roomTypeId: s.room, total: 4 }] });
    await InventoryDayRecord.updateOne(
      { roomTypeId: s.room, date: '2026-12-02' },
      { $set: { booked: 3, bookings: [{ bookingId: 'b1', qty: 3 }] } },
    ).setOptions(SYSTEM);
    const res = await s.put({ from: '2026-12-01', to: '2026-12-04', rooms: [{ roomTypeId: s.room, total: 2, stopSell: true }] });
    expect(res.body.refused).toEqual([{ roomTypeId: s.room, date: '2026-12-02', booked: 3, held: 0 }]);
    const nights = (await s.read('2026-12-01', '2026-12-04')).nights;
    expect(nights.map((/** @type {any} */ x) => [x.total, x.available, x.stopSell])).toEqual([
      [2, 2, true],
      [4, 1, true],
      [2, 2, true],
    ]);
  });

  it('prices per number of guests: a partial change keeps the others; derived plans take rules only; > 50 % must be confirmed', async () => {
    const s = await setup();
    const range = { from: '2026-12-10', to: '2026-12-12' };
    await s.put({
      ...range,
      rates: [
        {
          ratePlanId: s.ep,
          roomTypeId: s.room,
          prices: [
            { guests: 1, amount: 300000 },
            { guests: 2, amount: 350000 },
          ],
          minLos: 2,
        },
      ],
    });
    await s.put({ ...range, rates: [{ ratePlanId: s.ep, roomTypeId: s.room, prices: [{ guests: 2, amount: 380000 }] }] });
    const refused = await s.put({ ...range, rates: [{ ratePlanId: s.cp, roomTypeId: s.room, prices: [{ guests: 2, amount: 200000 }] }] });
    expect([refused.status, refused.body.code, refused.body.errors]).toEqual([
      422,
      'CALENDAR_EDIT_INVALID',
      [{ path: 'rates.0', code: 'PRICES_COME_FROM_PARENT' }],
    ]);
    await s.put({ ...range, rates: [{ ratePlanId: s.cp, roomTypeId: s.room, closedToArrival: true }] });
    const day = (await s.read('2026-12-10', '2026-12-11')).ratePlans;
    expect(day.find((/** @type {any} */ p) => p.id === s.ep).days[0]).toMatchObject({
      prices: [
        { guests: 1, amount: 300000 },
        { guests: 2, amount: 380000 },
      ],
      minLos: 2,
    });
    expect(day.find((/** @type {any} */ p) => p.id === s.cp).days[0]).toMatchObject({
      prices: [
        { guests: 1, amount: 350000 },
        { guests: 2, amount: 430000 },
      ],
      minLos: 2,
      closedToArrival: true,
    });
    const big = await s.put({ ...range, rates: [{ ratePlanId: s.ep, roomTypeId: s.room, prices: [{ guests: 1, amount: 900000 }] }] });
    expect([big.status, big.body.code, big.body.warnings[0]]).toEqual([
      409,
      'BIG_PRICE_CHANGE',
      { ratePlanId: s.ep, roomTypeId: s.room, date: '2026-12-10', guests: 1, from: 300000, to: 900000 },
    ]);
    expect(
      (
        await s.put({
          ...range,
          confirmBigChange: true,
          rates: [{ ratePlanId: s.ep, roomTypeId: s.room, prices: [{ guests: 1, amount: 900000 }] }],
        })
      ).status,
    ).toBe(200);
  });

  it('the same request id twice applies once; the latest change can be undone (only the latest); history lists who and when', async () => {
    const s = await setup();
    const range = { from: '2026-12-20', to: '2026-12-22' };
    await s.put({
      ...range,
      rooms: [{ roomTypeId: s.room, total: 3 }],
      rates: [{ ratePlanId: s.ep, roomTypeId: s.room, prices: [{ guests: 2, amount: 500000 }] }],
    });
    const body = {
      requestId: 'same-request-01',
      ...range,
      rooms: [{ roomTypeId: s.room, total: 6 }],
      rates: [{ ratePlanId: s.ep, roomTypeId: s.room, prices: [{ guests: 2, amount: 600000 }] }],
    };
    const first = await app.srv.put(s.url, body, auth(s.token));
    const again = await app.srv.put(s.url, body, auth(s.token));
    expect(again.body.changeId).toBe(first.body.changeId);
    expect(await ChangeLogRecord.countDocuments({ requestId: 'same-request-01' }).setOptions(SYSTEM)).toBe(1);
    const history = (await app.srv.get(`${s.url}/changes`, auth(s.token))).body.data;
    expect(history.map((/** @type {any} */ h) => [h.kind, h.by.startsWith('user:')])).toEqual([
      ['EDIT', true],
      ['EDIT', true],
    ]);
    expect((await app.srv.post(`${s.url}/undo`, { changeId: history[1].id }, auth(s.token))).body.code).toBe('UNDO_NOT_LATEST');
    const undone = await app.srv.post(`${s.url}/undo`, { changeId: first.body.changeId }, auth(s.token));
    expect(undone.body).toEqual({ undone: first.body.changeId, refused: [] });
    const rt = await s.read('2026-12-20', '2026-12-21');
    expect([rt.nights[0].total, rt.ratePlans.find((/** @type {any} */ p) => p.id === s.ep).days[0].prices]).toEqual([
      3,
      [{ guests: 2, amount: 500000 }],
    ]);
    expect((await app.srv.post(`${s.url}/undo`, { changeId: first.body.changeId }, auth(s.token))).body.code).toBe('UNDO_NOT_LATEST');
  });

  it('refuses unknown room types and plans; follows the limits (Front Desk 403, unassigned property 404)', async () => {
    const s = await setup();
    const bad = await s.put({ from: '2026-12-01', to: '2026-12-02', rooms: [{ roomTypeId: '64b0000000000000000000aa', total: 1 }] });
    expect(bad.body.errors).toEqual([{ path: 'rooms.0.roomTypeId', code: 'ROOM_TYPE_UNKNOWN' }]);
    expect((await s.put({ from: '2026-12-01', to: '2026-12-02', rooms: [{ roomTypeId: s.room }] })).body.errors).toEqual([
      { path: 'rooms.0', code: 'NOTHING_TO_CHANGE' },
    ]);
    const desk = await app.staff(s.orgId, 'desk@seaview.in', 'hotel.frontDesk');
    expect((await s.put({ from: '2026-12-01', to: '2026-12-02', rooms: [{ roomTypeId: s.room, total: 1 }] }, desk)).status).toBe(403);
    const other = await app.anotherProperty(s.token);
    const m = await app.staff(s.orgId, 'manager@seaview.in', 'hotel.manager', [s.propertyId]);
    expect(
      (
        await app.srv.put(
          `/api/v1/hotel/properties/${other}/calendar`,
          { requestId: rid(), from: '2026-12-01', to: '2026-12-02', rooms: [] },
          auth(m),
        )
      ).status,
    ).toBe(404);
  });
});
