// @ts-check
/**
 * The price build-up (plan Stage 05 §3.6, `04-domain-model.md` §8.2). Pure.
 *   net (hotel's tax-exclusive rate, per room per night) → margin (winning rule for that night) → sell
 *   → GST on sell (slab per room per night, place of supply = the property's state) → totals.
 * Every component is rounded to the paisa per room per night; totals are sums, never re-rounded.
 * Principal model (owner, 18 Nov 2026 — CA to review): MusafirBaba resells, so GST is on the sell price, and the
 * GST a registered hotel charges MusafirBaba on its rate is recorded per night (`hotelGstPaise`, a cost for the
 * margin reports; payable to the hotel with the rate). Hotels without GST: sellable while the setting allows it.
 * A per-booking fee (if a rule matches) is added once and taxed at the rate of the stay's first night (CA to confirm).
 */
import { DomainError } from '../../../core/errors.js';
import { Money } from '../../../core/money.js';
import { bookingFee, nightMargin } from './margin.js';
import { findTaxRule, gstForNight, issuerFor, splitGst } from './tax.js';

export const BREAKDOWN_VERSION = 1;
export const PRICING_MODELS = /** @type {const} */ (['PRINCIPAL', 'AGENT']);

/**
 * @typedef {{ model: typeof PRICING_MODELS[number], issuers: import('./tax.js').Issuer[], sellUnregisteredHotels: boolean }} PricingSettings
 * @typedef {{ stateCode: string, gstRegistered: boolean }} PropertyTax
 * @typedef {{ date: string, amounts: number[] }} NetNight one amount per room (tax-exclusive paise)
 * @typedef {{ date: string, room: number, netPaise: number, marginPaise: number, ruleId: string, sellPaise: number,
 *   hotelGstPaise: number, gst: import('./tax.js').NightGst }} NightLine
 * @typedef {{ netPaise: number, marginPaise: number, feePaise: number, sellPaise: number, cgstPaise: number,
 *   sgstPaise: number, igstPaise: number, gstPaise: number, totalPaise: number, hotelGstPaise: number,
 *   hotelPayablePaise: number }} Totals
 * @typedef {{ version: number, model: string, channel: string, currency: 'INR', checkIn: string, checkOut: string,
 *   rooms: number, nights: number, lines: NightLine[], fee: { ruleId: string, sellPaise: number, cgstPaise: number,
 *   sgstPaise: number, igstPaise: number, gstPaise: number } | null, totals: Totals, ruleIds: string[],
 *   taxRuleKeys: string[] }} PriceBreakdown
 * @typedef {{ ctx: import('./margin.js').PriceContext, property: PropertyTax, checkIn: string, checkOut: string,
 *   nightly: NetNight[] }} QuoteInput
 * @typedef {{ rules: readonly import('./margin.js').MarginRule[], taxRules: readonly import('./tax.js').TaxRule[],
 *   settings: PricingSettings, now: Date }} QuoteData
 */

/**
 * GST the hotel charges MusafirBaba on its rate (principal model, registered hotel only).
 * @param {QuoteData} data
 * @param {PropertyTax} property
 * @param {{ date: string, netPaise: number }} night
 */
function hotelGst(data, property, night) {
  if (!property.gstRegistered) return 0;
  const rule = findTaxRule(data.taxRules, { appliesTo: 'ACCOMMODATION', valuePaise: night.netPaise, date: night.date });
  return Money.inr(night.netPaise).percent(rule.rateBps).paise;
}

/**
 * @param {QuoteData} data
 * @param {QuoteInput} q
 * @param {{ date: string, room: number, netPaise: number }} n
 * @returns {NightLine}
 */
function nightLine(data, q, n) {
  if (!Number.isSafeInteger(n.netPaise) || n.netPaise < 1) throw new DomainError('NOT_SELLABLE', { reason: 'NO_PRICE', date: n.date });
  const { ruleId, marginPaise } = nightMargin(data.rules, q.ctx, { date: n.date, now: data.now, netPaise: n.netPaise });
  const sellPaise = n.netPaise + marginPaise;
  const gst = gstForNight(
    { rules: data.taxRules, issuers: data.settings.issuers },
    { taxablePaise: sellPaise, date: n.date, placeOfSupply: q.property.stateCode },
  );
  return {
    date: n.date,
    room: n.room,
    netPaise: n.netPaise,
    marginPaise,
    ruleId,
    sellPaise,
    hotelGstPaise: hotelGst(data, q.property, n),
    gst,
  };
}

/**
 * @param {QuoteData} data
 * @param {QuoteInput} q
 * @param {NightLine} first
 */
