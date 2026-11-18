// @ts-check
/**
 * Reading margin rules for prices (S05-T03). `seedDefaultMarginRules` adds the two defaults of plan §2a at
 * background start — only when their key has never existed (a retired default stays retired).
 */
import { DEFAULT_RULES } from './domain/margin.js';
import { MarginRuleRecord } from './models/margin-rule.model.js';

/** @typedef {import('./domain/margin.js').MarginRule} MarginRule */

/** @returns {Promise<number>} how many rules were added */
export async function seedDefaultMarginRules() {
  const res = await MarginRuleRecord.bulkWrite(
    DEFAULT_RULES.map((rule) => ({
      updateOne: {
        filter: { key: rule.key },
        update: { $setOnInsert: { ...rule, status: 'ACTIVE', createdBy: 'seed', approvedBy: 'seed' } },
        upsert: true,
      },
    })),
    { ordered: false },
  );
  return res.upsertedCount;
}

/** @param {Record<string, any>} d @returns {MarginRule} */
export const toMarginRule = (d) => ({
  id: String(d._id),
  name: d.name,
  priority: d.priority,
  match: Object.fromEntries(Object.entries(d.match ?? {}).filter(([, v]) => v !== undefined && v !== null)),
  adjustment: d.adjustment,
  allowBelowNet: d.allowBelowNet === true,
  effectiveFrom: d.effectiveFrom ?? null,
  effectiveTo: d.effectiveTo ?? null,
  createdAt: d.createdAt,
});

/** Margin rules for pricing (reads only; changes come with the approval flow). */
export function createMarginRulesService() {
  return {
    /** Approved rules (their own dates are checked when pricing). @returns {Promise<MarginRule[]>} */
    async activeRules() {
      const docs = await MarginRuleRecord.find({ status: 'ACTIVE' }).lean();
      return docs.map(toMarginRule);
    },
  };
}
