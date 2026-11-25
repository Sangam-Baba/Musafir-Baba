// @ts-check
/**
 * Bus search and seat map for buyers (plan Stage 18 B5). Read only.
 * - A trip is offered only when it is scheduled, its seats are ready, online sale is open, its route is approved, its
 *   bus is approved with valid papers today, and its operator company is active.
 * - Prices: the operator's fare for the journey (stop pair × seat type × deck, date rules) → margin (BUS rules) → GST
 *   (`BUS_TRANSPORT` rule). A seat class with no fare, no margin rule or no tax rule is simply not offered — never
 *   priced at a guess. The buyer never sees the net fare or the margin (website: price with GST; client: + GST lines).
 * - Seats free for the journey: `taken` has none of its legs (part-route).
 */
import { DomainError, NotFoundError } from '../../core/errors.js';
import { systemScope } from '../../core/db/tenant-plugin.js';
import { addDays, fareFor, FareRecord, legMask, RouteRecord, sellable, VehicleRecord } from '../bus-catalog/index.js';
import { journeyLegs, TripRecord, TripSeatRecord } from '../bus-inventory/index.js';
import { createQuoteService } from '../pricing/index.js';
import { busBreakdown, busPriceView } from './domain/price.js';
import { istDate, journeyOn, passes, sorter } from './domain/search.js';

const SCOPE = systemScope('bus-booking: search (published trips only)', { routine: true });
const MAX_TRIPS = 300;

/**
 * @typedef {{ channel: 'WEBSITE' | 'B2B_PORTAL' | 'B2B_API', clientOrgId: string | null, clientCategory: string | null }} Caller
 * @typedef {import('../pricing/domain/quote.js').QuoteData} PricingNow rules, tax rules, settings and the moment of pricing
 * @typedef {{ clock: import('../../core/clock.js').Clock,
 *   operators: (ids: string[]) => Promise<Map<string, { name: string, active: boolean }>>,
 *   stateOf: (cityId: string) => Promise<string | null> }} SearchDeps
 */

/** Routes, buses, operators and fares for some trips, keeping only what may be sold today. @param {SearchDeps} deps @param {Record<string, any>[]} trips @param {string} today */
async function sellableContext(deps, trips, today) {
  const ids = (/** @type {(t: any) => string} */ f) => [...new Set(trips.map(f))];
  const [routes, buses, fares, operators] = await Promise.all([
    RouteRecord.find({ _id: { $in: ids((t) => t.routeId) }, status: 'APPROVED' }, { _id: 1 })
      .setOptions(SCOPE)
      .lean(),
    VehicleRecord.find({ _id: { $in: ids((t) => t.vehicleId) } })
      .setOptions(SCOPE)
      .lean(),
    FareRecord.find({ routeId: { $in: ids((t) => t.routeId) } })
      .setOptions(SCOPE)
      .lean(),
    deps.operators(ids((t) => t.operatorOrgId)),
  ]);
  return {
    routeOk: new Set(routes.map((r) => String(r._id))),
    buses: new Map(buses.filter((b) => sellable(/** @type {any} */ (b), today)).map((b) => [String(b._id), b])),
    fares: new Map(fares.map((f) => [f.routeId, f])),
    operators,
  };
}

/** @param {Awaited<ReturnType<typeof sellableContext>>} c @param {Record<string, any>} t */
const offered = (c, t) =>
  c.routeOk.has(t.routeId) && c.buses.has(t.vehicleId) && c.operators.get(t.operatorOrgId)?.active === true && c.fares.has(t.routeId);

/**
 * Price one seat of each class (seat type × deck) on a journey; classes that can't be priced are left out.
 * @param {PricingNow} data
 * @param {{ trip: Record<string, any>, fare: any, fromIdx: number, toIdx: number, caller: Caller, placeOfSupply: string, classes: { seatType: string, deck: string }[], audience: 'WEBSITE' | 'CLIENT' }} a
 */
