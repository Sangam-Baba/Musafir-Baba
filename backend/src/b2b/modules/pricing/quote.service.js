// @ts-check
/**
 * `quote` (S05-T05): the price of a room type × rate plan offer for a buyer. Internal (no HTTP) — search and
 * booking pass the offer's nightly hotel rates (from hotel-inventory) and the property's tax facts (from
 * hotel-catalog / kyc), so this shared module never imports hotel modules. Rules, GST rates and settings are kept
 * for at most a minute per process and dropped at once when a rule or rate changes (`cache:evict` of `pricing:`,
 * sent by `createPricingCacheSignals` for every pricing event).
 */
import { createCache } from '../../core/cache.js';
import { publishCacheEvict } from '../../core/realtime/signals.js';
import { buildBreakdown } from './domain/quote.js';
import { createMarginRulesService } from './margin-rules.service.js';
import { DEFAULT_SETTINGS, PricingSettingsRecord, SETTINGS_ID } from './models/settings.model.js';
import { createTaxRulesService } from './tax-rules.service.js';

export const PRICING_CACHE_PREFIX = 'pricing:';
const DATA_KEY = `${PRICING_CACHE_PREFIX}data`;
export const PRICING_CACHE_MS = 60_000;

/** @typedef {import('./domain/quote.js').QuoteData} QuoteData */
/** @typedef {Omit<QuoteData, 'now'>} PricingData */

/** Adds the settings document with the owner's choices if it doesn't exist (never changes it). */
export async function seedPricingSettings() {
  const res = await PricingSettingsRecord.updateOne(
    { _id: SETTINGS_ID },
    { $setOnInsert: { ...DEFAULT_SETTINGS, issuers: DEFAULT_SETTINGS.issuers.map((i) => ({ ...i })) } },
    { upsert: true },
  );
  return res.upsertedCount;
}

/** @returns {Promise<import('./domain/quote.js').PricingSettings>} */
export async function readSettings() {
  const doc = await PricingSettingsRecord.findById(SETTINGS_ID).lean();
  if (!doc) return { ...DEFAULT_SETTINGS };
  return {
    model: doc.model,
    issuers: (doc.issuers ?? []).map((i) => ({ gstin: i.gstin ?? null, stateCode: i.stateCode, isDefault: i.isDefault === true })),
    sellUnregisteredHotels: doc.sellUnregisteredHotels,
  };
}

/** @param {{ clock: import('../../core/clock.js').Clock }} deps */
export function createQuoteService(deps) {
  /** @type {ReturnType<typeof createCache<PricingData>>} */
  const cache = createCache({ max: 1, ttlMs: PRICING_CACHE_MS, clock: deps.clock, shared: true });
  const margins = createMarginRulesService();
  const taxes = createTaxRulesService();

  /** @returns {Promise<PricingData>} */
  async function data() {
    const hit = cache.get(DATA_KEY);
    if (hit) return hit;
    const [rules, taxRules, settings] = await Promise.all([margins.activeRules(), taxes.activeRules(), readSettings()]);
    const fresh = { rules, taxRules, settings };
    cache.set(DATA_KEY, fresh);
    return fresh;
  }

  return {
    data,
    /**
     * @param {import('./domain/quote.js').QuoteInput} q
     * @returns {Promise<import('./domain/quote.js').PriceBreakdown>}
     */
    async quote(q) {
      return buildBreakdown({ ...(await data()), now: deps.clock.now() }, q);
    },
  };
}

/**
 * Consumer for pricing events: every process drops its cached rules (and, later, search results built on them).
 * @param {{ clock: import('../../core/clock.js').Clock, logger: import('../../core/logger.js').Logger }} deps
 */
export function createPricingCacheSignals(deps) {
  return {
    async handle() {
      await publishCacheEvict(PRICING_CACHE_PREFIX, deps).catch((error) =>
        deps.logger.warn({ err: error }, 'pricing: cache evict signal failed'),
      );
    },
  };
}
