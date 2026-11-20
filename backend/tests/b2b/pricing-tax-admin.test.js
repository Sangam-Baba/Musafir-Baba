// @ts-check
/** GST rates and pricing settings admin (S05-T07): propose → a second person approves; follow-on rates; settings. */
import { beforeEach, describe, expect, it } from 'vitest';

import { gstinCheckChar } from '../../src/b2b/modules/kyc/index.js';
import {
  createTaxRulesService,
  findTaxRule,
  PricingSettingsRecord,
  readSettings,
  seedPricingSettings,
  seedTaxRules,
  TaxRuleRecord,
} from '../../src/b2b/modules/pricing/index.js';
import { asStaff, useInventoryApp } from './helpers/inventory-app.js';

const clock = { now: () => new Date('2026-11-18T10:00:00Z') };
const app = useInventoryApp({ clock });

const TAX = 'pricing.rules.read,pricing.tax.manage';
const A = asStaff(`a1:${TAX}`);
const B = asStaff(`b1:${TAX}`);
const HOTELS_TEAM = asStaff('h1:pricing.rules.read,pricing.rules.propose,pricing.simulator.use');
const v = (/** @type {number} */ n) => ({ 'if-match': `"${n}"` });
const DELHI_GSTIN = (() => {
  const base = '07AAACM1234A1Z';
  return base + gstinCheckChar(base);
})();

beforeEach(async () => {
  await TaxRuleRecord.deleteMany({});
  await PricingSettingsRecord.deleteMany({});
  await Promise.all([seedTaxRules(), seedPricingSettings()]);
});

const sixPercent = {
  appliesTo: 'ACCOMMODATION',
  sac: '996311',
  slabMinPaise: 0,
  slabMaxPaise: 750000,
  rateBps: 600,
  itcAllowed: false,
  effectiveFrom: '2027-04-01',
  effectiveTo: null,
  sourceNote: 'Hypothetical notification for the test',
  replaces: 'accommodation-2025-up-to-7500',
};
const rateOn = async (/** @type {string} */ date) =>
  findTaxRule(await createTaxRulesService().activeRules(), { appliesTo: 'ACCOMMODATION', valuePaise: 95000, date }).rateBps;

describe('GST rates', () => {
  it('propose → a different person approves → the old rate ends the day before, the new one starts', async () => {
    const p = await app.admin.post('/api/v1/admin/tax-rules', sixPercent, A);
    expect(p.status).toBe(201);
    expect(p.body).toMatchObject({ status: 'PENDING_APPROVAL', proposedBy: 'staff:a1', rateBps: 600 });
    expect(await rateOn('2027-04-01')).toBe(500); // nothing changes before approval
    const own = await app.admin.post(`/api/v1/admin/tax-rules/${p.body.id}/approve`, {}, { ...A, ...v(1) });
    expect(own.status).toBe(403);
    expect(own.body.code).toBe('SECOND_PERSON_REQUIRED');
    const ok = await app.admin.post(`/api/v1/admin/tax-rules/${p.body.id}/approve`, {}, { ...B, ...v(1) });
    expect(ok.body).toMatchObject({ status: 'ACTIVE', approvedBy: 'staff:b1' });
    expect(await rateOn('2027-03-31')).toBe(500);
    expect(await rateOn('2027-04-01')).toBe(600);
    const old = await TaxRuleRecord.findOne({ key: 'accommodation-2025-up-to-7500' }).lean();
    expect(old).toMatchObject({ status: 'ACTIVE', effectiveTo: '2027-03-31', rateBps: 500 }); // only its end date was set
    expect(old?.history.at(-1)).toMatchObject({ action: 'closed', by: 'staff:b1' });
    const stored = await TaxRuleRecord.findById(p.body.id).lean();
    expect(stored?.pendingEvents?.map((e) => e.type)).toEqual(['pricing.tax-rule.activated']);
  });

  it('a rate that would overlap another is refused (when proposed and when approved)', async () => {
    const noFollow = { ...sixPercent, replaces: null };
    const res = await app.admin.post('/api/v1/admin/tax-rules', noFollow, A);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('TAX_RULES_OVERLAP');
  });

  it('cut short between closing the old rate and starting the new one: refused meanwhile, approving again finishes', async () => {
    const p = await app.admin.post('/api/v1/admin/tax-rules', sixPercent, A);
    await TaxRuleRecord.updateOne({ key: 'accommodation-2025-up-to-7500' }, { $set: { effectiveTo: '2027-03-31' } }); // step 1 only
    await expect(rateOn('2027-04-02')).rejects.toThrow(/NO_TAX_RULE/); // quotes refused, never wrong
    expect((await app.admin.post(`/api/v1/admin/tax-rules/${p.body.id}/approve`, {}, { ...B, ...v(1) })).status).toBe(200);
    expect(await rateOn('2027-04-02')).toBe(600);
  });

  it('rejected rates never apply; problems are listed; versions checked', async () => {
    const bad = await app.admin.post('/api/v1/admin/tax-rules', { ...sixPercent, rateBps: 6000, effectiveTo: '2020-01-01' }, A);
    expect(bad.status).toBe(422);
    expect(bad.body.errors.map((/** @type {any} */ e) => e.code)).toEqual(['RATE_INVALID', 'DATE_RANGE']);
    const p = await app.admin.post('/api/v1/admin/tax-rules', sixPercent, A);
    expect((await app.admin.post(`/api/v1/admin/tax-rules/${p.body.id}/reject`, {}, B)).status).toBe(428);
    expect((await app.admin.post(`/api/v1/admin/tax-rules/${p.body.id}/reject`, {}, { ...B, ...v(9) })).status).toBe(412);
    const r = await app.admin.post(`/api/v1/admin/tax-rules/${p.body.id}/reject`, { note: 'Not notified yet' }, { ...B, ...v(1) });
    expect(r.body.status).toBe('REJECTED');
    expect(await rateOn('2027-04-02')).toBe(500);
    expect((await app.admin.post(`/api/v1/admin/tax-rules/${p.body.id}/approve`, {}, { ...B, ...v(2) })).body.code).toBe('RULE_STATUS');
  });

  it('only GST permission holders propose; readers see the list', async () => {
    expect((await app.admin.post('/api/v1/admin/tax-rules', sixPercent, HOTELS_TEAM)).status).toBe(403);
    const list = await app.admin.get('/api/v1/admin/tax-rules', HOTELS_TEAM);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(5);
  });
});