function feeLine(data, q, first) {
  const fee = bookingFee(data.rules, q.ctx, { date: q.checkIn, now: data.now });
  if (!fee || fee.marginPaise <= 0) return null;
  const intraState = issuerFor(data.settings.issuers, q.property.stateCode).stateCode === q.property.stateCode;
  return { ruleId: fee.ruleId, sellPaise: fee.marginPaise, ...splitGst(fee.marginPaise, first.gst.rateBps, intraState) };
}

/**
 * @param {NightLine[]} lines
 * @param {PriceBreakdown['fee']} fee
 * @returns {Totals}
 */
function totalsOf(lines, fee) {
  const sum = (/** @type {(l: NightLine) => number} */ f) => lines.reduce((t, l) => t + f(l), 0);
  const netPaise = sum((l) => l.netPaise);
  const feePaise = fee?.sellPaise ?? 0;
  const sellPaise = sum((l) => l.sellPaise) + feePaise;
  const cgstPaise = sum((l) => l.gst.cgstPaise) + (fee?.cgstPaise ?? 0);
  const sgstPaise = sum((l) => l.gst.sgstPaise) + (fee?.sgstPaise ?? 0);
  const igstPaise = sum((l) => l.gst.igstPaise) + (fee?.igstPaise ?? 0);
  const gstPaise = cgstPaise + sgstPaise + igstPaise;
  const hotelGstPaise = sum((l) => l.hotelGstPaise);
  return {
    netPaise,
    marginPaise: sum((l) => l.marginPaise) + feePaise,
    feePaise,
    sellPaise,
    cgstPaise,
    sgstPaise,
    igstPaise,
    gstPaise,
    totalPaise: sellPaise + gstPaise,
    hotelGstPaise,
    hotelPayablePaise: netPaise + hotelGstPaise,
  };
}

/**
 * The full breakdown for one room type × rate plan offer.
 * @param {QuoteData} data
 * @param {QuoteInput} q
 * @returns {PriceBreakdown}
 */
export function buildBreakdown(data, q) {
  if (data.settings.model !== 'PRINCIPAL') throw new DomainError('PRICING_MODEL_NOT_BUILT', { model: data.settings.model });
  if (!q.property.gstRegistered && !data.settings.sellUnregisteredHotels)
    throw new DomainError('NOT_SELLABLE', { reason: 'HOTEL_NOT_GST_REGISTERED' });
  const rooms = q.nightly[0]?.amounts.length ?? 0;
  if (q.nightly.length === 0 || rooms === 0 || q.nightly.some((n) => n.amounts.length !== rooms))
    throw new DomainError('NOT_SELLABLE', { reason: 'NO_PRICE' });
  const lines = q.nightly.flatMap((n) => n.amounts.map((netPaise, room) => nightLine(data, q, { date: n.date, room, netPaise })));
  const fee = feeLine(data, q, /** @type {NightLine} */ (lines[0]));
  return {
    version: BREAKDOWN_VERSION,
    model: data.settings.model,
    channel: q.ctx.channel,
    currency: 'INR',
    checkIn: q.checkIn,
    checkOut: q.checkOut,
    rooms,
    nights: q.nightly.length,
    lines,
    fee,
    totals: totalsOf(lines, fee),
    ruleIds: [...new Set([...lines.map((l) => l.ruleId), ...(fee ? [fee.ruleId] : [])])].sort(),
    taxRuleKeys: [...new Set(lines.map((l) => l.gst.taxRuleKey))].sort(),
  };
}

/**
 * What each audience may see (plan §2a, §6): the website customer only the final price with GST; a B2B client its
 * price and GST lines per night (never the hotel's rate or the margin); MusafirBaba admins everything.
 * @param {PriceBreakdown} b
 * @param {'WEBSITE' | 'CLIENT' | 'ADMIN'} audience
 */
export function priceView(b, audience) {
  if (audience === 'ADMIN') return b;
  const t = b.totals;
  const head = {
    currency: b.currency,
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    rooms: b.rooms,
    nights: b.nights,
    totalPaise: t.totalPaise,
    gstPaise: t.gstPaise,
  };
  if (audience === 'WEBSITE') return head;
  return {
    ...head,
    sellPaise: t.sellPaise,
    cgstPaise: t.cgstPaise,
    sgstPaise: t.sgstPaise,
    igstPaise: t.igstPaise,
    feePaise: t.feePaise,
    nightly: b.lines.map((l) => ({
      date: l.date,
      room: l.room,
      sellPaise: l.sellPaise,
      gstPaise: l.gst.gstPaise,
      rateBps: l.gst.rateBps,
      sac: l.gst.sac,
    })),
  };
}
