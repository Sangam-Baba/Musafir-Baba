// @ts-check
/**
 * Trips (plan Stage 18 B3). The trip job (every 6 hours while `B2B_BUS_ENABLED`) makes trips `HORIZON_DAYS` ahead for
 * every active schedule whose route and bus are approved, and one seat document per layout seat:
 *   - a trip is inserted only if missing (unique schedule + date, `$setOnInsert`) — running twice changes nothing;
 *   - seats are inserted unordered (duplicates ignored), then `seatsReady` is set — a crash in between is finished by
 *     the next run;
 *   - for ended schedules, trips from the end day with no seat taken are cancelled (sold ones stay for ops — owner
 *     decision: operator trip cancellations are handled by ops by hand).
 * Booking code (B4 / B6) must re-check the trip status after taking seats and give them back if it was cancelled.
 */
import { systemScope } from '../../core/db/tenant-plugin.js';
import { NotFoundError } from '../../core/errors.js';
import { instantOf, tripDates } from '../bus-catalog/index.js';
import { TripRecord } from './models/trip.model.js';
import { TripSeatRecord } from './models/trip-seat.model.js';

export const HORIZON_DAYS = 90;
const MAX_NEW_TRIPS_PER_RUN = 3000;
const SCOPE = systemScope('bus-inventory: trip job', { routine: true });

/**
 * @typedef {{ schedule: { id: string, operatorOrgId: string, weekdays: number[], validFrom: string, validTo: string | null },
 *   route: { id: string, stops: { stopId: string, cityId: string, name: string, dayOffset: number, time: string, boarding: boolean, dropping: boolean }[] },
 *   vehicle: { id: string, layoutId: string, decks: { deck: string, rows: number, cols: number,
 *     seats: { no: string, type: string, row: number, col: number, span?: number, ladies?: boolean }[] }[] } }} TripSource
 * @typedef {{ today: () => string, catalog: { forTrips: () => Promise<TripSource[]>, ended: () => Promise<{ scheduleId: string, from: string }[]> } }} TripDeps
 */

/** @param {Record<string, any>} t */
export const tripDto = (t) => ({
  id: String(t._id),
  scheduleId: t.scheduleId,
  routeId: t.routeId,
  vehicleId: t.vehicleId,
  layoutId: t.layoutId,
  date: t.date,
  stops: t.stops.map((/** @type {any} */ s) => ({
    stopId: s.stopId,
    cityId: s.cityId,
    name: s.name,
    at: s.at,
    boarding: s.boarding,
    dropping: s.dropping,
  })),
  departAt: t.departAt,
  arriveAt: t.arriveAt,
  seatCount: t.seatCount,
  status: t.status,
  cancelReason: t.cancelReason,
});

/** The new trip document for one date. @param {TripSource} src @param {string} date */
function tripDoc(src, date) {
  const stops = src.route.stops.map((s) => ({
    stopId: s.stopId,
    cityId: s.cityId,
    name: s.name,
    at: instantOf(date, s),
    boarding: s.boarding,
    dropping: s.dropping,
  }));
  return {
    operatorOrgId: src.schedule.operatorOrgId,
    routeId: src.route.id,
    vehicleId: src.vehicle.id,
    layoutId: src.vehicle.layoutId,
    stops,
    fromCityId: stops[0]?.cityId,
    toCityId: stops[stops.length - 1]?.cityId,
    departAt: stops[0]?.at,
    arriveAt: stops[stops.length - 1]?.at,
    legs: stops.length - 1,
    decks: src.vehicle.decks.map((d) => ({ deck: d.deck, rows: d.rows, cols: d.cols })),
    seatCount: src.vehicle.decks.reduce((n, d) => n + d.seats.length, 0),
    seatsReady: false,
    status: 'SCHEDULED',
  };
}

/** Every seat document exists → `seatsReady`. @param {Record<string, any>} trip @param {TripSource['vehicle']} vehicle */
async function makeSeats(trip, vehicle) {
  const seats = vehicle.decks.flatMap((d) =>
    d.seats.map((s) => ({
      operatorOrgId: trip.operatorOrgId,
      tripId: String(trip._id),
      no: s.no,
      deck: d.deck,
      type: s.type,
      ladies: Boolean(s.ladies),
      row: s.row,
      col: s.col,
      span: s.span ?? 1,
      taken: 0,
    })),
  );
  try {
    await TripSeatRecord.insertMany(seats, { ordered: false });
  } catch (err) {
    const e = /** @type {{ code?: number, writeErrors?: { code?: number }[] }} */ (err);
    const onlyDuplicates = e.code === 11000 || (e.writeErrors ?? []).every((w) => w.code === 11000);
    if (!onlyDuplicates) throw err;
  }
  await TripRecord.updateOne({ _id: trip._id }, { $set: { seatsReady: true } }).setOptions(SCOPE);
}

