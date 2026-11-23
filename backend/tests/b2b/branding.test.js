// @ts-check
/**
 * Client white-label (S15-T08): a client saves its voucher brand (name, contact, colour, logo link); only `#rrggbb`
 * colours and `https://` image links are accepted (no `javascript:` / `data:` / `http:`, no quotes); two people editing
 * → 409; the client voucher shows the brand and still no amount, margin or MusafirBaba brand; nothing saved → the
 * company's display name.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { clientVoucherHtml } from '../../src/b2b/modules/documents/index.js';
import { brandingOf, brandOf, BrandingRecord, checkBrand, saveBranding } from '../../src/b2b/modules/organizations/index.js';
import { startMongo } from './helpers/mongo.js';

const clock = { now: () => new Date('2026-11-23T06:30:00Z') };
const ORG = '65f000000000000000000a91';
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
});
afterAll(async () => mongo.stop());
beforeEach(async () => {
  await BrandingRecord.deleteMany({}).setOptions({ tenantScope: 'SYSTEM', tenantReason: 'test' });
});

const good = {
  name: 'Trips Co',
  contactPhone: '+91 98100 00000',
  contactEmail: 'help@trips.co',
  colour: '#0A6E5C',
  logoUrl: 'https://cdn.trips.co/logo.png',
};

const facts = /** @type {any} */ ({
  order: {
    ref: 'MBO-9',
    totalPaise: 178_500,
    confirmedAt: new Date('2026-11-20T10:00:00Z'),
    contact: { name: 'Ravi', email: 'r@t.in', phone: '1' },
    payment: {},
  },
  items: [
    {
      bookingRef: 'MBH-9',
      property: { name: 'Sea View', address: { line1: 'Marine Drive', line2: null, pin: '400002' }, city: 'Mumbai' },
      roomTypeName: 'Deluxe',
      ratePlanName: 'Flexible',
      mealPlanKey: 'cp',
      cancellation: 'Free cancellation until 2 days before check-in',
      stay: { checkIn: '2026-12-01', checkOut: '2026-12-03', nights: 2, occupancies: [{ adults: 2, children: 0 }] },
      rooms: [{ leadGuest: 'Asha Verma', guests: [] }],
      specialRequests: null,
      breakdown: {
        lines: [{ sellPaise: 75_000, gst: { cgstPaise: 4_500 } }],
        fee: null,
        totals: { sellPaise: 150_000, gstPaise: 28_500, totalPaise: 178_500 },
      },
    },
  ],
});

describe('checks', () => {
  it('only safe colours and https image links; email and phone shapes', () => {
    expect(() => checkBrand(good)).not.toThrow();
    for (const [field, value, code] of /** @type {const} */ ([
      ['colour', 'red', 'BRAND_COLOUR_INVALID'],
      ['colour', '#fff;background:url(x)', 'BRAND_COLOUR_INVALID'],
      ['logoUrl', 'javascript:alert(1)', 'BRAND_LOGO_INVALID'],
      ['logoUrl', 'data:image/svg+xml;base64,AAAA', 'BRAND_LOGO_INVALID'],
      ['logoUrl', 'http://cdn.trips.co/logo.png', 'BRAND_LOGO_INVALID'],
      ['logoUrl', 'https://cdn.trips.co/logo.png" onerror="x', 'BRAND_LOGO_INVALID'],
      ['logoUrl', 'https://cdn.trips.co/page.html', 'BRAND_LOGO_INVALID'],
      ['contactEmail', 'not-an-email', 'BRAND_EMAIL_INVALID'],
      ['contactPhone', '<script>', 'BRAND_PHONE_INVALID'],
      ['name', ' ', 'BRAND_NAME_INVALID'],
    ]))
      expect(() => checkBrand({ ...good, [field]: value }), `${field}=${value}`).toThrow(expect.objectContaining({ code }));
  });
});

describe('saving', () => {
  it('first save, edit with the version read, stale edit → 409; nothing saved → display name', async () => {
    expect(await brandOf(ORG, 'Trips Company Pvt')).toEqual({
      name: 'Trips Company Pvt',
      contactPhone: null,
      contactEmail: null,
      colour: null,
      logoUrl: null,
    });
    expect(await brandOf(ORG, null)).toBeNull();
    const first = await saveBranding(ORG, 'user:u1', { ...good, expectedVersion: 0 });
    expect(first).toMatchObject({ name: 'Trips Co', version: 1 });
    await expect(saveBranding(ORG, 'user:u2', { ...good, expectedVersion: 0 })).rejects.toMatchObject({ code: 'BRANDING_CHANGED' });
    const second = await saveBranding(ORG, 'user:u1', { ...good, colour: null, expectedVersion: 1 });
    expect(second).toMatchObject({ colour: null, version: 2 });
    await expect(saveBranding(ORG, 'user:u2', { ...good, expectedVersion: 1 })).rejects.toMatchObject({ code: 'BRANDING_CHANGED' });
    await expect(saveBranding(ORG, 'user:u2', { ...good, logoUrl: 'javascript:x', expectedVersion: 2 })).rejects.toMatchObject({
      code: 'BRAND_LOGO_INVALID',
    });
    expect(await brandingOf(ORG)).toMatchObject({ version: 2 });
    expect(await brandOf(ORG, 'Trips Company Pvt')).toMatchObject({ name: 'Trips Co', logoUrl: 'https://cdn.trips.co/logo.png' });
  });
});

describe('the client voucher', () => {
  it('logo, colour and contact; still no amount, margin or MusafirBaba brand; unsafe values never printed', () => {
    const html = clientVoucherHtml(facts, good).replace(/<style[\s\S]*?<\/style>/g, '');
    expect(html).toContain('<img src="https://cdn.trips.co/logo.png"');
    expect(html).toContain('class="brand" style="color:#0A6E5C">Trips Co');
    expect(html).toContain('+91 98100 00000 · help@trips.co');
    expect(html).not.toMatch(/₹|Rs\.?\s|1,785|1785|750\.00|INR/);
    expect(html).not.toMatch(/margin|net rate|GST/i);
    expect(html).not.toMatch(/class="brand"[^>]*>MusafirBaba/);
    const bad = clientVoucherHtml(facts, { name: 'X', colour: 'red;x', logoUrl: 'javascript:alert(1)', contactEmail: '<b>' });
    expect(bad).not.toContain('javascript:');
    expect(bad).not.toContain('style="color:red');
    expect(bad).toContain('&lt;b&gt;');
  });
});
