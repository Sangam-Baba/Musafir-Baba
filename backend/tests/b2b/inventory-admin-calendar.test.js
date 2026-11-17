// @ts-check
/**
 * Admin calendars (S04-T12): MusafirBaba reads any property's calendar; overriding needs its own permission and a
 * reason, follows the same guards as the hotel's edits, is logged as OVERRIDE by the staff member (the hotel sees who
 * and why), can be undone by the hotel, and is never allowed on a company the staff member belongs to.
 */
import { ObjectId } from 'mongodb';
import { describe, expect, it } from 'vitest';

import {
  CancellationPolicyRecord,
  ChangeLogRecord,
  InventoryDayRecord,
  RateDayRecord,
  RatePlanRecord,
} from '../../src/b2b/modules/hotel-inventory/index.js';
import { asStaff, auth, SYSTEM, useInventoryApp } from './helpers/inventory-app.js';

const clock = { now: () => new Date('2026-11-17T10:00:00Z') };
const app = useInventoryApp({
  clock,
  models: [CancellationPolicyRecord, RatePlanRecord, InventoryDayRecord, RateDayRecord, ChangeLogRecord],
});
const READ = 's1:hotel-inventory.admin.read';
const SUPER = 's2:hotel-inventory.admin.read,hotel-inventory.admin.override';

async function setup() {
  const h = await app.hotelWithProperty();
  const room = await app.roomType(h.token, h.propertyId);
  return {
    ...h,
    room,
    cal: `/api/v1/admin/properties/${h.propertyId}/calendar`,
    override: `/api/v1/admin/properties/${h.propertyId}/calendar/override`,
  };
}
const change = (/** @type {string} */ room, /** @type {number} */ total) => ({
  requestId: `ovr-${total}-0001`,
  from: '2026-12-01',
  to: '2026-12-03',
  rooms: [{ roomTypeId: room, total }],
});

describe('admin calendars', () => {
  it('reading any property needs the admin read permission; hotel members cannot use the admin address', async () => {
    const s = await setup();
    const res = await app.admin.get(`${s.cal}?from=2026-12-01&to=2026-12-03`, asStaff(READ));
    expect([res.status, res.body.roomTypes[0].nights.length, res.body.property.id]).toEqual([200, 2, s.propertyId]);
    expect((await app.admin.get(`${s.cal}?from=2026-12-01&to=2026-12-03`, asStaff('s3:platform.kyc.read'))).status).toBe(403);
    expect((await app.srv.get(`${s.cal}?from=2026-12-01&to=2026-12-03`, auth(s.token))).status).toBe(403);
  });

  it('override: own permission + a reason; same guards; logged as OVERRIDE by the staff member; the hotel sees it and can undo it', async () => {
    const s = await setup();
    expect((await app.admin.post(s.override, { ...change(s.room, 5), reason: 'Hotel asked by phone' }, asStaff(READ))).status).toBe(403);
    expect((await app.admin.post(s.override, { ...change(s.room, 5), reason: 'x' }, asStaff(SUPER))).status).toBe(400);
    const done = await app.admin.post(s.override, { ...change(s.room, 5), reason: 'Hotel asked by phone' }, asStaff(SUPER));
    expect(done.body).toMatchObject({ preview: false, nights: 2, changeId: expect.any(String) });
    const history = (await app.srv.get(`/api/v1/hotel/properties/${s.propertyId}/calendar/changes`, auth(s.token))).body.data;
    expect(history[0]).toMatchObject({ kind: 'OVERRIDE', by: 'staff:s2', reason: 'Hotel asked by phone' });
    expect((await app.admin.get(`${s.cal}/changes`, asStaff(READ))).body.data[0]).toMatchObject({
      kind: 'OVERRIDE',
      reason: 'Hotel asked by phone',
    });
    // the same room guard: a booked night keeps its rooms
    await InventoryDayRecord.updateOne(
      { roomTypeId: s.room, date: '2026-12-02' },
      { $set: { booked: 4, bookings: [{ bookingId: 'b', qty: 4 }] } },
    ).setOptions(SYSTEM);
    const lower = await app.admin.post(s.override, { ...change(s.room, 1), reason: 'Rooms under repair' }, asStaff(SUPER));
    expect(lower.body.refused).toEqual([{ roomTypeId: s.room, date: '2026-12-02', booked: 4, held: 0 }]);
    const undo = await app.srv.post(
      `/api/v1/hotel/properties/${s.propertyId}/calendar/undo`,
      { changeId: lower.body.changeId },
      auth(s.token),
    );
    expect(undo.status).toBe(200);
  });

  it('never on a company the staff member belongs to', async () => {
    const s = await setup();
    const staffId = new ObjectId();
    await app.mongo.db
      .collection('staffs')
      .insertOne({ _id: staffId, name: 'Owner too', email: 'owner@seaview.in', role: 'admin', isActive: true });
    const res = await app.admin.post(
      s.override,
      { ...change(s.room, 5), reason: 'Testing my own hotel' },
      asStaff(`${staffId.toHexString()}:hotel-inventory.admin.override`),
    );
    expect([res.status, res.body.code]).toEqual([403, 'OWN_ORGANISATION']);
    await app.mongo.db.collection('staffs').deleteMany({});
  });
});