/** Trips (and seats) for one schedule; returns how many trips were new. @param {TripSource} src @param {string} today @param {number} budget */
async function generateFor(src, today, budget) {
  const dates = tripDates(src.schedule, today, HORIZON_DAYS);
  const have = await TripRecord.find({ scheduleId: src.schedule.id, date: { $in: dates } }, { date: 1, seatsReady: 1 })
    .setOptions(SCOPE)
    .lean();
  const known = new Set(have.map((t) => t.date));
  let made = 0;
  for (const date of dates) {
    if (known.has(date) || made >= budget) continue;
    const res = await TripRecord.updateOne(
      { scheduleId: src.schedule.id, date },
      { $setOnInsert: tripDoc(src, date) }, // schedule id and date come from the filter
      { upsert: true },
    ).setOptions(SCOPE);
    made += res.upsertedCount;
  }
  const unfinished = await TripRecord.find({ scheduleId: src.schedule.id, seatsReady: false, status: 'SCHEDULED' })
    .setOptions(SCOPE)
    .limit(budget + 10)
    .lean();
  for (const trip of unfinished) await makeSeats(trip, src.vehicle);
  return made;
}

/** Cancels trips of an ended schedule from `from` that have no seat taken. @param {string} scheduleId @param {string} from */
export async function cancelUnsold(scheduleId, from) {
  const trips = await TripRecord.find({ scheduleId, date: { $gte: from }, status: 'SCHEDULED' }, { _id: 1 })
    .setOptions(SCOPE)
    .limit(1000)
    .lean();
  let cancelled = 0;
  for (const t of trips) {
    if (await TripSeatRecord.exists({ tripId: String(t._id), taken: { $ne: 0 } }).setOptions(SCOPE)) continue;
    const res = await TripRecord.updateOne(
      { _id: t._id, status: 'SCHEDULED' },
      { $set: { status: 'CANCELLED', cancelReason: 'SCHEDULE_ENDED' } },
    ).setOptions(SCOPE);
    cancelled += res.modifiedCount;
  }
  return cancelled;
}

/** @param {TripDeps} deps */
export function createTrips(deps) {
  return {
    /** The trip job (repeat-safe; small: at most `MAX_NEW_TRIPS_PER_RUN` new trips a run). */
    async generate() {
      const today = deps.today();
      let made = 0;
      for (const src of await deps.catalog.forTrips()) made += await generateFor(src, today, MAX_NEW_TRIPS_PER_RUN - made);
      let cancelled = 0;
      for (const e of await deps.catalog.ended()) cancelled += await cancelUnsold(e.scheduleId, e.from);
      return { made, cancelled };
    },
    cancelUnsold,
    /** @param {string} orgId @param {{ from: string, to: string, routeId?: string }} q */
    async list(orgId, q) {
      const filter = { operatorOrgId: orgId, date: { $gte: q.from, $lte: q.to }, ...(q.routeId ? { routeId: q.routeId } : {}) };
      return (await TripRecord.find(filter).sort({ departAt: 1 }).limit(1000).lean()).map(tripDto);
    },
    /** A trip with its seat map (the grid and positions copied when the trip was made) and each seat's taken legs. @param {string} orgId @param {string} id */
    async get(orgId, id) {
      const t = /^[a-f0-9]{24}$/.test(id) ? await TripRecord.findOne({ _id: id, operatorOrgId: orgId }).lean() : null;
      if (!t) throw new NotFoundError('TRIP_NOT_FOUND');
      const seats = await TripSeatRecord.find({ tripId: id, operatorOrgId: orgId }).lean();
      const decks = t.decks.map((d) => ({
        deck: d.deck,
        rows: d.rows,
        cols: d.cols,
        seats: seats
          .filter((s) => s.deck === d.deck)
          .map((s) => ({ no: s.no, type: s.type, ladies: s.ladies, row: s.row, col: s.col, span: s.span, taken: s.taken })),
      }));
      return { ...tripDto(t), decks };
    },
  };
}
