// @ts-check
/** Stage 18 B8 — the bus endpoints of the B2B API document (merged into `openapi.json`). */
import { IDEMPOTENCY, json, ok, op, REF } from './openapi.js';

const ID = (/** @type {string} */ name, /** @type {string} */ what) => ({
  name,
  in: 'path',
  required: true,
  description: what,
  schema: { type: 'string' },
});
const Q = (/** @type {string} */ name, /** @type {string} */ what, required = false) => ({
  name,
  in: 'query',
  required,
  description: what,
  schema: { type: 'string' },
});

/** Search endpoints. */
const searchPaths = () => ({
  '/buses/search': {
    get: op('bus:search', 'Search buses from city A to city B on a date', {
      parameters: [
        Q('from', 'City id', true),
        Q('to', 'City id', true),
        Q('date', 'YYYY-MM-DD (Indian time)', true),
        Q('ac', 'AC | NON_AC'),
        Q('seatType', 'SEATER | SEMI_SLEEPER | SLEEPER'),
        Q('sort', 'departure | price'),
      ],
      responses: { 200: ok('Trips with boarding / dropping points, seats left and the lowest B2B price (incl. GST, paise)') },
    }),
  },
  '/buses/trips/{id}/seats': {
    get: op('bus:search', 'Seat map of a trip for your journey', {
      parameters: [ID('id', 'Trip id'), Q('from', 'Boarding stop id', true), Q('to', 'Getting-off stop id', true)],
      responses: { 200: ok('Decks with every seat: available, ladies-only, price (incl. GST)') },
    }),
  },
});

/** Booking and cancelling. */
const bookPaths = () => ({
  '/client/bus-orders': {
    post: op('bus:book', 'Book bus seats (holds them 15 minutes; pay next with /client/orders/{ref}/pay)', {
      parameters: [IDEMPOTENCY],
      requestBody: json({
        type: 'object',
        required: ['tripId', 'fromStopId', 'toStopId', 'seats', 'contact'],
        properties: {
          tripId: { type: 'string' },
          fromStopId: { type: 'string' },
          toStopId: { type: 'string' },
          seats: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                no: { type: 'string' },
                passenger: {
                  type: 'object',
                  properties: { name: { type: 'string' }, age: { type: 'integer' }, gender: { type: 'string', enum: ['F', 'M', 'O'] } },
                },
              },
            },
          },
          contact: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' } } },
          expectedTotalPaise: {
            type: 'integer',
            description: 'The total you showed — a different server price is refused (PRICE_CHANGED)',
          },
          customerReference: { type: 'string' },
        },
      }),
      responses: { 201: ok('The order (`ref`, status AWAITING_PAYMENT, the bus item with its PNR)') },
    }),
  },
  '/bookings/buses/{ref}/cancel-quote': {
    get: op('bus:book', 'What cancelling some seats costs now', {
      parameters: [REF('PNR (MBB-…)'), Q('seats', 'Seat numbers, comma separated', true)],
      responses: { 200: ok('Charge and refund at the slabs the ticket was sold with') },
    }),
  },
  '/bookings/buses/{ref}/cancel': {
    post: op('bus:book', 'Cancel some or all seats', {
      parameters: [REF('PNR (MBB-…)'), IDEMPOTENCY],
      requestBody: json({
        type: 'object',
        required: ['seats', 'expectedRefundPaise'],
        properties: { seats: { type: 'array', items: { type: 'string' } }, expectedRefundPaise: { type: 'integer' } },
      }),
      responses: { 200: ok('Cancelled; the refund goes back to your wallet (a `bus_booking.cancelled` webhook follows)') },
    }),
  },
});

/** Built when the document is built (the helpers come from openapi.js, which imports this file). */
export const busPaths = () => ({ ...searchPaths(), ...bookPaths() });
