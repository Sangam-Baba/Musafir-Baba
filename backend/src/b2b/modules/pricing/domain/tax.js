// @ts-check
/**
 * GST as data (plan Stage 05 §3.4–3.5, `04-domain-model.md` §8.3). Pure.
 * - A tax rule is a dated slab: `slabMinPaise` … `slabMaxPaise` (both inclusive, null = no maximum), a rate in
 *   basis points, valid from `effectiveFrom` to `effectiveTo` (stay dates, both inclusive, null = open).
 * - The slab is chosen per room per night on the value charged. ₹7,500.00 (750000 paise) is in the 5 % slab.
 * - Place of supply = the property's state. Same state as the issuing GSTIN → CGST + SGST (half the rate each),
 *   else IGST. Each line is rounded half-up to the paisa; the GST of a night is the sum of its lines.
 */
import { DomainError } from '../../../core/errors.js';
import { Money } from '../../../core/money.js';

// BUS_TRANSPORT (Stage 18): no starter rate — the CA confirms the rate / SAC and staff add it through the approval flow;
// until then a bus quote finds no tax rule and is not sellable (never guessed).
export const TAX_KINDS = /** @type {const} */ (['ACCOMMODATION', 'SAAS', 'BUS_TRANSPORT']);
export const ACCOMMODATION_SAC = '996311';
/** Highest rate a rule may carry (28 %) — a typo like 1800 → 18000 is refused. */
export const MAX_RATE_BPS = 2800;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @typedef {{ key: string, appliesTo: typeof TAX_KINDS[number], sac: string, slabMinPaise: number,
 *   slabMaxPaise: number | null, rateBps: number, itcAllowed: boolean, effectiveFrom: string,
 *   effectiveTo: string | null, sourceNote: string }} TaxRule
 * @typedef {{ gstin: string | null, stateCode: string, isDefault: boolean }} Issuer MusafirBaba's own registration (GSTIN filled in by an admin)
 * @typedef {{ taxRuleKey: string, sac: string, rateBps: number, itcAllowed: boolean, taxablePaise: number,
 *   intraState: boolean, cgstPaise: number, sgstPaise: number, igstPaise: number, gstPaise: number,
 *   issuerGstin: string | null, issuerState: string, placeOfSupply: string }} NightGst
 */

/**
 * Starter rates, loaded once (adds only what is missing; approved changes are new rules, never edits).
 * @type {readonly TaxRule[]}
 */
export const SEED_TAX_RULES = Object.freeze([
  {
    key: 'accommodation-2022-up-to-7500',
    appliesTo: 'ACCOMMODATION',
    sac: ACCOMMODATION_SAC,
    slabMinPaise: 0,
    slabMaxPaise: 750000,
    rateBps: 1200,
    itcAllowed: true,
    effectiveFrom: '2022-07-18',
    effectiveTo: '2025-09-21',
    sourceNote: 'Rooms up to ₹7,500 per night: 12 % (history, before the September 2025 change)',
  },
  {
    key: 'accommodation-2022-above-7500',
    appliesTo: 'ACCOMMODATION',
    sac: ACCOMMODATION_SAC,
    slabMinPaise: 750001,
    slabMaxPaise: null,
    rateBps: 1800,
    itcAllowed: true,
    effectiveFrom: '2022-07-18',
    effectiveTo: '2025-09-21',
    sourceNote: 'Rooms above ₹7,500 per night: 18 % (history)',
  },
  {
    key: 'accommodation-2025-up-to-7500',
    appliesTo: 'ACCOMMODATION',
    sac: ACCOMMODATION_SAC,
    slabMinPaise: 0,
    slabMaxPaise: 750000,
    rateBps: 500,
    itcAllowed: false,
    effectiveFrom: '2025-09-22',
    effectiveTo: null,
    sourceNote: 'Rooms up to ₹7,500 per night: 5 % without input tax credit, from 22 Sep 2025 — CA to confirm',
  },
  {
    key: 'accommodation-2025-above-7500',
    appliesTo: 'ACCOMMODATION',
    sac: ACCOMMODATION_SAC,
    slabMinPaise: 750001,
    slabMaxPaise: null,
    rateBps: 1800,
    itcAllowed: true,
    effectiveFrom: '2025-09-22',
    effectiveTo: null,
    sourceNote: 'Rooms above ₹7,500 per night: 18 % with input tax credit, from 22 Sep 2025 — CA to confirm',
  },
  {
    key: 'saas-2017',
    appliesTo: 'SAAS',
    sac: '998314',
    slabMinPaise: 0,
    slabMaxPaise: null,
    rateBps: 1800,
    itcAllowed: true,
    effectiveFrom: '2017-07-01',
    effectiveTo: null,
    sourceNote: 'Plan fees and per-query charges to B2B clients (Stage 13) — SAC and rate to be confirmed by the CA (Q6)',
  },
]);

/**
 * Every problem with a tax rule at once (TAX_RULE_INVALID), for the admin screen and the seed test.
 * @param {TaxRule} r
 * @returns {{ code: string, field: string }[]}
 */
