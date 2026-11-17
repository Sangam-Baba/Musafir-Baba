// @ts-check
/** Reading the calendar (S04-T05): creates the window's nights (0 rooms), derived prices, ranges, limits. */
import { describe, expect, it } from 'vitest';

import {
  CancellationPolicyRecord,
  InventoryDayRecord,
  RateDayRecord,
  RatePlanRecord,
} from '../../src/b2b/modules/hotel-inventory/index.js';
import { auth, SYSTEM, useInventoryApp } from './helpers/inventory-app.js';

const clock = { now: () => new Date('2026-11-17T20:00:00Z') }; // already 18 Nov in India
const app = useInventoryApp({ clock, models: [CancellationPolicyRecord, RatePlanRecord, InventoryDayRecord, RateDayRecord] });

/** A property with a room type, a policy, a room-only plan and a breakfast plan following it. */
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
  const ep = (
    await app.srv.post(
      `/api/v1/hotel/properties/${h.propertyId}/rate-plans`,
      { ...plan, name: 'Room only', mealPlanKey: 'ep', derived: null },
      auth(h.token),
    )
  ).body;
  const cp = (
    await app.srv.post(
      `/api/v1/hotel/properties/${h.propertyId}/rate-plans`,
      { ...plan, name: 'Breakfast', mealPlanKey: 'cp', derived: { parentRatePlanId: ep.id, adjust: { type: 'AMOUNT', value: 50000 } } },
      auth(h.token),
    )
  ).body;
  return { ...h, room, ep, cp };
}
/** @param {string} propertyId @param {string} from @param {string} to */
const cal = (propertyId, from, to) => `/api/v1/hotel/properties/${propertyId}/calendar?from=${from}&to=${to}`;

describe('reading the calendar', () => {
  it("opening it creates the missing nights from today (the property's date) with 0 rooms; past nights are read-only and not created", async () => {
    const s = await setup();
    const res = await app.srv.get(cal(s.propertyId, '2026-11-17', '2026-11-20'), auth(s.token));
    expect([res.status, res.headers.get('cache-control')]).toEqual([200, 'private, no-store']);
    expect(res.body).toMatchObject({
      today: '2026-11-18',
      dates: ['2026-11-17', '2026-11-18', '2026-11-19'],
      property: { timeZone: 'Asia/Kolkata' },
    });
    expect(res.body.roomTypes[0].nights.map((/** @type {any} */ n) => [n.date, n.total, n.editable])).toEqual([
      ['2026-11-17', 0, false],
      ['2026-11-18', 0, true],
      ['2026-11-19', 0, true],
    ]);
    const stored = await InventoryDayRecord.find({ roomTypeId: s.room }).setOptions(SYSTEM).lean();
    expect(stored.map((n) => n.date).sort()).toEqual(['2026-11-18', '2026-11-19']);
  });

  it('plans per room type with their nights; the breakfast plan shows the room-only price + ₹500 and the stricter rules', async () => {
    const s = await setup();
    await RateDayRecord.create({
      hotelOrgId: s.orgId,
      propertyId: s.propertyId,
      ratePlanId: s.ep.id,
      roomTypeId: s.room,
      date: '2026-11-20',
      prices: [{ guests: 2, amount: 400000 }],
      stopSell: true,
    });
    await RateDayRecord.create({
      hotelOrgId: s.orgId,
      propertyId: s.propertyId,
      ratePlanId: s.cp.id,
      roomTypeId: s.room,
      date: '2026-11-20',
      minLos: 2,
    });
    const body = (await app.srv.get(cal(s.propertyId, '2026-11-20', '2026-11-21'), auth(s.token))).body;
    const plans = body.roomTypes[0].ratePlans;
    expect(plans.map((/** @type {any} */ p) => [p.name, p.priceKeys])).toEqual([
      ['Breakfast', [1, 2, 3]],
      ['Room only', [1, 2, 3]],
    ]);
    expect(plans[0].days[0]).toMatchObject({ prices: [{ guests: 2, amount: 450000 }], minLos: 2, stopSell: true, editable: true });
    expect(plans[1].days[0]).toMatchObject({ prices: [{ guests: 2, amount: 400000 }], minLos: null, stopSell: true });
  });

  it('refuses ranges the wrong way round, longer than 92 nights, or not real dates', async () => {
    const s = await setup();
    expect((await app.srv.get(cal(s.propertyId, '2026-12-05', '2026-12-01'), auth(s.token))).body.code).toBe('DATE_RANGE_EMPTY');
    expect((await app.srv.get(cal(s.propertyId, '2026-12-01', '2027-03-15'), auth(s.token))).body.code).toBe('DATE_RANGE_TOO_LONG');
    expect((await app.srv.get(cal(s.propertyId, '2026-02-30', '2026-03-02'), auth(s.token))).body.code).toBe('DATE_INVALID');
    expect((await app.srv.get(`/api/v1/hotel/properties/${s.propertyId}/calendar?from=2026-12-01`, auth(s.token))).status).toBe(400);
  });

  it("follows the property's limits", async () => {
    const s = await setup();
    const other = await app.anotherProperty(s.token);
    const m = await app.staff(s.orgId, 'manager@seaview.in', 'hotel.manager', [s.propertyId]);
    expect((await app.srv.get(cal(s.propertyId, '2026-12-01', '2026-12-02'), auth(m))).status).toBe(200);
    expect((await app.srv.get(cal(other, '2026-12-01', '2026-12-02'), auth(m))).status).toBe(404);
    const desk = await app.staff(s.orgId, 'desk@seaview.in', 'hotel.frontDesk');
    expect((await app.srv.get(cal(s.propertyId, '2026-12-01', '2026-12-02'), auth(desk))).status).toBe(403);
    const stranger = await app.hotelWithProperty('owner@hill.in');
    expect((await app.srv.get(cal(s.propertyId, '2026-12-01', '2026-12-02'), auth(stranger.token))).status).toBe(404);
  });
});
