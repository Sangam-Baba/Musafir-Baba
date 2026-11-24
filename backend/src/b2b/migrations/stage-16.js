// @ts-check
/** Stage 16 — hardening and launch (new collections with allowed prefixes only). */
import { CONSENTS_COLLECTION, DATA_REQUESTS_COLLECTION } from '../modules/identity/index.js';
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
  {
    id: '0082-id-privacy',
    description: 'DPDP: consents (by subject), data requests (one open per email and type, due list)',
    up: async (ctx) => {
      await ctx.createCollection(CONSENTS_COLLECTION);
      await ctx.createIndex(CONSENTS_COLLECTION, { subjectRef: 1, at: -1 }, { name: 'subject' });
      await ctx.createCollection(DATA_REQUESTS_COLLECTION);
      await ctx.createIndex(DATA_REQUESTS_COLLECTION, { ref: 1 }, { name: 'ref_unique', unique: true });
      await ctx.createIndex(
        DATA_REQUESTS_COLLECTION,
        { email: 1, type: 1 },
        { name: 'one_open', unique: true, partialFilterExpression: { status: 'OPEN' } },
      );
      await ctx.createIndex(DATA_REQUESTS_COLLECTION, { status: 1, dueAt: 1 }, { name: 'due' });
    },
  },
];