export function taxRuleProblems(r) {
  const out = [];
  const isPaise = (/** @type {unknown} */ v) => Number.isSafeInteger(v) && /** @type {number} */ (v) >= 0;
  if (!TAX_KINDS.includes(r.appliesTo)) out.push({ code: 'UNKNOWN_KIND', field: 'appliesTo' });
  if (!/^\d{6}$/.test(r.sac)) out.push({ code: 'SAC_INVALID', field: 'sac' });
  if (!isPaise(r.slabMinPaise)) out.push({ code: 'AMOUNT_INVALID', field: 'slabMinPaise' });
  if (r.slabMaxPaise !== null && !isPaise(r.slabMaxPaise)) out.push({ code: 'AMOUNT_INVALID', field: 'slabMaxPaise' });
  if (r.slabMaxPaise !== null && r.slabMaxPaise < r.slabMinPaise) out.push({ code: 'SLAB_RANGE', field: 'slabMaxPaise' });
  if (!Number.isSafeInteger(r.rateBps) || r.rateBps < 0 || r.rateBps > MAX_RATE_BPS) out.push({ code: 'RATE_INVALID', field: 'rateBps' });
  if (!DATE.test(r.effectiveFrom)) out.push({ code: 'DATE_INVALID', field: 'effectiveFrom' });
  if (r.effectiveTo !== null && (!DATE.test(r.effectiveTo) || r.effectiveTo < r.effectiveFrom))
    out.push({ code: 'DATE_RANGE', field: 'effectiveTo' });
  return out;
}

/**
 * @param {Pick<TaxRule, 'effectiveFrom' | 'effectiveTo'>} r
 * @param {string} date
 */
const validOn = (r, date) => r.effectiveFrom <= date && (r.effectiveTo === null || date <= r.effectiveTo);

/**
 * Pairs of rules of one kind whose dates and slabs overlap (a value would have two rates) — refused on approval.
 * @param {readonly TaxRule[]} rules
 * @returns {[string, string][]}
 */
export function overlappingRules(rules) {
  /** @type {[string, string][]} */
  const out = [];
  rules.forEach((a, i) =>
    rules.slice(i + 1).forEach((b) => {
      const sameKind = a.appliesTo === b.appliesTo;
      const datesMeet = a.effectiveFrom <= (b.effectiveTo ?? '9999-12-31') && b.effectiveFrom <= (a.effectiveTo ?? '9999-12-31');
      const slabsMeet = a.slabMinPaise <= (b.slabMaxPaise ?? Infinity) && b.slabMinPaise <= (a.slabMaxPaise ?? Infinity);
      if (sameKind && datesMeet && slabsMeet) out.push([a.key, b.key]);
    }),
  );
  return out;
}

/**
 * The one active rule for this kind, value and stay date. None, or more than one, is refused — never guessed.
 * @param {readonly TaxRule[]} rules active rules
 * @param {{ appliesTo: TaxRule['appliesTo'], valuePaise: number, date: string }} q
 * @returns {TaxRule}
 */
export function findTaxRule(rules, q) {
  const hits = rules.filter(
    (r) =>
      r.appliesTo === q.appliesTo &&
      validOn(r, q.date) &&
      r.slabMinPaise <= q.valuePaise &&
      (r.slabMaxPaise === null || q.valuePaise <= r.slabMaxPaise),
  );
  const [rule, ...more] = hits;
  if (!rule) throw new DomainError('NO_TAX_RULE', { appliesTo: q.appliesTo, date: q.date, valuePaise: q.valuePaise });
  if (more.length > 0) throw new DomainError('TAX_RULES_OVERLAP', { rules: hits.map((r) => r.key) });
  return rule;
}

/**
 * The GSTIN that issues the invoice: one registered in the property's state, else the default one.
 * @param {readonly Issuer[]} issuers
 * @param {string} placeOfSupply property's GST state code, e.g. '07'
 * @returns {Issuer}
 */
export function issuerFor(issuers, placeOfSupply) {
  const issuer = issuers.find((i) => i.stateCode === placeOfSupply) ?? issuers.find((i) => i.isDefault);
  if (!issuer) throw new DomainError('NO_GST_ISSUER', { placeOfSupply });
  return issuer;
}

/**
 * GST lines for one taxable amount. Half the rate each for CGST / SGST, both rounded half-up.
 * @param {number} taxablePaise
 * @param {number} rateBps
 * @param {boolean} intraState
 */
export function splitGst(taxablePaise, rateBps, intraState) {
  const value = Money.inr(taxablePaise);
  if (!intraState) {
    const igstPaise = value.percent(rateBps).paise;
    return { cgstPaise: 0, sgstPaise: 0, igstPaise, gstPaise: igstPaise };
  }
  const half = Math.floor((taxablePaise * rateBps + 10000) / 20000); // value × rate / 2, half-up
  return { cgstPaise: half, sgstPaise: half, igstPaise: 0, gstPaise: 2 * half };
}

/**
 * GST on one room for one night.
 * @param {{ rules: readonly TaxRule[], issuers: readonly Issuer[] }} data active tax rules and issuing GSTINs
 * @param {{ taxablePaise: number, date: string, placeOfSupply: string }} night
 * @returns {NightGst}
 */
export function gstForNight(data, night) {
  const rule = findTaxRule(data.rules, { appliesTo: 'ACCOMMODATION', valuePaise: night.taxablePaise, date: night.date });
  const issuer = issuerFor(data.issuers, night.placeOfSupply);
  const intraState = issuer.stateCode === night.placeOfSupply;
  return {
    taxRuleKey: rule.key,
    sac: rule.sac,
    rateBps: rule.rateBps,
    itcAllowed: rule.itcAllowed,
    taxablePaise: night.taxablePaise,
    intraState,
    ...splitGst(night.taxablePaise, rule.rateBps, intraState),
    issuerGstin: issuer.gstin,
    issuerState: issuer.stateCode,
    placeOfSupply: night.placeOfSupply,
  };
}
