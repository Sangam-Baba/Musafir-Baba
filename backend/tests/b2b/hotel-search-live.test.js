// @ts-check
/** Live availability rooms (S06-T08): anyone for LIVE properties; owners for their unpublished ones; staff any; never unknown. */
import { describe, expect, it } from 'vitest';

import { PropertyRecord } from '../../src/b2b/modules/hotel-catalog/index.js';
import { asStaff, auth, SYSTEM, useInventoryApp } from './helpers/inventory-app.js';
import { openStream } from './helpers/sse.js';

const clock = { now: () => new Date('2026-11-18T10:00:00Z') };
const app = useInventoryApp({ clock });
const room = (/** @type {string} */ id) => `availability:property:${id}`;

/** @param {string} base @param {string[]} ids @param {Record<string, string>} [headers] */
async function follow(base, ids, headers = {}) {
  const s = await openStream(`${base}/api/v1/realtime/stream?rooms=${ids.map(room).join(',')}`, headers);
  s.close();
  return s.status;
}

describe('who may follow a property', () => {
  it('anyone may follow a LIVE property; nobody may follow an unknown one', async () => {
    const h = await app.hotelWithProperty();
    await PropertyRecord.updateOne({ _id: h.propertyId }, { $set: { status: 'LIVE' } }).setOptions(SYSTEM);
    expect(await follow(app.srv.base, [h.propertyId])).toBe(200);
    expect(await follow(app.srv.base, ['64b0000000000000000000ff'])).toBe(404);
    expect(await follow(app.srv.base, [h.propertyId, '64b0000000000000000000ff'])).toBe(404);
  });

  it("an unpublished property: its own hotel's people and MusafirBaba staff only", async () => {
    const h = await app.hotelWithProperty('owner@seaview.in');
    const other = await app.hotelWithProperty('owner@other.in');
    expect(await follow(app.srv.base, [h.propertyId])).toBe(404);
    expect(await follow(app.srv.base, [h.propertyId], auth(h.token))).toBe(200); // the calendar page
    expect(await follow(app.srv.base, [h.propertyId], auth(other.token))).toBe(404);
    expect(await follow(app.admin.base, [h.propertyId], asStaff('s1:hotel-inventory.admin.read'))).toBe(200);
  });

  it('only property rooms can be named', async () => {
    const s = await openStream(`${app.srv.base}/api/v1/realtime/stream?rooms=user:64b0000000000000000000aa`);
    s.close();
    expect(s.status).toBe(400);
  });
});
