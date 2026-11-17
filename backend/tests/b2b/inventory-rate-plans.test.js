// @ts-check
/** Rate plans (S04-T03): room types / meal plan / policy checks, derived plans, version check, archive rules, limits. */
import { describe, expect, it } from 'vitest';

import { CancellationPolicyRecord, RatePlanRecord } from '../../src/b2b/modules/hotel-inventory/index.js';
import { auth, useInventoryApp } from './helpers/inventory-app.js';

const clock = { now: () => new Date('2026-11-17T10:00:00Z') };
const app = useInventoryApp({ clock, models: [CancellationPolicyRecord, RatePlanRecord] });

/** @param {string} propertyId */
const plans = (propertyId) => `/api/v1/hotel/properties/${propertyId}/rate-plans`;

/** A property with two room types and a policy. */
async function setup() {
  const h = await app.hotelWithProperty();
  const deluxe = await app.roomType(h.token, h.propertyId);
  const suite = await app.roomType(h.token, h.propertyId, { name: 'Suite' });
  const policy = (
    await app.srv.post(
      `/api/v1/hotel/properties/${h.propertyId}/cancellation-policies`,
      {
        name: 'Flexible',
        nonRefundable: false,
        rules: [{ hoursBefore: 24, penalty: { type: 'NIGHTS', value: 1 } }],
        noShow: { type: 'PERCENT', value: 100 },
      },
      auth(h.token),
    )
  ).body.id;
  const ep = {
    name: 'Room only',
    roomTypeIds: [deluxe, suite],
    mealPlanKey: 'ep',
    cancellationPolicyId: policy,
    pricingModel: 'PER_OCCUPANCY',
    minAdvanceDays: 0,
    maxAdvanceDays: 365,
    derived: null,
  };
  return { ...h, deluxe, suite, policy, ep };
}

