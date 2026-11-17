// @ts-check
import { describe, expect, it } from 'vitest';

import {
  assessRisk,
  DOCUMENT_SETS,
  gstinCheckChar,
  isValidGstin,
  isValidPan,
  isValidPin,
  missingDocuments,
  normaliseTaxId,
  panOfGstin,
  requiredDocuments,
  validateHotelDetails,
} from '../../src/b2b/modules/kyc/index.js';

// Real, published GSTINs (their check characters are correct)
const VALID = ['27AAPFU0939F1ZV', '29AAGCB7383J1Z4', '27AAACR5055K1Z7'];

const good = {
  legalName: 'Sea View Hotels Private Limited',
  contactName: 'Asha Rao',
  mobile: '98765 43210',
  email: 'Owner@SeaView.in',
  gstRegistered: true,
  gstin: ' 27aapfu0939f1zv ',
  pan: 'aapfu0939f',
  address: { line1: '12 Marine Drive', city: 'Mumbai', stateCode: '27', pin: '400020' },
  propertyCount: 2,
  termsAccepted: true,
  termsVersion: '2026-11',
};

/** @param {Record<string, unknown>} change */
const codesFor = (change) => {
  try {
    validateHotelDetails({ ...good, ...change });
    return [];
  } catch (e) {
    return /** @type {any} */ (e).details.errors.map((/** @type {any} */ x) => x.code);
  }
};

describe('GSTIN / PAN / PIN', () => {
  it.each(VALID)('%s is valid', (g) => expect(isValidGstin(g)).toBe(true));

  it('a one-character typo is caught by the check character', () => {
    for (const g of VALID) {
      const typo = `${g.slice(0, 7)}${g.charAt(7) === '0' ? '1' : '0'}${g.slice(8)}`;
      expect(isValidGstin(typo)).toBe(false);
      expect(isValidGstin(`${g.slice(0, 14)}${gstinCheckChar(g.slice(0, 14)) === 'A' ? 'B' : 'A'}`)).toBe(false);
    }
  });

  it('shape and state code', () => {
    expect(isValidGstin('99AAPFU0939F1ZV')).toBe(false); // not a business state code
    expect(isValidGstin('27AAPFU0939F1Z')).toBe(false);
    expect(isValidGstin(normaliseTaxId(' 27aapfu0939f1zv '))).toBe(true);
    expect(panOfGstin('27AAPFU0939F1ZV')).toBe('AAPFU0939F');
    expect([isValidPan('AAPFU0939F'), isValidPan('AAPF0939F'), isValidPan('aapfu0939f')]).toEqual([true, false, false]);
    expect([isValidPin('400020'), isValidPin('040002'), isValidPin('40002')]).toEqual([true, false, false]);
  });
});

describe('hotel details', () => {
  it('normalises good details', () => {
    expect(validateHotelDetails(good)).toMatchObject({
      gstin: '27AAPFU0939F1ZV',
      pan: 'AAPFU0939F',
      mobile: '+919876543210',
      email: 'owner@seaview.in',
    });
  });

  it('cross-checks what a reviewer would otherwise check by hand — all problems at once', () => {
    expect(codesFor({ gstin: '27AAPFU0939F1ZX' })).toEqual(['GSTIN_INVALID']);
    expect(codesFor({ address: { ...good.address, stateCode: '29' } })).toEqual(['GSTIN_STATE_MISMATCH']);
    expect(codesFor({ pan: 'AAPFU0940F' })).toEqual(['PAN_NOT_IN_GSTIN']);
    expect(codesFor({ pan: 'bad', address: { ...good.address, pin: '0123' }, termsAccepted: false, mobile: '123' }).sort()).toEqual(
      ['MOBILE_INVALID', 'PAN_INVALID', 'PIN_INVALID', 'TERMS_NOT_ACCEPTED'].sort(),
    );
  });

  it('a hotel without GST registers with PAN only (D31)', () => {
    const d = validateHotelDetails({ ...good, gstRegistered: false, gstin: undefined, pan: 'ABCPK1234L' });
    expect(d).toMatchObject({ gstRegistered: false, gstin: null, pan: 'ABCPK1234L' });
  });
});

