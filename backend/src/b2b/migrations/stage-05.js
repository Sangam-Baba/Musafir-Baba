// @ts-check
/** Migrations of Stage 05 (pricing & GST). Run after 0001–0034; ids never renamed or reused. */
import {
  CLIENT_MARKUPS_COLLECTION,
  MARGIN_RULES_COLLECTION,
  SETTINGS_COLLECTION,
  SIGNING_KEYS_COLLECTION,
  TAX_RULES_COLLECTION,
} from '../modules/pricing/index.js';

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
  {
    id: '0036-prc-margin-rules',
    description: 'Margin rules: one per seeded key; rules by status (in force, waiting for approval); relay index',
    up: async (ctx) => {
      await ctx.createCollection(MARGIN_RULES_COLLECTION);
      await ctx.createIndex(
        MARGIN_RULES_COLLECTION,
        { key: 1 },
        { name: 'key_unique', unique: true, partialFilterExpression: { key: { $type: 'string' } } },
      );
      await ctx.createIndex(MARGIN_RULES_COLLECTION, { status: 1, updatedAt: -1 }, { name: 'status_recent' });
      await ctx.createIndex(
        MARGIN_RULES_COLLECTION,
        { hasPendingEvents: 1 },
        { name: 'pending_events', partialFilterExpression: { hasPendingEvents: true } },
      );
    },
  },
  {
    id: '0037-prc-settings',
    description: 'Pricing settings: one document (principal / agent, issuing GSTINs, hotels without GST)',
    up: async (ctx) => {
      await ctx.createCollection(SETTINGS_COLLECTION);
    },
  },
  {
    id: '0038-prc-signing-keys',
    description: 'Price-token keys (ids and status only): at most one ACTIVE key; old keys by verify deadline',
    up: async (ctx) => {
      await ctx.createCollection(SIGNING_KEYS_COLLECTION);
      await ctx.createIndex(
        SIGNING_KEYS_COLLECTION,
        { status: 1 },
        { name: 'one_active', unique: true, partialFilterExpression: { status: 'ACTIVE' } },
      );
      await ctx.createIndex(SIGNING_KEYS_COLLECTION, { verifyUntil: 1 }, { name: 'verify_until' });
    },
  },
  {
    id: '0039-prc-tax-rules-events',
    description: 'GST rates carry events (rate approved): relay index',
    up: async (ctx) => {
      await ctx.createIndex(
        TAX_RULES_COLLECTION,
        { hasPendingEvents: 1 },
        { name: 'pending_events', partialFilterExpression: { hasPendingEvents: true } },
      );
    },
  },
  {
    id: '0040-prc-client-markups',
    description: "Clients' own display markups: one per client org",
    up: async (ctx) => {
      await ctx.createCollection(CLIENT_MARKUPS_COLLECTION);
      await ctx.createIndex(CLIENT_MARKUPS_COLLECTION, { clientOrgId: 1 }, { name: 'client_unique', unique: true });
    },
  },
];
