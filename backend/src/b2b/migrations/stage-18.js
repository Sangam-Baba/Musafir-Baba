// @ts-check
/** Stage 18 — bus service (new collections with the `bus_` prefix only, ADR-0016). */
import {
  FARES_COLLECTION,
  LAYOUTS_COLLECTION,
  ROUTES_COLLECTION,
  SCHEDULES_COLLECTION,
  STOPS_COLLECTION,
  VEHICLES_COLLECTION,
} from '../modules/bus-catalog/index.js';
import { CLAIMS_COLLECTION, TRIP_SEATS_COLLECTION, TRIPS_COLLECTION } from '../modules/bus-inventory/index.js';

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
];
