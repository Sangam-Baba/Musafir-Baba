// @ts-check
/**
 * Plans and query weights — pure (plan Stage 13 §2, D3 / D7). The numbers below are **placeholders** until the
 * business signs off D7 with real clients; MusafirBaba admin changes every one of them from the admin panel.
 */
export const LIMIT_BEHAVIOURS = /** @type {const} */ (['BLOCK', 'OVERAGE']);
export const GST_RATE_BPS = 1800; // SaaS services: 18 % (CA to confirm the SAC)
export const SAAS_SAC = '998314'; // placeholder — CA to confirm

/**
 * @typedef {{ users: number, branches: number, api: boolean, webhooks: boolean }} PlanFeatures
 * @typedef {{ key: string, name: string, monthlyQueryLimit: number, pricePaise: number, limitBehaviour: 'BLOCK' | 'OVERAGE',
 *   overagePricePerQueryPaise: number, trialDays: number, nextPlanKey: string | null, features: PlanFeatures }} PlanTerms
 */

/** The starting catalogue (placeholders). @type {readonly PlanTerms[]} */
export const DEFAULT_PLANS = Object.freeze([
  {
    key: 'STARTER',
    name: 'Starter (trial)',
    monthlyQueryLimit: 1000,
    pricePaise: 0,
    limitBehaviour: 'BLOCK',
    overagePricePerQueryPaise: 0,
    trialDays: 30,
    nextPlanKey: 'A',
    features: { users: 3, branches: 1, api: false, webhooks: false },
  },
  {
    key: 'A',
    name: 'Plan A',
    monthlyQueryLimit: 4000,
    pricePaise: 299_900,
    limitBehaviour: 'BLOCK',
    overagePricePerQueryPaise: 0,
    trialDays: 0,
    nextPlanKey: null,
    features: { users: 5, branches: 2, api: false, webhooks: false },
  },
  {
    key: 'B',
    name: 'Plan B',
    monthlyQueryLimit: 5000,
    pricePaise: 349_900,
    limitBehaviour: 'OVERAGE',
    overagePricePerQueryPaise: 100,
    trialDays: 0,
    nextPlanKey: null,
    features: { users: 10, branches: 5, api: true, webhooks: false },
  },
  {
    key: 'C',
    name: 'Plan C',
    monthlyQueryLimit: 10_000,
    pricePaise: 599_900,
    limitBehaviour: 'OVERAGE',
    overagePricePerQueryPaise: 75,
    trialDays: 0,
    nextPlanKey: null,
    features: { users: 25, branches: 20, api: true, webhooks: true },
  },
]);
export const DEFAULT_PLAN_KEY = 'STARTER';

/** What counts as a query (D3 defaults): 1 each for search, offers and price check; booking 0 (never blocked). */
export const DEFAULT_WEIGHTS = Object.freeze({ 'hotel.search': 1, 'hotel.offers': 1, 'hotel.pricecheck': 1, 'hotel.order': 0 });

/**
 * Problems with proposed plan terms (empty = fine).
 * @param {Partial<PlanTerms>} t
 */
export function checkPlanTerms(t) {
  /** @type {{ field: string, code: string }[]} */
  const problems = [];
  const whole = (/** @type {unknown} */ v, /** @type {number} */ max) =>
    Number.isSafeInteger(v) && /** @type {number} */ (v) >= 0 && /** @type {number} */ (v) <= max;
  if (!t.name || t.name.trim().length < 2 || t.name.length > 60) problems.push({ field: 'name', code: 'NAME_INVALID' });
  if (!whole(t.monthlyQueryLimit, 10_000_000)) problems.push({ field: 'monthlyQueryLimit', code: 'LIMIT_INVALID' });
  if (!whole(t.pricePaise, 100_000_000)) problems.push({ field: 'pricePaise', code: 'PRICE_INVALID' });
  if (!LIMIT_BEHAVIOURS.includes(/** @type {any} */ (t.limitBehaviour)))
    problems.push({ field: 'limitBehaviour', code: 'BEHAVIOUR_INVALID' });
  if (!whole(t.overagePricePerQueryPaise, 100_000)) problems.push({ field: 'overagePricePerQueryPaise', code: 'PRICE_INVALID' });
  if (t.limitBehaviour === 'OVERAGE' && !t.overagePricePerQueryPaise)
    problems.push({ field: 'overagePricePerQueryPaise', code: 'OVERAGE_PRICE_REQUIRED' });
  if (!whole(t.trialDays, 365)) problems.push({ field: 'trialDays', code: 'TRIAL_INVALID' });
  return problems;
}

/** @param {Record<string, unknown>} w */
export function checkWeights(w) {
  return Object.entries(w).every(
    ([k, v]) => /^hotel\.[a-z]+$/.test(k) && Number.isSafeInteger(v) && /** @type {number} */ (v) >= 0 && /** @type {number} */ (v) <= 100,
  );
}