describe('document sets (configuration per org type)', () => {
  it('GST-registered and unregistered hotels need different documents', () => {
    const registered = requiredDocuments('HOTEL', { gstRegistered: true }).map((d) => d.key);
    const unregistered = requiredDocuments('HOTEL', { gstRegistered: false }).map((d) => d.key);
    expect(registered).toEqual(['gst_certificate', 'pan_card', 'registration_proof', 'cancelled_cheque', 'signed_contract']);
    expect(unregistered).toEqual(['gst_declaration', 'pan_card', 'registration_proof', 'cancelled_cheque', 'signed_contract']);
    expect(
      missingDocuments(requiredDocuments('HOTEL', { gstRegistered: true }), [{ key: 'pan_card' }, { key: 'gst_certificate' }]),
    ).toEqual(['registration_proof', 'cancelled_cheque', 'signed_contract']);
  });

  it('a second org type works through configuration only (Definition of Done)', () => {
    const sets = {
      ...DOCUMENT_SETS,
      TRAVEL_AGENT_DEMO: [
        { key: 'iata_certificate', label: 'IATA certificate', required: true },
        { key: 'logo', label: 'Logo', required: false },
      ],
    };
    expect(requiredDocuments('TRAVEL_AGENT_DEMO', { gstRegistered: true }, sets).map((d) => d.key)).toEqual(['iata_certificate', 'logo']);
    expect(missingDocuments(requiredDocuments('TRAVEL_AGENT_DEMO', { gstRegistered: true }, sets), [])).toEqual(['iata_certificate']);
    expect(() => requiredDocuments('UNKNOWN', { gstRegistered: true })).toThrow(/no KYC document set/);
  });
});

describe('risk (second approver)', () => {
  it('flags unregistered GST, a GSTIN used by another org, and a personal PAN for a company', () => {
    const d = validateHotelDetails(good);
    expect(assessRisk(d, { duplicateGstin: false })).toEqual({ flags: [], highRisk: false });
    expect(assessRisk(d, { duplicateGstin: true }).flags).toEqual(['DUPLICATE_GSTIN']);
    expect(assessRisk(validateHotelDetails({ ...good, gstRegistered: false, gstin: undefined }), { duplicateGstin: false }).flags).toEqual([
      'GST_UNREGISTERED',
    ]);
    const personal = { ...d, pan: 'ABCPK1234L', gstin: '27ABCPK1234L1Z0' };
    expect(assessRisk(personal, { duplicateGstin: false }).flags).toEqual(['PERSONAL_PAN_FOR_BUSINESS']);
  });
});

describe('optional business details (UI-3)', () => {
  it('trade name, entity type, year, designation and alternate mobile are kept tidy; leaving them out is fine', () => {
    expect(validateHotelDetails(good)).toMatchObject({
      tradeName: null,
      entityType: null,
      yearEstablished: null,
      contactDesignation: null,
      alternateMobile: null,
    });
    const d = validateHotelDetails({
      ...good,
      tradeName: '  Sea  View Hotels ',
      entityType: 'PARTNERSHIP',
      yearEstablished: 2018,
      contactDesignation: ' Director ',
      alternateMobile: '91234 56789',
    });
    expect(d).toMatchObject({
      tradeName: 'Sea View Hotels',
      entityType: 'PARTNERSHIP',
      yearEstablished: 2018,
      contactDesignation: 'Director',
      alternateMobile: '+919123456789',
    });
    expect(codesFor({ entityType: 'CASTLE', yearEstablished: 1700, alternateMobile: '12' }).sort()).toEqual([
      'ALTERNATE_MOBILE_INVALID',
      'ENTITY_TYPE_INVALID',
      'YEAR_INVALID',
    ]);
  });

  it('a PAN that does not fit the entity type is flagged for a second approver', () => {
    // AAPFU0939F: the 4th character F = firm / LLP
    expect(assessRisk(validateHotelDetails({ ...good, entityType: 'PARTNERSHIP' }), { duplicateGstin: false }).flags).toEqual([]);
    expect(assessRisk(validateHotelDetails({ ...good, entityType: 'PRIVATE_LIMITED' }), { duplicateGstin: false })).toEqual({
      flags: ['PAN_DOES_NOT_MATCH_ENTITY_TYPE'],
      highRisk: true,
    });
    expect(assessRisk(validateHotelDetails({ ...good, entityType: 'OTHER' }), { duplicateGstin: false }).flags).toEqual([]);
  });
});
