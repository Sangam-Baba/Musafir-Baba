// @ts-check
/**
 * Reading margin rules for prices (S05-T03). `seedDefaultMarginRules` adds the two defaults of plan §2a at
 * background start — only when their key has never existed (a retired default stays retired).
 */
import { DEFAULT_RULES } from './domain/margin.js';
import { inForce } from './domain/rule-lifecycle.js';
import { MarginRuleRecord } from './models/margin-rule.model.js';

/** @typedef {import('./domain/margin.js').MarginRule} MarginRule */

/**
 * @param {{ clock: import('../../core/clock.js').Clock }} deps
 * @returns {Promise<number>} how many rules were added
 */
export async function seedDefaultMarginRules(deps) {
  const history = [{ at: deps.clock.now(), action: 'seeded', by: 'seed', note: 'Default of plan Stage 05 §2a', status: 'ACTIVE' }];
  const res = await MarginRuleRecord.bulkWrite(
    DEFAULT_RULES.map((rule) => ({
      updateOne: {
        filter: { key: rule.key },
        update: { $setOnInsert: { ...rule, status: 'ACTIVE', createdBy: 'seed', approvedBy: 'seed', history } },
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
  replaces: d.replaces ?? null,
});

/** Margin rules for pricing (reads only; changes come with the approval flow). */
export function createMarginRulesService() {
  return {
    /** Approved rules in force, minus replaced ones (their own dates are checked when pricing). @returns {Promise<MarginRule[]>} */
    async activeRules() {
      const docs = await MarginRuleRecord.find({ status: 'ACTIVE' }).lean();
      return inForce(docs.map(toMarginRule));
    },

    /** Draft / waiting rules to try out in the simulator (unknown or other ids are ignored). @param {string[]} ids */
    async draftRules(ids) {
      const valid = ids.filter((id) => /^[a-f0-9]{24}$/.test(id));
      if (valid.length === 0) return [];
      const docs = await MarginRuleRecord.find({ _id: { $in: valid }, status: { $in: ['DRAFT', 'PENDING_APPROVAL'] } }).lean();
      return docs.map(toMarginRule);
    },

    /** Names of rules, for "which rule applied". @param {string[]} ids @returns {Promise<Record<string, string>>} */
    async names(ids) {
      const docs = await MarginRuleRecord.find({ _id: { $in: ids.filter((id) => /^[a-f0-9]{24}$/.test(id)) } }, { name: 1 }).lean();
      return Object.fromEntries(docs.map((d) => [String(d._id), d.name]));
    },
  };
}
