// @ts-check
/** Stage 18 — bus service (new collections with the `bus_` prefix only, ADR-0016). */
import {
  CANCELLATION_POLICIES_COLLECTION,
  FARES_COLLECTION,
  LAYOUTS_COLLECTION,
  ROUTES_COLLECTION,
  SCHEDULES_COLLECTION,
  STOPS_COLLECTION,
  VEHICLES_COLLECTION,
} from '../modules/bus-catalog/index.js';
import { BOOKINGS_COLLECTION, OPS_CANCELLATIONS_COLLECTION } from '../modules/bus-booking/index.js';
import { CLAIMS_COLLECTION, TRIP_PROBLEMS_COLLECTION, TRIP_SEATS_COLLECTION, TRIPS_COLLECTION } from '../modules/bus-inventory/index.js';
import { BUS_LINES_COLLECTION, BUS_PAYABLES_COLLECTION, BUS_RUNS_COLLECTION } from '../modules/bus-payouts/index.js';

/** @type {import('../core/db/migrations.js').Migration[]} */
export const STAGE_18 = [
  {
    id: '0083-bus-layouts-vehicles',
    description: 'Bus layouts and buses: by operator, registration number unique, review queue',
    up: async (ctx) => {
      await ctx.createCollection(LAYOUTS_COLLECTION);
      await ctx.createIndex(LAYOUTS_COLLECTION, { operatorOrgId: 1, createdAt: 1 }, { name: 'operator' });
      await ctx.createCollection(VEHICLES_COLLECTION);
      await ctx.createIndex(
        VEHICLES_COLLECTION,
        { regNo: 1 },
        {
          name: 'reg_no_unique',
          unique: true,
          partialFilterExpression: { status: { $in: ['DRAFT', 'SUBMITTED', 'APPROVED', 'CHANGES_REQUESTED', 'SUSPENDED'] } },
        },
      );
      await ctx.createIndex(VEHICLES_COLLECTION, { operatorOrgId: 1, createdAt: 1 }, { name: 'operator' });
      await ctx.createIndex(VEHICLES_COLLECTION, { status: 1, updatedAt: 1 }, { name: 'review_queue' });
      await ctx.createIndex(
        VEHICLES_COLLECTION,
        { hasPendingEvents: 1 },
        { name: 'pending_events', partialFilterExpression: { hasPendingEvents: true } },
      );
    },
  },
  {
    id: '0084-bus-stops-routes-schedules-trips',
    description: 'Bus points, routes (review queue), schedules, trips (one per schedule and date) and trip seats (one per seat)',
    up: async (ctx) => {
      await ctx.createCollection(STOPS_COLLECTION);
      await ctx.createIndex(STOPS_COLLECTION, { operatorOrgId: 1, cityId: 1 }, { name: 'operator_city' });
      await ctx.createCollection(ROUTES_COLLECTION);
      await ctx.createIndex(ROUTES_COLLECTION, { operatorOrgId: 1, createdAt: -1 }, { name: 'operator' });
      await ctx.createIndex(ROUTES_COLLECTION, { status: 1, updatedAt: 1 }, { name: 'review_queue' });
      await ctx.createIndex(
        ROUTES_COLLECTION,
        { hasPendingEvents: 1 },
        { name: 'pending_events', partialFilterExpression: { hasPendingEvents: true } },
      );
      await ctx.createCollection(SCHEDULES_COLLECTION);
      await ctx.createIndex(SCHEDULES_COLLECTION, { operatorOrgId: 1, createdAt: -1 }, { name: 'operator' });
      await ctx.createIndex(SCHEDULES_COLLECTION, { status: 1 }, { name: 'status' });
      await ctx.createCollection(TRIPS_COLLECTION);
      await ctx.createIndex(TRIPS_COLLECTION, { scheduleId: 1, date: 1 }, { name: 'schedule_date_unique', unique: true });
      await ctx.createIndex(TRIPS_COLLECTION, { operatorOrgId: 1, date: 1 }, { name: 'operator_date' });
      await ctx.createIndex(TRIPS_COLLECTION, { 'stops.cityId': 1, date: 1 }, { name: 'search_stop_city' }); // part-route search (B5)
      await ctx.createIndex(
        TRIPS_COLLECTION,
        { scheduleId: 1, seatsReady: 1 },
        { name: 'seats_not_ready', partialFilterExpression: { seatsReady: false } },
      );
      await ctx.createCollection(TRIP_SEATS_COLLECTION);
      await ctx.createIndex(TRIP_SEATS_COLLECTION, { tripId: 1, no: 1 }, { name: 'trip_seat_unique', unique: true });
    },
  },
  {
    id: '0085-bus-seat-claims-fares',
    description: 'Seat claims (holds and counter blocks): by trip, and the sweeper queue; fares (one per route)',
    up: async (ctx) => {
      await ctx.createCollection(CLAIMS_COLLECTION);
      await ctx.createIndex(CLAIMS_COLLECTION, { tripId: 1, kind: 1, status: 1 }, { name: 'trip_kind_status' });
      await ctx.createIndex(CLAIMS_COLLECTION, { status: 1, expiresAt: 1 }, { name: 'sweeper' });
      await ctx.createIndex(CLAIMS_COLLECTION, { status: 1, createdAt: 1 }, { name: 'stuck' });
      await ctx.createCollection(FARES_COLLECTION);
      await ctx.createIndex(FARES_COLLECTION, { routeId: 1 }, { name: 'route_unique', unique: true });
    },
  },
  {
    id: '0086-bus-bookings',
    description: 'Bus bookings: one per order, PNR unique, by company and trip / date, by buyer, pending events',
    up: async (ctx) => {
      await ctx.createCollection(BOOKINGS_COLLECTION);
      await ctx.createIndex(BOOKINGS_COLLECTION, { orderId: 1 }, { name: 'order_unique', unique: true });
      await ctx.createIndex(BOOKINGS_COLLECTION, { ref: 1 }, { name: 'ref_unique', unique: true });
      await ctx.createIndex(BOOKINGS_COLLECTION, { operatorOrgId: 1, tripId: 1, status: 1 }, { name: 'operator_trip' });
      await ctx.createIndex(BOOKINGS_COLLECTION, { operatorOrgId: 1, date: 1 }, { name: 'operator_date' });
      await ctx.createIndex(
        BOOKINGS_COLLECTION,
        { clientOrgId: 1, createdAt: -1 },
        { name: 'client', partialFilterExpression: { clientOrgId: { $type: 'string' } } },
      );
      await ctx.createIndex(
        BOOKINGS_COLLECTION,
        { hasPendingEvents: 1 },
        { name: 'pending_events', partialFilterExpression: { hasPendingEvents: true } },
      );
    },
  },
  {
    id: '0087-bus-cancellations',
    description: 'Bus cancellation slabs (one per company), ops cancellations (queue), partial cancellations left pending (reconciler)',
    up: async (ctx) => {
      await ctx.createCollection(CANCELLATION_POLICIES_COLLECTION);
      await ctx.createIndex(CANCELLATION_POLICIES_COLLECTION, { operatorOrgId: 1 }, { name: 'operator_unique', unique: true });
      await ctx.createCollection(OPS_CANCELLATIONS_COLLECTION);
      await ctx.createIndex(OPS_CANCELLATIONS_COLLECTION, { status: 1, createdAt: -1 }, { name: 'queue' });
      await ctx.createIndex(
        BOOKINGS_COLLECTION,
        { 'parts.status': 1 },
        { name: 'parts_pending', partialFilterExpression: { 'parts.status': 'PENDING' } },
      );
    },
  },
  {
    id: '0088-bus-payouts-problems',
    description: 'Bus payables (one per booking), bus payout runs and lines, trip problems (ops queue), trips ended (completion)',
    up: async (ctx) => {
      await ctx.createCollection(BUS_PAYABLES_COLLECTION);
      await ctx.createIndex(BUS_PAYABLES_COLLECTION, { bookingId: 1 }, { name: 'booking_unique', unique: true });
      await ctx.createIndex(BUS_PAYABLES_COLLECTION, { status: 1, runId: 1, tripDate: 1 }, { name: 'due' });
      await ctx.createIndex(BUS_PAYABLES_COLLECTION, { operatorOrgId: 1, tripDate: -1 }, { name: 'operator' });
      await ctx.createCollection(BUS_RUNS_COLLECTION);
      await ctx.createIndex(BUS_RUNS_COLLECTION, { status: 1, createdAt: -1 }, { name: 'status' });
      await ctx.createCollection(BUS_LINES_COLLECTION);
      await ctx.createIndex(BUS_LINES_COLLECTION, { runId: 1 }, { name: 'run' });
      await ctx.createIndex(BUS_LINES_COLLECTION, { operatorOrgId: 1, paid: 1 }, { name: 'operator_paid' });
      await ctx.createCollection(TRIP_PROBLEMS_COLLECTION);
      await ctx.createIndex(TRIP_PROBLEMS_COLLECTION, { status: 1, createdAt: 1 }, { name: 'queue' });
      await ctx.createIndex(TRIP_PROBLEMS_COLLECTION, { operatorOrgId: 1, createdAt: -1 }, { name: 'operator' });
      await ctx.createIndex(
        TRIP_PROBLEMS_COLLECTION,
        { hasPendingEvents: 1 },
        { name: 'pending_events', partialFilterExpression: { hasPendingEvents: true } },
      );
      await ctx.createIndex(BOOKINGS_COLLECTION, { status: 1, 'to.at': 1 }, { name: 'completion' });
    },
  },
];
