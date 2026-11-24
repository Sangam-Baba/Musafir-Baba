// @ts-check
/** Stage 16 — hardening and launch (new collections with allowed prefixes only). */
import { INVARIANT_RUNS_COLLECTION } from '../modules/reporting/index.js';

/** @type {import('../core/db/migrations.js').Migration[]} */
export const STAGE_16 = [
  {
    id: '0081-rpt-invariant-runs',
    description: 'Safety-check runs: newest first, failures',
    up: async (ctx) => {
      await ctx.createCollection(INVARIANT_RUNS_COLLECTION);
      await ctx.createIndex(INVARIANT_RUNS_COLLECTION, { at: -1 }, { name: 'recent' });
      await ctx.createIndex(INVARIANT_RUNS_COLLECTION, { ok: 1, at: -1 }, { name: 'failures' });
    },
  },
];
