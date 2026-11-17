// @ts-check
/** Cancellation policies (S04-T02): create with summary, all problems at once, version check, archive, property limits. */
import { describe, expect, it } from 'vitest';

import { PropertyRecord } from '../../src/b2b/modules/hotel-catalog/index.js';
import { CancellationPolicyRecord } from '../../src/b2b/modules/hotel-inventory/index.js';
import { auth, SYSTEM, useInventoryApp } from './helpers/inventory-app.js';

const clock = { now: () => new Date('2026-11-17T10:00:00Z') };
const app = useInventoryApp({ clock, models: [CancellationPolicyRecord] });

const flexible = {
  name: 'Flexible',
  nonRefundable: false,
  rules: [
    { hoursBefore: 24, penalty: { type: 'NIGHTS', value: 1 } },
    { hoursBefore: 72, penalty: { type: 'PERCENT', value: 25 } },
  ],
  noShow: { type: 'PERCENT', value: 100 },
};
/** @param {string} propertyId */
const base = (propertyId) => `/api/v1/hotel/properties/${propertyId}/cancellation-policies`;

describe('cancellation policies', () => {
  it('created with the summary the guest reads; listed by name; a name only once per property', async () => {
    const { token, propertyId } = await app.hotelWithProperty();
    const made = await app.srv.post(base(propertyId), flexible, auth(token));
    expect([made.status, made.headers.get('etag')]).toEqual([201, '"1"']);
    expect(made.body).toMatchObject({
      name: 'Flexible',
      rules: [{ hoursBefore: 72 }, { hoursBefore: 24 }],
      summary: expect.stringMatching(/^Free cancellation until 3 days before check-in\./),
      status: 'ACTIVE',
      version: 1,
    });
    await app.srv.post(
      base(propertyId),
      { name: 'Non-refundable', nonRefundable: true, rules: [], noShow: { type: 'PERCENT', value: 100 } },
      auth(token),
    );
    const list = (await app.srv.get(base(propertyId), auth(token))).body.data;
    expect(list.map((/** @type {any} */ p) => p.name)).toEqual(['Flexible', 'Non-refundable']);
    const twice = await app.srv.post(base(propertyId), { ...flexible, name: ' flexible ' }, auth(token));
    expect([twice.status, twice.body.code]).toEqual([409, 'POLICY_NAME_TAKEN']);
  });

  it('refuses a broken policy with every problem listed; unknown fields and kinds are refused by the format check', async () => {
    const { token, propertyId } = await app.hotelWithProperty();
    const bad = await app.srv.post(
      base(propertyId),
      { ...flexible, rules: [...flexible.rules, { hoursBefore: 12, penalty: { type: 'NIGHTS', value: 0 } }] },
      auth(token),
    );
    expect([bad.status, bad.body.code]).toEqual([422, 'POLICY_INVALID']);
    expect(bad.body.errors.map((/** @type {any} */ e) => e.code)).toEqual([
      'PENALTY_NIGHTS_OUT_OF_RANGE',
      'PENALTY_DECREASES_CLOSER_TO_CHECK_IN',
    ]);
    expect((await app.srv.post(base(propertyId), { ...flexible, noShow: { type: 'HALF', value: 1 } }, auth(token))).status).toBe(400);
    expect((await app.srv.post(base(propertyId), { ...flexible, hotelOrgId: 'x' }, auth(token))).status).toBe(400);
  });

  it('changes need the loaded version (428 / 412); archived policies leave the list and cannot change', async () => {
    const { token, propertyId } = await app.hotelWithProperty();
    const { id } = (await app.srv.post(base(propertyId), flexible, auth(token))).body;
    const change = { ...flexible, rules: [{ hoursBefore: 48, penalty: { type: 'PERCENT', value: 50 } }] };
    expect((await app.srv.put(`${base(propertyId)}/${id}`, change, auth(token))).status).toBe(428);
    const ok = await app.srv.put(`${base(propertyId)}/${id}`, change, { ...auth(token), 'if-match': '"1"' });
    expect([ok.status, ok.body.version, ok.body.summary]).toEqual([
      200,
      2,
      'Free cancellation until 2 days before check-in. Cancelled within 2 days of check-in: 50% of the booking amount. No-show: the full booking amount.',
    ]);
    expect((await app.srv.put(`${base(propertyId)}/${id}`, change, { ...auth(token), 'if-match': '"1"' })).body.code).toBe(
      'VERSION_CONFLICT',
    );
    expect((await app.srv.del(`${base(propertyId)}/${id}`, auth(token))).status).toBe(204);
    expect((await app.srv.get(base(propertyId), auth(token))).body.data).toEqual([]);
    expect((await app.srv.put(`${base(propertyId)}/${id}`, change, { ...auth(token), 'if-match': '"3"' })).body.code).toBe(
      'POLICY_ARCHIVED',
    );
    expect(await CancellationPolicyRecord.countDocuments({ _id: id }).setOptions(SYSTEM)).toBe(1); // archived, never deleted
  });

  it("follows the property's limits: unassigned property 404, Front Desk 403, other org 404; nothing on an archived property", async () => {
    const { token, orgId, propertyId } = await app.hotelWithProperty();
    const other = await app.anotherProperty(token);
    const m = await app.staff(orgId, 'manager@seaview.in', 'hotel.manager', [propertyId]);
    expect((await app.srv.post(base(propertyId), flexible, auth(m))).status).toBe(201);
    expect((await app.srv.post(base(other), flexible, auth(m))).status).toBe(404);
    expect((await app.srv.get(base(other), auth(m))).status).toBe(404);
    const desk = await app.staff(orgId, 'desk@seaview.in', 'hotel.frontDesk');
    expect((await app.srv.get(base(propertyId), auth(desk))).status).toBe(403);
    const stranger = await app.hotelWithProperty('owner@hill.in');
    expect((await app.srv.get(base(propertyId), auth(stranger.token))).status).toBe(404);
    await PropertyRecord.updateOne({ _id: other, hotelOrgId: orgId }, { $set: { status: 'ARCHIVED' } });
    expect((await app.srv.post(base(other), flexible, auth(token))).body.code).toBe('PROPERTY_ARCHIVED');
  });
});
