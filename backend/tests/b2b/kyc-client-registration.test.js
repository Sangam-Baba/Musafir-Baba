// @ts-check
/** B2B client registration (S10-T03): account + CLIENT org (onboarding) + draft application with the client document set. */
import { describe, expect, it } from 'vitest';

import { EMAIL_JOB } from '../../src/b2b/core/email.js';
import { JobRecord } from '../../src/b2b/core/jobs/queue.js';
import { ApplicationRecord, gstinCheckChar } from '../../src/b2b/modules/kyc/index.js';
import { OrganizationRecord } from '../../src/b2b/modules/organizations/index.js';
import { auth, SYSTEM, useInventoryApp } from './helpers/inventory-app.js';

const clock = { now: () => new Date('2026-11-19T10:00:00Z') };
const app = useInventoryApp({ clock, models: [ApplicationRecord, JobRecord] });
const H = { 'x-b2b-auth': '1' };
const gstin = (/** @type {string} */ base) => base + gstinCheckChar(base);
const details = {
  legalName: 'Wanderlust Trips Private Limited',
  contactName: 'Asha Mehta',
  mobile: '9876543210',
  email: 'asha@wanderlust.in',
  gstRegistered: true,
  gstin: gstin('07AABCW1234K1Z'),
  pan: 'AABCW1234K',
  address: { line1: '12 Connaught Place', city: 'New Delhi', stateCode: '07', pin: '110001' },
  entityType: 'PRIVATE_LIMITED',
  termsAccepted: true,
  termsVersion: '2026-11',
};
const register = (/** @type {Record<string, unknown>} */ body) => app.srv.post('/api/v1/registrations/client', body, H);

describe('client registration', () => {
  it('creates the owner, a CLIENT organisation (onboarding) and a draft application with the client documents', async () => {
    const r = await register({ details, owner: { name: 'Asha Mehta', password: 'correct-horse-battery-1' } });
    expect(r.status).toBe(201);
    const token = r.body.accessToken;
    const kyc = (await app.srv.get('/api/v1/kyc', auth(token))).body;
    expect(kyc).toMatchObject({
      orgType: 'CLIENT',
      status: 'DRAFT',
      editable: true,
      details: { legalName: details.legalName, panLast4: '234K' },
    });
    expect(kyc.details.propertyCount).toBeUndefined();
    expect(kyc.missingDocuments).toEqual(['gst_certificate', 'pan_card', 'registration_proof', 'address_proof', 'cancelled_cheque']);
    const org = await OrganizationRecord.findById(kyc.orgId).setOptions(SYSTEM).lean();
    expect(org).toMatchObject({ type: 'CLIENT', status: 'ONBOARDING' });
    const email = await JobRecord.findOne({ name: EMAIL_JOB }).lean();
    expect(email).toBeTruthy(); // verification link (sealed in the job)
  });

  it('the hotel-only property count is refused; the same checks as hotels apply', async () => {
    expect(
      (await register({ details: { ...details, propertyCount: 2 }, owner: { name: 'A', password: 'correct-horse-battery-1' } })).status,
    ).toBe(400);
    const bad = await register({ details: { ...details, pan: 'AABCX1234K' }, owner: { name: 'A', password: 'correct-horse-battery-1' } });
    expect(bad.status).toBe(422);
    expect(bad.body.errors.map((/** @type {any} */ e) => e.code)).toEqual(['PAN_NOT_IN_GSTIN']);
    expect((await app.srv.post('/api/v1/registrations/client', { details }, {})).status).toBe(401); // the browser header is required
  });

  it('a client edits its details with the client form; a hotel keeps the hotel form', async () => {
    const c = (await register({ details, owner: { name: 'Asha', password: 'correct-horse-battery-1' } })).body.accessToken;
    const saved = await app.srv.put('/api/v1/kyc', { details: { ...details, contactName: 'Ravi Kumar' } }, auth(c));
    expect(saved.status).toBe(200);
    expect(saved.body.details.contactName).toBe('Ravi Kumar');
    expect((await app.srv.put('/api/v1/kyc', { details: { ...details, propertyCount: 3 } }, auth(c))).status).toBe(400);
    const hotel = await app.hotelWithProperty('owner@seaview.in');
    expect((await app.srv.put('/api/v1/kyc', { details }, auth(hotel.token))).status).toBe(400); // hotels still need the property count
  });

  it('a client without GST registers with the declaration instead of the certificate, flagged for the reviewer', async () => {
    const r = await register({
      details: { ...details, gstRegistered: false, gstin: undefined },
      owner: { name: 'A', password: 'correct-horse-battery-1' },
    });
    const kyc = (await app.srv.get('/api/v1/kyc', auth(r.body.accessToken))).body;
    expect(kyc.missingDocuments[0]).toBe('gst_declaration');
    expect(kyc.risk).toEqual({ flags: ['GST_UNREGISTERED'], highRisk: true });
  });
});
