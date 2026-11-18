// @ts-check
/** Migrations of Stage 05 (pricing & GST). Run after 0001–0034; ids never renamed or reused. */
import { TAX_RULES_COLLECTION } from '../modules/pricing/index.js';

/** @type {import('../core/db/migrations.js').Migration[]} */
export const STAGE_05 = [
  {
    id: '0035-prc-tax-rules',
    description: 'GST rates: one rule per key; rules in force by kind and start date',
    up: async (ctx) => {
      await ctx.createCollection(TAX_RULES_COLLECTION);
      await ctx.createIndex(TAX_RULES_COLLECTION, { key: 1 }, { name: 'key_unique', unique: true });
      await ctx.createIndex(TAX_RULES_COLLECTION, { status: 1, appliesTo: 1, effectiveFrom: 1 }, { name: 'status_kind_from' });
    },
  },
];