describe('rate plans', () => {
  it('a plan and a derived plan (breakfast = room only + ₹500); listed in order; a name only once', async () => {
    const s = await setup();
    const ep = await app.srv.post(plans(s.propertyId), s.ep, auth(s.token));
    expect([ep.status, ep.headers.get('etag'), ep.body.status]).toEqual([201, '"1"', 'ACTIVE']);
    const cp = await app.srv.post(
      plans(s.propertyId),
      {
        ...s.ep,
        name: 'With breakfast',
        mealPlanKey: 'cp',
        roomTypeIds: [s.deluxe],
        derived: { parentRatePlanId: ep.body.id, adjust: { type: 'AMOUNT', value: 50000 } },
        order: 1,
      },
      auth(s.token),
    );
    expect(cp.body).toMatchObject({ derived: { parentRatePlanId: ep.body.id, adjust: { type: 'AMOUNT', value: 50000 } } });
    expect((await app.srv.get(plans(s.propertyId), auth(s.token))).body.data.map((/** @type {any} */ p) => p.name)).toEqual([
      'With breakfast',
      'Room only',
    ]);
    expect((await app.srv.post(plans(s.propertyId), { ...s.ep, name: ' ROOM  only' }, auth(s.token))).body.code).toBe(
      'RATE_PLAN_NAME_TAKEN',
    );
  });

  it("refuses another property's room type, unknown meal plans and policies, a derived plan with other room types — all at once", async () => {
    const s = await setup();
    const other = await app.anotherProperty(s.token);
    const foreignRoom = await app.roomType(s.token, other);
    const bad = await app.srv.post(
      plans(s.propertyId),
      { ...s.ep, roomTypeIds: [foreignRoom], mealPlanKey: 'brunch', cancellationPolicyId: '64b0000000000000000000aa' },
      auth(s.token),
    );
    expect([bad.status, bad.body.code, bad.body.errors.map((/** @type {any} */ e) => e.code)]).toEqual([
      422,
      'RATE_PLAN_INVALID',
      ['ROOM_TYPE_UNKNOWN', 'MEAL_PLAN_UNKNOWN', 'POLICY_UNKNOWN'],
    ]);
    const ep = (await app.srv.post(plans(s.propertyId), { ...s.ep, roomTypeIds: [s.deluxe] }, auth(s.token))).body;
    const cp = await app.srv.post(
      plans(s.propertyId),
      {
        ...s.ep,
        name: 'CP',
        roomTypeIds: [s.suite],
        pricingModel: 'PER_ROOM',
        derived: { parentRatePlanId: ep.id, adjust: { type: 'PERCENT', value: 10 } },
      },
      auth(s.token),
    );
    expect(cp.body.errors.map((/** @type {any} */ e) => e.code)).toEqual(['PARENT_PRICING_MODEL_DIFFERS', 'ROOM_TYPE_NOT_IN_PARENT']);
  });

  it('changes need the loaded version; a followed plan keeps what its followers need and cannot be archived before them', async () => {
    const s = await setup();
    const ep = (await app.srv.post(plans(s.propertyId), s.ep, auth(s.token))).body;
    const cp = (
      await app.srv.post(
        plans(s.propertyId),
        { ...s.ep, name: 'CP', roomTypeIds: [s.suite], derived: { parentRatePlanId: ep.id, adjust: { type: 'AMOUNT', value: 40000 } } },
        auth(s.token),
      )
    ).body;
    const url = `${plans(s.propertyId)}/${ep.id}`;
    expect((await app.srv.put(url, s.ep, auth(s.token))).status).toBe(428);
    const paused = await app.srv.put(url, { ...s.ep, status: 'INACTIVE' }, { ...auth(s.token), 'if-match': '"1"' });
    expect([paused.status, paused.body.status, paused.body.version]).toEqual([200, 'INACTIVE', 2]);
    expect((await app.srv.put(url, s.ep, { ...auth(s.token), 'if-match': '"1"' })).body.code).toBe('VERSION_CONFLICT');
    const drop = await app.srv.put(url, { ...s.ep, roomTypeIds: [s.deluxe] }, { ...auth(s.token), 'if-match': '"2"' });
    expect(drop.body.errors.map((/** @type {any} */ e) => e.code)).toEqual(['DERIVED_PLANS_NEED_ROOM_TYPE']);
    expect((await app.srv.del(url, auth(s.token))).body.code).toBe('RATE_PLAN_HAS_DERIVED');
    expect((await app.srv.del(`${plans(s.propertyId)}/${cp.id}`, auth(s.token))).status).toBe(204);
    expect((await app.srv.del(url, auth(s.token))).status).toBe(204);
    expect((await app.srv.get(plans(s.propertyId), auth(s.token))).body.data).toEqual([]);
    expect((await app.srv.post(plans(s.propertyId), s.ep, auth(s.token))).status).toBe(201); // the name is free again
  });

  it('a policy used by a plan cannot be archived; limits follow the property', async () => {
    const s = await setup();
    await app.srv.post(plans(s.propertyId), s.ep, auth(s.token));
    const archive = await app.srv.del(`/api/v1/hotel/properties/${s.propertyId}/cancellation-policies/${s.policy}`, auth(s.token));
    expect([archive.status, archive.body.code]).toEqual([409, 'POLICY_IN_USE']);
    const other = await app.anotherProperty(s.token);
    const m = await app.staff(s.orgId, 'manager@seaview.in', 'hotel.manager', [s.propertyId]);
    expect((await app.srv.get(plans(s.propertyId), auth(m))).body.data).toHaveLength(1);
    expect((await app.srv.get(plans(other), auth(m))).status).toBe(404);
    const desk = await app.staff(s.orgId, 'desk@seaview.in', 'hotel.frontDesk');
    expect((await app.srv.get(plans(s.propertyId), auth(desk))).status).toBe(403);
    const stranger = await app.hotelWithProperty('owner@hill.in');
    expect((await app.srv.post(plans(s.propertyId), s.ep, auth(stranger.token))).status).toBe(404);
  });
});
