// @ts-check
/**
 * Stage 05 mandatory tests (plan Stage 05 §8). This file holds tenant isolation for the one client-owned pricing
 * collection, the classification of every `prc_` collection, and the plan's headline examples end to end through the
 * stored rules. The rest of the list lives in:
 * - channel examples ₹700 → ₹997.50 website / ₹892.50 B2B; 20 % → ₹840 + GST; percent min / max clamps;
 *   brief ₹10,000 + ₹1,000 = ₹11,000 + GST; totals = Σ parts (1 000 random stays)        → pricing-quote.test.js
 * - no matching rule → not sellable; precedence with shuffled input (300 shuffles)        → pricing-margin.test.js
 * - slab boundaries 749999 / 750000 / 750001 paise; CGST + SGST vs IGST; rounding         → pricing-tax.test.js
 * - token tamper / expiry / rotation / other buyer / other stay                           → pricing-token.test.js
 * - rule change needs a second person; caches dropped on approval                         → pricing-rules-admin.test.js,
 *                                                                                           pricing-quote.test.js
 * - GST rates as dated data, approved by a second person                                  → pricing-tax-admin.test.js
 * - net rate and margin never in website / client views                                   → pricing-quote.test.js,
 *                                                                                           pricing-token.test.js
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { b2bMongoose } from '../../src/b2b/core/db/connection.js';
import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import {
  CLIENT_MARKUPS_COLLECTION,
  ClientMarkupRecord,
  createQuoteService,
  MARGIN_RULES_COLLECTION,
  priceView,
  seedDefaultMarginRules,
  seedPricingSettings,
  seedTaxRules,
  SETTINGS_COLLECTION,
  SIGNING_KEYS_COLLECTION,
  TAX_RULES_COLLECTION,
} from '../../src/b2b/modules/pricing/index.js';
import { startMongo } from './helpers/mongo.js';

const clock = { now: () => new Date('2026-11-18T10:00:00Z') };
const A = '64b0000000000000000000aa';
const B = '64b0000000000000000000bb';

/** Platform-wide on purpose: MusafirBaba's own pricing data, managed only by staff permissions. */
const PLATFORM_WIDE = [MARGIN_RULES_COLLECTION, TAX_RULES_COLLECTION, SETTINGS_COLLECTION, SIGNING_KEYS_COLLECTION];
const OWNED = [CLIENT_MARKUPS_COLLECTION];

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  await Promise.all([seedTaxRules(), seedDefaultMarginRules({ clock }), seedPricingSettings()]);
  const markup = (/** @type {string} */ o) => ({
    clientOrgId: o,
    enabled: true,
    adjustment: { type: 'PERCENT', value: 1000 },
    overrides: [],
    updatedBy: 'u',
  });
  await ClientMarkupRecord.insertMany([markup(A), markup(B)]);
});
afterAll(async () => mongo.stop());

describe('tenant isolation — client markups', () => {
  it('unscoped reads and writes are refused', async () => {
    await expect(ClientMarkupRecord.find({}).lean()).rejects.toThrow(/no ownership filter/);
    await expect(ClientMarkupRecord.countDocuments({})).rejects.toThrow(/no ownership filter/);
    await expect(ClientMarkupRecord.updateMany({}, { $set: { enabled: false } })).rejects.toThrow(/no ownership filter/);
    await expect(ClientMarkupRecord.deleteMany({})).rejects.toThrow(/no ownership filter/);
    await expect(ClientMarkupRecord.aggregate([{ $match: {} }])).rejects.toThrow(/no ownership filter/);
  });

  it("a scoped query sees only that client's markup", async () => {
    const docs = await ClientMarkupRecord.find({ clientOrgId: A }).lean();
    expect(docs.map((d) => d.clientOrgId)).toEqual([A]);
  });

  it('every prc_ collection is classified (owned by a client, or platform-wide on purpose)', () => {
    const prc = [
      ...new Set(
        Object.values(b2bMongoose.models)
          .map((m) => m.collection.collectionName)
          .filter((n) => n.startsWith('prc_')),
      ),
    ].sort();
    expect(prc).toEqual([...PLATFORM_WIDE, ...OWNED].sort());
  });
});

describe('the plan examples through the stored rules', () => {
  /** @param {'WEBSITE' | 'B2B_PORTAL'} channel @param {number} net */
  const quote = (channel, net) =>
    createQuoteService({ clock }).quote({
      ctx: { channel, hotelOrgId: 'h', propertyId: 'p' },
      property: { stateCode: '07', gstRegistered: true },
      checkIn: '2026-12-01',
      checkOut: '2026-12-02',
      nightly: [{ date: '2026-12-01', amounts: [net] }],
    });

  it('the same room: website ₹997.50, B2B ₹892.50 — different margins per channel', async () => {
    expect((await quote('WEBSITE', 70000)).totals.totalPaise).toBe(99750);
    expect((await quote('B2B_PORTAL', 70000)).totals.totalPaise).toBe(89250);
  });

  it('website and client views never carry the hotel rate or the margin', async () => {
    const b = await quote('B2B_PORTAL', 70000);
    for (const audience of /** @type {const} */ (['WEBSITE', 'CLIENT'])) {
      const text = JSON.stringify(priceView(b, audience));
      expect(text).not.toMatch(/net|margin|ruleId|hotelGst|70000|15000/);
    }
  });
});
