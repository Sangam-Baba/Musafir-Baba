// @ts-check
/**
 * Bus price build-up (plan Stage 18 B5) — pure, built from the shared pricing pieces (no change to how hotels price):
 *   operator's net fare per seat → margin (winning BUS rule; "per night" amounts are per seat) → sell
 *   → GST on sell (`BUS_TRANSPORT` tax rule — CA to confirm the rate; none → not sellable) → totals.
 * Place of supply = the state where the passenger boards (passenger transport). Each seat is rounded to the paisa;
 * totals are sums. A per-booking fee (if a BUS rule has one) is added once, taxed at the first seat's rate.
 * Principal model like hotels (owner decision); the operator is paid its net fare.
 */
import { DomainError } from '../../../core/errors.js';
import { bookingFee, findTaxRule, issuerFor, nightMargin, splitGst } from '../../pricing/index.js';

export const BUS_BREAKDOWN_VERSION = 1;

/**
 * @typedef {{ no: string, seatType: string, deck: string, netPaise: number }} NetSeat
 * @typedef {{ channel: 'WEBSITE' | 'B2B_PORTAL' | 'B2B_API', clientOrgId?: string | null, clientCategory?: string | null,
 *   operatorOrgId: string, routeId: string, cityId?: string | null }} BusPriceContext
 * @typedef {{ rules: readonly any[], taxRules: readonly any[], settings: { model: string, issuers: any[] }, now: Date }} BusPriceData
 * @typedef {{ ctx: BusPriceContext, date: string, placeOfSupply: string, seats: NetSeat[] }} BusPriceInput
 */

/** One seat's line. @param {BusPriceData} data @param {BusPriceInput} q @param {NetSeat} s */
function seatLine(data, q, s) {
  if (!Number.isSafeInteger(s.netPaise) || s.netPaise < 1) throw new DomainError('NOT_SELLABLE', { reason: 'NO_FARE', seat: s.no });
  const ctx = { ...q.ctx, productType: /** @type {const} */ ('BUS') };
  const { ruleId, marginPaise } = nightMargin(data.rules, ctx, { date: q.date, now: data.now, netPaise: s.netPaise });
  const sellPaise = s.netPaise + marginPaise;
  const rule = findTaxRule(data.taxRules, { appliesTo: 'BUS_TRANSPORT', valuePaise: sellPaise, date: q.date });
  const issuer = issuerFor(data.settings.issuers, q.placeOfSupply);
  const intraState = issuer.stateCode === q.placeOfSupply;
  return {
    no: s.no,
    seatType: s.seatType,
    deck: s.deck,
    netPaise: s.netPaise,
    marginPaise,
    ruleId,
    sellPaise,
    gst: { taxRuleKey: rule.key, sac: rule.sac, rateBps: rule.rateBps, intraState, ...splitGst(sellPaise, rule.rateBps, intraState) },
  };
}

/**
 * The full breakdown for some seats on one journey.
 * @param {BusPriceData} data @param {BusPriceInput} q
 */
export function busBreakdown(data, q) {
  if (data.settings.model !== 'PRINCIPAL') throw new DomainError('PRICING_MODEL_NOT_BUILT', { model: data.settings.model });
  if (!q.seats.length) throw new DomainError('NOT_SELLABLE', { reason: 'NO_SEATS' });
  const lines = q.seats.map((s) => seatLine(data, q, s));
  const first = /** @type {(typeof lines)[number]} */ (lines[0]);
  const feeRule = bookingFee(data.rules, { ...q.ctx, productType: 'BUS' }, { date: q.date, now: data.now });
  const fee =
    feeRule && feeRule.marginPaise > 0
      ? {
          ruleId: feeRule.ruleId,
          sellPaise: feeRule.marginPaise,
          ...splitGst(feeRule.marginPaise, first.gst.rateBps, first.gst.intraState),
        }
      : null;
  const sum = (/** @type {(l: (typeof lines)[number]) => number} */ f) => lines.reduce((t, l) => t + f(l), 0);
  const gst = (/** @type {'cgstPaise' | 'sgstPaise' | 'igstPaise'} */ k) => sum((l) => l.gst[k]) + (fee?.[k] ?? 0);
  const [cgstPaise, sgstPaise, igstPaise] = [gst('cgstPaise'), gst('sgstPaise'), gst('igstPaise')];
  const sellPaise = sum((l) => l.sellPaise) + (fee?.sellPaise ?? 0);
  const netPaise = sum((l) => l.netPaise);
  return {
    version: BUS_BREAKDOWN_VERSION,
    model: data.settings.model,
    channel: q.ctx.channel,
    currency: /** @type {const} */ ('INR'),
    date: q.date,
    placeOfSupply: q.placeOfSupply,
    lines,
    fee,
    totals: {
      netPaise,
      marginPaise: sellPaise - netPaise,
      feePaise: fee?.sellPaise ?? 0,
      sellPaise,
      cgstPaise,
      sgstPaise,
      igstPaise,
      gstPaise: cgstPaise + sgstPaise + igstPaise,
      totalPaise: sellPaise + cgstPaise + sgstPaise + igstPaise,
      operatorPayablePaise: netPaise,
    },
    ruleIds: [...new Set([...lines.map((l) => l.ruleId), ...(fee ? [fee.ruleId] : [])])].sort(),
  };
}

/**
 * What each audience may see: website — the price with GST; a B2B client — also the sell price and GST per seat; never
 * the operator's net fare or MusafirBaba's margin outside admin.
 * @param {ReturnType<typeof busBreakdown>} b @param {'WEBSITE' | 'CLIENT' | 'ADMIN'} audience
 */
export function busPriceView(b, audience) {
  if (audience === 'ADMIN') return b;
  const head = { currency: b.currency, totalPaise: b.totals.totalPaise, gstPaise: b.totals.gstPaise };
  if (audience === 'WEBSITE') return head;
  return {
    ...head,
    sellPaise: b.totals.sellPaise,
    feePaise: b.totals.feePaise,
    seats: b.lines.map((l) => ({ no: l.no, sellPaise: l.sellPaise, gstPaise: l.gst.gstPaise, rateBps: l.gst.rateBps, sac: l.gst.sac })),
  };
}
