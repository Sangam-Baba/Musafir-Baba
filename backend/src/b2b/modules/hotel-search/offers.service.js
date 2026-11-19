// @ts-check
/**
 * Offers and price check (S06-T05, S06-T06).
 * - `offers(caller, ref, stay)`: every sellable room type × plan of one hotel for the stay, priced for the caller's
 *   channel, as much of the breakdown as the caller may see (website: total + GST; B2B: price and GST lines per
 *   night — never the hotel rate or the margin), the cancellation sentence, and a **price token** per option.
 *   A hidden or unknown hotel → 404; no rooms → `soldOut: true`.
 * - `priceCheck(caller, token)`: the token says which stay was priced; rooms and price are worked out again now →
 *   `OK` with a fresh token, `PRICE_CHANGED` (old and new totals, fresh token) or `SOLD_OUT`. Booking (Stage 08)
 *   checks again — search and offers are advisory.
 */
import { NotFoundError } from '../../core/errors.js';
import { priceView } from '../pricing/index.js';
import { markupFor, priceOptions, withSellingPrice } from './search.service.js';

/**
 * @typedef {import('./domain/caller.js').SearchCaller} SearchCaller
 * @typedef {import('./search.service.js').SearchDeps} SearchDeps
 * @typedef {{ checkIn: string, checkOut: string, rooms: { adults: number, childrenAges: number[] }[] }} StayAsk
 * @typedef {{
 *   issue: (buyer: any, stay: any, breakdown: any) => Promise<{ token: string, expiresAt: Date, totalPaise: number }>,
 *   read: (token: string, buyer: any) => Promise<import('../pricing/domain/price-token.js').TokenPayload>,
 *   verifyAndReprice: (token: string, req: any) => Promise<{ status: 'SAME' | 'CHANGED', breakdown: any, quotedTotalPaise: number }>,
 * }} TokenDeps
 */

/** @param {SearchCaller} c */
const buyerOf = (c) => ({ channel: c.channel, clientOrgId: c.clientOrgId, customerId: c.customerId });

/**
 * One hotel's options for a stay, priced for the caller (with their breakdowns), or null when it isn't visible.
 * @param {SearchDeps} deps
 * @param {(orgId: string) => Promise<boolean>} gstOf
 * @param {{ caller: SearchCaller, where: { refs: string[] } | { ids: string[] }, stay: StayAsk }} a
 */
async function optionsFor(deps, gstOf, { caller, where, stay }) {
  const [p] = await deps.candidates({ channel: caller.catalogChannel, clientCategory: caller.clientCategory, where });
  if (!p) return null;
  const groups = stay.rooms.map((r) => ({ adults: r.adults, children: r.childrenAges.length }));
  const [found] = p.roomTypes.length
    ? await deps.availability({
        properties: [{ id: p.id, timeZone: p.timeZone, roomTypes: p.roomTypes }],
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        groups,
      })
    : [];
  const offers = found?.offers ?? [];
  const terms = await deps.planTerms(offers.map((o) => o.ratePlanId));
  const q = { checkIn: stay.checkIn, checkOut: stay.checkOut, rooms: stay.rooms };
  const options = offers.length ? await priceOptions(deps, { caller, p, offers, terms, q, gst: await gstOf(p.hotelOrgId) }) : [];
  return { p, options, terms, groups };
}

/** @param {StayAsk} stay */
const occupancies = (stay) => stay.rooms.map((r) => ({ adults: r.adults, children: r.childrenAges.length }));

/** @typedef {SearchDeps & { tokens: TokenDeps, gstOf: (orgId: string) => Promise<boolean> }} OffersDeps */

/**
 * @param {OffersDeps} deps
 * @param {SearchCaller} caller
 * @param {string} ref
 * @param {StayAsk} stay
 */
async function offersOf(deps, caller, ref, stay) {
  const found = await optionsFor(deps, deps.gstOf, { caller, where: { refs: [ref] }, stay });
  if (!found) throw new NotFoundError('HOTEL_NOT_FOUND');
  const { p, terms } = found;
  const markup = await markupFor(deps, caller);
  const options = found.options.map((o) => withSellingPrice(o, markup, p));
  const audience = caller.channel === 'WEBSITE' ? 'WEBSITE' : 'CLIENT';
  const offers = await Promise.all(
    options
      .sort((a, b) => a.totalPaise - b.totalPaise)
      .map(async (o) => {
        const stayKey = {
          propertyId: p.id,
          roomTypeId: o.roomTypeId,
          ratePlanId: o.ratePlanId,
          checkIn: stay.checkIn,
          checkOut: stay.checkOut,
          occupancies: occupancies(stay),
        };
        const signed = await deps.tokens.issue(buyerOf(caller), stayKey, o.breakdown);
        return {
          roomTypeId: o.roomTypeId,
          roomTypeName: o.roomTypeName,
          ratePlanId: o.ratePlanId,
          planName: o.planName,
          mealPlanKey: o.mealPlanKey,
          refundable: o.refundable,
          cancellation: terms.get(o.ratePlanId)?.cancellation ?? '',
          roomsLeft: Math.min(o.available, 5),
          price: priceView(o.breakdown, audience),
          // B2B clients: their own markup on top (display only — the token and the total stay MusafirBaba's price)
          ...(caller.clientOrgId ? { sellingPricePaise: o.sellingPricePaise ?? null } : {}),
          priceToken: signed.token,
          priceTokenExpiresAt: signed.expiresAt,
        };
      }),
  );
  return {
    property: { id: p.id, publicRef: p.publicRef, slug: p.slug, name: p.name },
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    channel: caller.channel,
    soldOut: offers.length === 0,
    offers,
  };
}

