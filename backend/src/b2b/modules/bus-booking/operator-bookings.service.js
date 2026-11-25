// @ts-check
/**
 * A bus company's bookings and trip manifests (plan Stage 18 B6): confirmed bookings by travel date or trip, and the
 * manifest for the conductor — every booked seat with its passenger (name, age, gender), boarding and getting-off
 * stop, PNR and the booker's phone. Own company only; other companies' trips → 404.
 */
import { NotFoundError } from '../../core/errors.js';
import { TripRecord } from '../bus-inventory/index.js';
import { BusBookingRecord } from './models/booking.model.js';

const SHOWN = ['CONFIRMED', 'CANCELLED', 'COMPLETED'];

/** @param {Record<string, any>} b */
const rowOf = (b) => ({
  bookingId: String(b._id),
  ref: b.ref,
  status: b.status,
  tripId: b.tripId,
  date: b.date,
  from: { name: b.from.name, at: b.from.at },
  to: { name: b.to.name, at: b.to.at },
  seats: b.seats,
  contact: { name: b.contact.name, phone: b.contact.phone },
  channel: b.channel,
  netPaise: b.price?.totals?.operatorPayablePaise ?? 0,
  confirmedAt: b.confirmedAt,
});

/** One CSV cell (quotes doubled, formulas neutralised). @param {unknown} v */
const cell = (v) => {
  const s = String(v ?? '');
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/**
 * @typedef {{ trip: { id: string, date: string, departAt: Date, stops: { name: string, at: Date }[], seatCount: number },
 *   rows: { seat: string, deck: string, name: string, age: number, gender: string, boarding: string, boardingAt: Date,
 *   dropping: string, pnr: string, phone: string }[] }} Manifest
 */

/** A bus company's bookings and manifests. */
export function createOperatorBookings() {
  return {
    /** @param {string} orgId @param {{ date?: string, tripId?: string }} q */
    async list(orgId, q) {
      const filter = {
        operatorOrgId: orgId,
        status: { $in: SHOWN },
        ...(q.date ? { date: q.date } : {}),
        ...(q.tripId ? { tripId: q.tripId } : {}),
      };
      return (await BusBookingRecord.find(filter).sort({ confirmedAt: -1 }).limit(500).lean()).map(rowOf);
    },
    /** The passenger list of a trip (confirmed seats, by seat number). @param {string} orgId @param {string} tripId @returns {Promise<Manifest>} */
    async manifest(orgId, tripId) {
      const t = /^[a-f0-9]{24}$/.test(tripId) ? await TripRecord.findOne({ _id: tripId, operatorOrgId: orgId }).lean() : null;
      if (!t) throw new NotFoundError('TRIP_NOT_FOUND');
      const bookings = await BusBookingRecord.find({ operatorOrgId: orgId, tripId, status: { $in: ['CONFIRMED', 'COMPLETED'] } }).lean();
      const rows = bookings
        .flatMap((b) =>
          b.seats.map((s) => ({
            seat: s.no,
            deck: s.deck,
            name: s.passenger?.name,
            age: s.passenger?.age,
            gender: s.passenger?.gender,
            boarding: b.from.name,
            boardingAt: b.from.at,
            dropping: b.to.name,
            pnr: b.ref,
            phone: b.contact.phone,
          })),
        )
        .sort((a, b) => String(a.seat).localeCompare(String(b.seat), undefined, { numeric: true }));
      return {
        trip: {
          id: tripId,
          date: t.date,
          departAt: t.departAt,
          stops: t.stops.map((s) => ({ name: s.name, at: s.at })),
          seatCount: t.seatCount,
        },
        rows: /** @type {Manifest['rows']} */ (/** @type {unknown} */ (rows)),
      };
    },
    /** @param {Manifest} m */
    manifestCsv(m) {
      const head = ['Seat', 'Deck', 'Passenger', 'Age', 'Gender', 'Boarding', 'Boarding time', 'Getting off', 'PNR', 'Phone'];
      const time = (/** @type {any} */ d) => new Date(new Date(d).getTime() + 330 * 60_000).toISOString().slice(11, 16);
      const lines = m.rows.map((r) =>
        [r.seat, r.deck, r.name, r.age, r.gender, r.boarding, time(r.boardingAt), r.dropping, r.pnr, r.phone].map(cell).join(','),
      );
      return [head.join(','), ...lines].join('\n') + '\n';
    },
  };
}
