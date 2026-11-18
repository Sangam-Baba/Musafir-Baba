// @ts-check
/**
 * Reading GST rates (S05-T02). `seedTaxRules` loads the starter rates at background start: repeat-safe, only adds
 * rules whose key is missing, never changes an existing one. Changes go through the admin flow (S05-T07).
 */
import { SEED_TAX_RULES } from './domain/tax.js';
import { TaxRuleRecord } from './models/tax-rule.model.js';

/** @typedef {import('./domain/tax.js').TaxRule} TaxRule */

/** @returns {Promise<number>} how many rules were added */
export async function seedTaxRules() {
  const res = await TaxRuleRecord.bulkWrite(
    SEED_TAX_RULES.map((rule) => ({
      updateOne: {
        filter: { key: rule.key },
        update: { $setOnInsert: { ...rule, status: 'ACTIVE', proposedBy: 'seed', approvedBy: 'seed' } },
        upsert: true,
      },
    })),
    { ordered: false },
  );
  return res.upsertedCount;
}

/** @param {Record<string, any>} d @returns {TaxRule} */
export const toRule = (d) => ({
  key: d.key,
  appliesTo: d.appliesTo,
  sac: d.sac,
  slabMinPaise: d.slabMinPaise,
  slabMaxPaise: d.slabMaxPaise ?? null,
  rateBps: d.rateBps,
  itcAllowed: d.itcAllowed,
  effectiveFrom: d.effectiveFrom,
  effectiveTo: d.effectiveTo ?? null,
  sourceNote: d.sourceNote,
});

/** GST rates for pricing (reads only; changes come with the admin flow). */
export function createTaxRulesService() {
  return {
    /** Approved rules in force (any date) — what prices are worked out from. @returns {Promise<TaxRule[]>} */
    async activeRules() {
      const docs = await TaxRuleRecord.find({ status: 'ACTIVE' }).sort({ appliesTo: 1, effectiveFrom: 1, slabMinPaise: 1 }).lean();
      return docs.map(toRule);
    },
  };
}