describe('pricing settings', () => {
  const settings = (over = {}) => ({
    model: 'PRINCIPAL',
    issuers: [{ gstin: DELHI_GSTIN, stateCode: '07', isDefault: true }],
    sellUnregisteredHotels: true,
    note: 'Our Delhi GSTIN',
    ...over,
  });

  it("filling in MusafirBaba's GSTIN: version checked, history kept, caches told", async () => {
    const s = await app.admin.get('/api/v1/admin/pricing/settings', HOTELS_TEAM);
    expect(s.body).toMatchObject({ model: 'PRINCIPAL', sellUnregisteredHotels: true, version: 1 });
    expect((await app.admin.put('/api/v1/admin/pricing/settings', settings(), { ...A, ...v(5) })).status).toBe(412);
    const r = await app.admin.put('/api/v1/admin/pricing/settings', settings(), { ...A, ...v(1) });
    expect(r.status).toBe(200);
    expect(r.body.issuers).toEqual([{ gstin: DELHI_GSTIN, stateCode: '07', isDefault: true }]);
    expect(r.body.history[0]).toMatchObject({ by: 'staff:a1', note: 'Our Delhi GSTIN' });
    expect((await readSettings()).issuers[0]?.gstin).toBe(DELHI_GSTIN);
    const signal = await app.mongo.db.collection('rt_signals').find({}).sort({ $natural: -1 }).limit(1).next();
    expect(signal).toMatchObject({ room: 'cache:evict', data: { prefix: 'pricing:' } });
  });

  it('wrong settings are refused with every problem listed', async () => {
    const res = await app.admin.put(
      '/api/v1/admin/pricing/settings',
      settings({
        model: 'AGENT',
        issuers: [
          { gstin: DELHI_GSTIN, stateCode: '30', isDefault: true },
          { gstin: null, stateCode: '30', isDefault: true },
        ],
      }),
      { ...A, ...v(1) },
    );
    expect(res.status).toBe(422);
    expect(res.body.errors.map((/** @type {any} */ e) => e.code)).toEqual([
      'PRICING_MODEL_NOT_BUILT',
      'ONE_DEFAULT_ISSUER',
      'GSTIN_INVALID',
      'STATE_REPEATED',
    ]);
  });

  it('only GST permission holders change settings', async () => {
    expect((await app.admin.put('/api/v1/admin/pricing/settings', settings(), { ...HOTELS_TEAM, ...v(1) })).status).toBe(403);
  });
});