function priceClasses(data, a) {
  /** @type {Map<string, { totalPaise: number, view: unknown }>} */
  const out = new Map();
  for (const c of a.classes) {
    const net = fareFor(a.fare, { fromIdx: a.fromIdx, toIdx: a.toIdx, seatType: c.seatType, deck: c.deck, date: a.trip.date });
    if (!net) continue;
    try {
      const b = busBreakdown(data, {
        ctx: { ...a.caller, operatorOrgId: a.trip.operatorOrgId, routeId: a.trip.routeId, cityId: a.trip.stops[a.fromIdx]?.cityId },
        date: a.trip.date,
        placeOfSupply: a.placeOfSupply,
        seats: [{ no: '-', ...c, netPaise: net.netPaise }],
      });
      out.set(`${c.seatType}:${c.deck}`, { totalPaise: b.totals.totalPaise, view: busPriceView(b, a.audience) });
    } catch (err) {
      if (!(err instanceof DomainError)) throw err; // no margin / tax rule → the class isn't offered
    }
  }
  return out;
}

/** Distinct classes of some seats. @param {{ type: string, deck: string }[]} seats */
const classesOf = (seats) => [...new Map(seats.map((s) => [`${s.type}:${s.deck}`, { seatType: s.type, deck: s.deck }])).values()];

/** @param {Caller} caller */
const audienceOf = (caller) => (caller.channel === 'WEBSITE' ? 'WEBSITE' : 'CLIENT');

/**
 * One search result, or null when nothing on it can be sold.
 * @param {{ deps: SearchDeps, c: any, data: PricingNow }} env @param {Record<string, any>} t @param {any} q
 */
async function resultFor({ deps, c, data }, t, q) {
  const j = journeyOn(t.stops, { ...q, now: data.now });
  if (!j) return null;
  const [b, d] = /** @type {[import('./domain/search.js').Point, import('./domain/search.js').Point]} */ ([j.boarding[0], j.dropping[0]]);
  const placeOfSupply = await deps.stateOf(t.stops[b.idx].cityId);
  if (!placeOfSupply) return null;
  const free = await TripSeatRecord.find({ tripId: String(t._id), taken: { $bitsAllClear: legMask(b.idx, d.idx) } }, { type: 1, deck: 1 })
    .setOptions(SCOPE)
    .lean();
  const prices = priceClasses(data, {
    trip: t,
    fare: c.fares.get(t.routeId),
    fromIdx: b.idx,
    toIdx: d.idx,
    caller: q.caller,
    placeOfSupply,
    classes: classesOf(free),
    audience: audienceOf(q.caller),
  });
  const sellableSeats = free.filter((s) => prices.has(`${s.type}:${s.deck}`));
  if (!sellableSeats.length) return null;
  const bus = c.buses.get(t.vehicleId);
  return {
    tripId: String(t._id),
    operatorOrgId: t.operatorOrgId,
    operatorName: c.operators.get(t.operatorOrgId)?.name ?? '',
    bus: { name: bus.name, acType: bus.acType, kind: bus.kind, amenities: bus.amenities },
    acType: bus.acType,
    boardingPoints: j.boarding,
    droppingPoints: j.dropping,
    departAt: b.at,
    arriveAt: d.at,
    durationMinutes: Math.round((new Date(d.at).getTime() - new Date(b.at).getTime()) / 60_000),
    seatsLeft: sellableSeats.length,
    seatTypes: [...new Set(sellableSeats.map((s) => s.type))],
    fromPricePaise: Math.min(...[...prices.values()].map((p) => p.totalPaise)),
  };
}

/**
 * A trip's seat map for one journey: every seat with whether it can be picked and its price.
 * @param {SearchDeps} deps @param {PricingNow} data @param {{ tripId: string, fromStopId: string, toStopId: string, caller: Caller }} q
 */
