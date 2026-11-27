// @ts-check
/**
 * Bus operator registration and KYC (S18-T03): with `B2B_BUS_ENABLED=true` an operator registers (owner + BUS_OPERATOR
 * company, onboarding + draft application with the operator documents), gives a fleet size (required, 1–1000, the
 * hotel-only property count refused), edits its details with the operator form, and shows in the admin
 * verification queue as an operator. Hotels and clients keep their own forms.
 */
import { describe, expect, it } from 'vitest';

import { ApplicationRecord, gstinCheckChar } from '../../src/b2b/modules/kyc/index.js';
import { OrganizationRecord } from '../../src/b2b/modules/organizations/index.js';
import { asStaff, auth, SYSTEM, useInventoryApp } from './helpers/inventory-app.js';

const clock = { now: () => new Date('2026-11-25T10:00:00Z') };
const app = useInventoryApp({ clock, models: [ApplicationRecord], env: { B2B_BUS_ENABLED: 'true' } });
const H = { 'x-b2b-auth': '1' };
const gstin = (/** @type {string} */ base) => base + gstinCheckChar(base);
const details = {
  legalName: 'Shree Travels Private Limited',
  contactName: 'Ravi Sharma',
  mobile: '9876543211',
  email: 'ravi@shreetravels.in',
  gstRegistered: true,
  gstin: gstin('08AABCS1234K1Z'),
  pan: 'AABCS1234K',
  address: { line1: '5 Sindhi Camp', city: 'Jaipur', stateCode: '08', pin: '302001' },
  entityType: 'PRIVATE_LIMITED',
  termsAccepted: true,
  termsVersion: '2026-11',
  fleetSize: 12,
};
const owner = { name: 'Ravi Sharma', password: 'correct-horse-battery-1' };
const register = (/** @type {Record<string, unknown>} */ body) => app.srv.post('/api/v1/registrations/operator', body, H);

describe('bus operator registration', () => {
  it('owner + BUS_OPERATOR company + draft application with the operator documents; edit with the operator form; in the admin queue', async () => {
    const r = await register({ details, owner });
    expect(r.status).toBe(201);
    const token = r.body.accessToken;
    const kyc = (await app.srv.get('/api/v1/kyc', auth(token))).body;
    expect(kyc).toMatchObject({ orgType: 'BUS_OPERATOR', status: 'DRAFT', details: { legalName: details.legalName, fleetSize: 12 } });
    expect(kyc.missingDocuments).toEqual(['gst_certificate', 'pan_card', 'registration_proof', 'cancelled_cheque', 'signed_contract']);
    const org = /** @type {any} */ (await OrganizationRecord.findById(kyc.orgId).setOptions(SYSTEM).lean());
    expect(org).toMatchObject({ type: 'BUS_OPERATOR', status: 'ONBOARDING' });
    expect(org.reference).toMatch(/^MBBO-/);

    const edited = await app.srv.put('/api/v1/kyc', { details: { ...details, fleetSize: 20 } }, auth(token));
    expect([edited.status, edited.body.details?.fleetSize]).toEqual([200, 20]);
    expect((await app.srv.put('/api/v1/kyc', { details: { ...details, fleetSize: 0 } }, auth(token))).status).toBe(400);
    expect((await app.srv.put('/api/v1/kyc', { details: { ...details, propertyCount: 3 } }, auth(token))).status).toBe(400);

    await ApplicationRecord.updateOne({ orgId: kyc.orgId }, { $set: { status: 'SUBMITTED', submittedAt: clock.now() } }).setOptions(SYSTEM);
    const queue = (await app.admin.get('/api/v1/admin/kyc-applications?orgType=BUS_OPERATOR', asStaff('s1:platform.kyc.read'))).body.data;
    expect(queue).toEqual([expect.objectContaining({ orgType: 'BUS_OPERATOR', legalName: details.legalName })]);
  });

  it('fleet size required; same checks as hotels; browser header required', async () => {
    const noFleet = /** @type {Record<string, unknown>} */ ({ ...details });
    delete noFleet.fleetSize;
    expect((await register({ details: noFleet, owner })).status).toBe(400);
    expect((await register({ details: { ...details, fleetSize: 1001 }, owner })).status).toBe(400);
    const bad = await register({ details: { ...details, pan: 'AABCX1234K' }, owner });
    expect([bad.status, bad.body.errors?.map((/** @type {any} */ e) => e.code)]).toEqual([422, ['PAN_NOT_IN_GSTIN']]);
    expect((await app.srv.post('/api/v1/registrations/operator', { details }, {})).status).toBe(401);
  });
});
