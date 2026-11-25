// @ts-check
/**
 * Bus catalogue over HTTP (S18-T05): an operator uploads papers (`purpose=bus-paper`), builds a bus from a layout
 * template, attaches the papers, sends it; staff with `platform.bus.review` see it and approve; a hotel can't use the
 * bus pages; a KYC upload still needs the KYC permission; the switch-off answer is in bus-operator-switch.test.js.
 */
import { describe, expect, it } from 'vitest';

import { ApplicationRecord, gstinCheckChar } from '../../src/b2b/modules/kyc/index.js';
import { LayoutRecord, VehicleRecord } from '../../src/b2b/modules/bus-catalog/index.js';
import { asStaff, auth, useInventoryApp } from './helpers/inventory-app.js';

const clock = { now: () => new Date('2026-11-25T10:00:00Z') };
const app = useInventoryApp({ clock, models: [ApplicationRecord, LayoutRecord, VehicleRecord], env: { B2B_BUS_ENABLED: 'true' } });
const PDF = Buffer.from('%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n(RC RJ14PA1234)\n%%EOF', 'latin1');
const gstin = (/** @type {string} */ b) => b + gstinCheckChar(b);
const details = {
  legalName: 'Ganga Bus Services Private Limited',
  contactName: 'Mohan Lal',
  mobile: '9876543212',
  email: 'mohan@gangabus.in',
  gstRegistered: true,
  gstin: gstin('09AABCG1234K1Z'),
  pan: 'AABCG1234K',
  address: { line1: '1 Charbagh', city: 'Lucknow', stateCode: '09', pin: '226004' },
  termsAccepted: true,
  termsVersion: '2026-11',
  fleetSize: 5,
};

/** @param {string} token @param {string} purpose */
async function upload(token, purpose) {
  const res = await fetch(`${app.srv.base}/api/v1/files?purpose=${purpose}`, {
    method: 'POST',
    headers: { ...auth(token), 'x-file-name': 'rc.pdf', 'content-type': 'application/pdf' },
    body: PDF,
  });
  return { status: res.status, body: /** @type {any} */ (await res.json()) };
}

describe('bus catalogue over HTTP', () => {
  it('papers → template layout → bus → submit → staff approve; hotels kept out', async () => {
    const reg = await app.srv.post(
      '/api/v1/registrations/operator',
      { details, owner: { name: 'Mohan Lal', password: 'correct-horse-battery-1' } },
      { 'x-b2b-auth': '1' },
    );
    expect(reg.status).toBe(201);
    const t = reg.body.accessToken;
    const templates = (await app.srv.get('/api/v1/bus/layout-templates', auth(t))).body.data;
    expect(templates.map((/** @type {any} */ x) => x.key)).toContain('sleeper-2x1-30');
    const layout = (await app.srv.post('/api/v1/bus/layouts', { name: 'Sleeper 2+1', template: 'sleeper-2x1-30' }, auth(t))).body;
    expect(layout.seatCount).toBe(30);
    let bus = (
      await app.srv.post(
        '/api/v1/bus/vehicles',
        { regNo: 'UP32 AB 7788', acType: 'AC', kind: 'SLEEPER', layoutId: layout.id, amenities: ['AC', 'WATER'] },
        auth(t),
      )
    ).body;
    expect(bus).toMatchObject({ regNo: 'UP32AB7788', status: 'DRAFT' });
    for (const kind of ['RC', 'PERMIT', 'INSURANCE', 'FITNESS']) {
      const f = await upload(t, 'bus-paper');
      expect(f.status).toBe(201);
      bus = (
        await app.srv.put(
          `/api/v1/bus/vehicles/${bus.id}/papers`,
          { kind, fileId: f.body.id, number: `${kind}-778`, expiresOn: '2027-09-30', expectedVersion: bus.version },
          auth(t),
        )
      ).body;
    }
    expect(bus.paperProblems).toEqual([]);
    expect((await app.srv.post(`/api/v1/bus/vehicles/${bus.id}/submit`, { expectedVersion: bus.version }, auth(t))).body.status).toBe(
      'SUBMITTED',
    );

    expect((await app.admin.get('/api/v1/admin/bus/vehicles', asStaff('s1:platform.kyc.read'))).status).toBe(403);
    const queue = (await app.admin.get('/api/v1/admin/bus/vehicles', asStaff('s1:platform.bus.review'))).body.data;
    expect(queue).toEqual([
      expect.objectContaining({ regNo: 'UP32AB7788', operatorName: expect.any(String), operatorRef: expect.stringMatching(/^MBBO-/) }),
    ]);
    const approved = await app.admin.post(
      `/api/v1/admin/bus/vehicles/${bus.id}/decide`,
      { move: 'approve' },
      asStaff('s1:platform.bus.review'),
    );
    expect(approved.body).toMatchObject({ status: 'APPROVED', sellable: true });

    const hotel = await app.hotelWithProperty('owner@notabus.in');
    expect((await app.srv.get('/api/v1/bus/vehicles', auth(hotel.token))).status).toBe(403);
    expect((await upload(hotel.token, 'bus-paper')).status).toBe(403); // a hotel can't upload bus papers
  });
});
