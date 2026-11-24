// @ts-check
/**
 * Data protection (S16-T06): consents recorded (purpose, notice version, subject, address); a data request gets a
 * reference and a 30-day due date; the same email and type again → the same open request; 5 requests an hour per
 * address; staff with `platform.privacy.manage` list (most urgent first) and resolve with a note; others 403.
 */
import { describe, expect, it } from 'vitest';

import { ConsentRecord, DataRequestRecord } from '../../src/b2b/modules/identity/index.js';
import { asStaff, useInventoryApp } from './helpers/inventory-app.js';

const clock = { now: () => new Date('2026-11-24T06:30:00Z') };
const app = useInventoryApp({ clock, models: [ConsentRecord, DataRequestRecord] });
const P = asStaff('dpo:platform.privacy.manage');

describe('DPDP', () => {
  it('consent recorded; request → ref, due in 30 days, repeat-safe, rate-limited; staff resolve', async () => {
    expect(
      (await app.srv.post('/api/v1/privacy/consents', { purpose: 'hotel-checkout', noticeVersion: '2026-11', subjectRef: 'MBO-ABCD1234' }))
        .status,
    ).toBe(201);
    expect((await app.srv.post('/api/v1/privacy/consents', { purpose: 'marketing', noticeVersion: '2026-11' })).status).toBe(400);
    const c = /** @type {any} */ (await ConsentRecord.findOne({}).lean());
    expect(c).toMatchObject({ purpose: 'hotel-checkout', noticeVersion: '2026-11', subjectRef: 'MBO-ABCD1234' });
    expect(c.ip).toBeTruthy();

    const body = { type: 'ERASURE', name: 'Asha Verma', email: 'Asha@Example.com', details: 'Please delete my booking details' };
    const r = await app.srv.post('/api/v1/privacy/requests', body);
    expect(r.status).toBe(201);
    expect(r.body.ref).toMatch(/^DPR-[A-Z0-9]{8}$/);
    expect(new Date(r.body.dueAt).toISOString()).toBe('2026-12-24T06:30:00.000Z');
    expect((await app.srv.post('/api/v1/privacy/requests', { ...body, email: 'asha@example.com' })).body.ref).toBe(r.body.ref);
    expect((await app.srv.post('/api/v1/privacy/requests', { ...body, type: 'ACCESS' })).body.ref).not.toBe(r.body.ref);
    for (let i = 0; i < 2; i += 1) await app.srv.post('/api/v1/privacy/requests', { ...body, email: `x${i}@example.com` });
    expect((await app.srv.post('/api/v1/privacy/requests', { ...body, email: 'six@example.com' })).status).toBe(429);

    expect((await app.admin.get('/api/v1/admin/privacy/requests', asStaff('s:platform.user.read'))).status).toBe(403);
    const list = (await app.admin.get('/api/v1/admin/privacy/requests?status=OPEN', P)).body.data;
    expect(list.length).toBe(4);
    const done = await app.admin.post(
      `/api/v1/admin/privacy/requests/${list[0].id}/resolve`,
      { done: true, note: 'Deleted guest details from order MBO-ABCD1234' },
      P,
    );
    expect(done.body).toMatchObject({ status: 'DONE', resolvedBy: 'staff:dpo' });
    expect((await app.admin.post(`/api/v1/admin/privacy/requests/${list[0].id}/resolve`, { done: true, note: 'again' }, P)).status).toBe(
      404,
    );
  });
});