/**
 * The token re-checked now: which stay it priced, today's rooms and price for it, and whether the price is the same.
 * @param {OffersDeps} deps
 * @param {SearchCaller} caller
 * @param {string} token
 */
async function recheck(deps, caller, token) {
  const payload = await deps.tokens.read(token, buyerOf(caller));
  const stay = {
    checkIn: payload.checkIn,
    checkOut: payload.checkOut,
    rooms: payload.occupancies.map((o) => ({ adults: o.adults, childrenAges: Array(o.children).fill(0) })),
  };
  const found = await optionsFor(deps, deps.gstOf, { caller, where: { ids: [payload.propertyId] }, stay });
  const option = found?.options.find((o) => o.roomTypeId === payload.roomTypeId && o.ratePlanId === payload.ratePlanId);
  const stayKey = {
    propertyId: payload.propertyId,
    roomTypeId: payload.roomTypeId,
    ratePlanId: payload.ratePlanId,
    checkIn: payload.checkIn,
    checkOut: payload.checkOut,
    occupancies: payload.occupancies,
  };
  if (!found || !option) return { soldOut: /** @type {const} */ (true), payload, stayKey };
  const r = await deps.tokens.verifyAndReprice(token, { buyer: buyerOf(caller), stay: stayKey, fresh: option.breakdown });
  const fresh = await deps.tokens.issue(buyerOf(caller), stayKey, option.breakdown);
  // same total (e.g. a rule replaced by an identical one) is still OK for the buyer
  const same = r.status === 'SAME' || fresh.totalPaise === r.quotedTotalPaise;
  return { soldOut: /** @type {const} */ (false), payload, stayKey, found, option, r, fresh, same };
}

/**
 * @param {OffersDeps} deps
 * @param {SearchCaller} caller
 * @param {string} token
 */
async function priceCheckOf(deps, caller, token) {
  const c = await recheck(deps, caller, token);
  if (c.soldOut) return { status: 'SOLD_OUT', quotedTotalPaise: c.payload.totalPaise };
  const audience = caller.channel === 'WEBSITE' ? 'WEBSITE' : 'CLIENT';
  return {
    status: c.same ? 'OK' : 'PRICE_CHANGED',
    quotedTotalPaise: c.r.quotedTotalPaise,
    price: priceView(c.option.breakdown, audience),
    priceToken: c.fresh.token,
    priceTokenExpiresAt: c.fresh.expiresAt,
  };
}

/**
 * For the booking engine (Stage 08, internal): the same re-check, plus the full breakdown (hotel rate, margin, GST —
 * for the ledger and the invoice, never shown to the buyer) and the hotel facts the hold needs.
 * @param {OffersDeps} deps
 * @param {SearchCaller} caller
 * @param {string} token
 */
async function bookingQuoteOf(deps, caller, token) {
  const c = await recheck(deps, caller, token);
  if (c.soldOut) return { status: /** @type {const} */ ('SOLD_OUT'), stay: c.stayKey, quotedTotalPaise: c.payload.totalPaise };
  const audience = caller.channel === 'WEBSITE' ? 'WEBSITE' : 'CLIENT';
  return {
    status: c.same ? /** @type {const} */ ('OK') : /** @type {const} */ ('PRICE_CHANGED'),
    stay: c.stayKey,
    quotedTotalPaise: c.r.quotedTotalPaise,
    breakdown: c.option.breakdown,
    price: priceView(c.option.breakdown, audience),
    priceToken: c.fresh.token,
    priceTokenExpiresAt: c.fresh.expiresAt,
    property: { id: c.found.p.id, hotelOrgId: c.found.p.hotelOrgId, timeZone: c.found.p.timeZone },
    roomTypeName: c.found.p.roomTypes.find((rt) => rt.id === c.stayKey.roomTypeId)?.name ?? 'Room',
  };
}

/** @param {OffersDeps} deps */
export function createOffersService(deps) {
  return {
    /** @param {SearchCaller} caller @param {string} ref @param {StayAsk} stay */
    offers: (caller, ref, stay) => offersOf(deps, caller, ref, stay),
    /** @param {SearchCaller} caller @param {string} token */
    priceCheck: (caller, token) => priceCheckOf(deps, caller, token),
    /** @param {SearchCaller} caller @param {string} token */
    bookingQuote: (caller, token) => bookingQuoteOf(deps, caller, token),
  };
}
