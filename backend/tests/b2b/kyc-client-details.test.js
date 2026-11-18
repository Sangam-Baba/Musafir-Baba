// @ts-check
/** B2B client KYC configuration (S10-T02): client details (same checks as hotels, no property count) and the CLIENT document set. */
import { describe, expect, it } from 'vitest';

import { assessRisk, gstinCheckChar, missingDocuments, requiredDocuments, validateClientDetails } from '../../src/b2b/modules/kyc/index.js';

const gstin = (/** @type {string} */ base) => base + gstinCheckChar(base);
const valid = {
  legalName: 'Wanderlust Trips Private Limited',
  contactName: 'Asha Mehta',
  mobile: '9876543210',
  email: 'Asha@Wanderlust.in',
  gstRegistered: true,
  gstin: gstin('07AABCW1234K1Z'),
  pan: 'AABCW1234K',
  address: { line1: '12 Connaught Place', city: 'New Delhi', stateCode: '07', pin: '110001' },
  entityType: 'PRIVATE_LIMITED',
  termsAccepted: true,
  termsVersion: '2026-11',
};

describe('client business details', () => {
  it('normalised like a hotel, without the hotel-only property count', () => {
    const d = validateClientDetails(valid);
    expect(d).toMatchObject({
      legalName: 'Wanderlust Trips Private Limited',
      email: 'asha@wanderlust.in',
      mobile: '+919876543210',
      gstin: valid.gstin,
      pan: 'AABCW1234K',
      entityType: 'PRIVATE_LIMITED',
    });
    expect('propertyCount' in d).toBe(false);
    expect(assessRisk(/** @type {any} */ (d), { duplicateGstin: false })).toEqual({ flags: [], highRisk: false });
  });

  it('the same checks: GSTIN state and PAN, PIN, terms — all problems at once', () => {
    const bad = {
      ...valid,
      gstin: gstin('27AABCW1234K1Z'),
      pan: 'AABCX1234K',
      address: { ...valid.address, pin: '01234' },
      termsAccepted: false,
    };
    let codes = [];
    try {
      validateClientDetails(bad);
    } catch (e) {
      codes = /** @type {any} */ (e).details.errors.map((/** @type {any} */ x) => x.code);
    }
    expect(codes).toEqual(['GSTIN_STATE_MISMATCH', 'PAN_NOT_IN_GSTIN', 'PIN_INVALID', 'TERMS_NOT_ACCEPTED']);
  });

  it('a client without GST is allowed but flagged high-risk for the reviewer (same rule as hotels)', () => {
    const d = validateClientDetails({ ...valid, gstRegistered: false, gstin: undefined });
    expect(d.gstin).toBeNull();
    expect(assessRisk(/** @type {any} */ (d), { duplicateGstin: false })).toMatchObject({ flags: ['GST_UNREGISTERED'], highRisk: true });
  });
});

describe('CLIENT document set (configuration only)', () => {
  it('GST certificate or declaration, PAN, registration, address proof, cancelled cheque', () => {
    expect(requiredDocuments('CLIENT', { gstRegistered: true }).map((d) => d.key)).toEqual([
      'gst_certificate',
      'pan_card',
      'registration_proof',
      'address_proof',
      'cancelled_cheque',
    ]);
    expect(requiredDocuments('CLIENT', { gstRegistered: false }).map((d) => d.key)).toEqual([
      'gst_declaration',
      'pan_card',
      'registration_proof',
      'address_proof',
      'cancelled_cheque',
    ]);
    expect(missingDocuments(requiredDocuments('CLIENT', { gstRegistered: true }), [{ key: 'pan_card' }])).toEqual([
      'gst_certificate',
      'registration_proof',
      'address_proof',
      'cancelled_cheque',
    ]);
  });

  it('the hotel set is unchanged', () => {
    expect(requiredDocuments('HOTEL', { gstRegistered: true }).map((d) => d.key)).toEqual([
      'gst_certificate',
      'pan_card',
      'registration_proof',
      'cancelled_cheque',
      'signed_contract',
    ]);
  });
});
