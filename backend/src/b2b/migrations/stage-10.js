// @ts-check
/** Migrations of Stage 10 (B2B client onboarding). Run after 0001–0040; ids never renamed or reused. */
import { CLIENT_CATEGORIES_COLLECTION } from '../modules/organizations/index.js';

/** @type {import('../core/db/migrations.js').Migration[]} */
export const STAGE_10 = [
  {
    id: '0041-org-client-categories',
    description: 'Client categories: one per key; listed in display order',
    up: async (ctx) => {
      await ctx.createCollection(CLIENT_CATEGORIES_COLLECTION);
      await ctx.createIndex(CLIENT_CATEGORIES_COLLECTION, { key: 1 }, { name: 'key_unique', unique: true });
      await ctx.createIndex(CLIENT_CATEGORIES_COLLECTION, { active: 1, order: 1 }, { name: 'active_order' });
    },
  },
];