async function seatMap(deps, data, q) {
  const t = /^[a-f0-9]{24}$/.test(q.tripId) ? await TripRecord.findOne({ _id: q.tripId }).setOptions(SCOPE).lean() : null;
  if (!t || t.status !== 'SCHEDULED' || t.saleStopped || !t.seatsReady) throw new NotFoundError('TRIP_NOT_FOUND');
  const c = await sellableContext(deps, [t], istDate(data.now));
  if (!offered(c, t)) throw new NotFoundError('TRIP_NOT_FOUND');
  const legs = journeyLegs(t.stops, q.fromStopId, q.toStopId);
  if (!legs.ok) throw new DomainError(legs.code);
  const [from, to] = /** @type {[any, any]} */ ([t.stops[legs.fromIdx], t.stops[legs.toIdx]]);
  if (new Date(from.at).getTime() <= data.now.getTime()) throw new DomainError('TRIP_DEPARTED');
  const placeOfSupply = await deps.stateOf(from.cityId);
  if (!placeOfSupply) throw new NotFoundError('TRIP_NOT_FOUND');
  const seats = await TripSeatRecord.find({ tripId: q.tripId }).setOptions(SCOPE).lean();
  const prices = priceClasses(data, {
    trip: t,
    fare: c.fares.get(t.routeId),
    ...legs,
    caller: q.caller,
    placeOfSupply,
    classes: classesOf(seats),
    audience: audienceOf(q.caller),
  });
  const decks = t.decks.map((d) => ({
    deck: d.deck,
    rows: d.rows,
    cols: d.cols,
    seats: seats
      .filter((s) => s.deck === d.deck)
      .map((s) => {
        const price = prices.get(`${s.type}:${s.deck}`);
        return {
          no: s.no,
          type: s.type,
          ladies: s.ladies,
          row: s.row,
          col: s.col,
          span: s.span,
          available: Boolean(price) && (s.taken & legs.mask) === 0,
          price: price?.view ?? null,
        };
      }),
  }));
  return {
    tripId: q.tripId,
    from: { stopId: q.fromStopId, name: from.name, at: from.at },
    to: { stopId: q.toStopId, name: to.name, at: to.at },
    decks,
  };
}

/** @param {SearchDeps} deps */
export function createBusSearch(deps) {
  const quotes = createQuoteService({ clock: deps.clock });
  const pricing = async () => ({ ...(await quotes.data()), now: deps.clock.now() });

  return {
    /**
     * Trips from city A to city B on a date (Indian time), filtered and sorted.
     * @param {{ fromCityId: string, toCityId: string, date: string, caller: Caller, filters?: import('./domain/search.js').SearchFilters, sort?: 'departure' | 'price' }} q
     */
    async search(q) {
      if (q.fromCityId === q.toCityId) throw new DomainError('FROM_TO_SAME_CITY');
      const data = await pricing();
      const today = istDate(data.now);
      if (q.date < today || q.date > addDays(today, 120)) throw new DomainError('TRAVEL_DATE_INVALID');
      const trips = await TripRecord.find({
        'stops.cityId': { $all: [q.fromCityId, q.toCityId] },
        date: { $gte: addDays(q.date, -3), $lte: q.date },
        status: 'SCHEDULED',
        saleStopped: { $ne: true },
        seatsReady: true,
      })
        .setOptions(SCOPE)
        .limit(MAX_TRIPS)
        .lean();
      const c = await sellableContext(deps, trips, today);
      const results = [];
      for (const t of trips.filter((x) => offered(c, x))) {
        const r = await resultFor({ deps, c, data }, t, q);
        if (r) results.push(r);
      }
      return results.filter((r) => passes(r, q.filters ?? {})).sort(sorter(q.sort ?? 'departure'));
    },

    /**
     * A trip's seat map for one journey: every seat with whether it can be picked and its price.
     * @param {{ tripId: string, fromStopId: string, toStopId: string, caller: Caller }} q
     */
    seatMap: async (q) => seatMap(deps, await pricing(), q),
  };
}
