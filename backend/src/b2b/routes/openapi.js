// @ts-check
/**
 * The client API description (plan Stage 14 §3.6): OpenAPI 3.1 of the endpoints a client's software uses with an API
 * key — search → offers → price check → book → pay → read → cancel, the wallet, webhooks. Served at
 * `GET /api/v1/openapi.json` (public, cached 10 minutes). The guides live on the website (/business/developers/docs).
 */
import { publicRoute } from '../core/http/permissions.js';
import { SCOPES } from '../modules/api-access/index.js';
import { WEBHOOK_EVENTS } from '../modules/webhooks/index.js';

const ref = (/** @type {string} */ name) => ({ $ref: `#/components/schemas/${name}` });
const json = (/** @type {object} */ schema) => ({ content: { 'application/json': { schema } } });
const ok = (/** @type {string} */ description, /** @type {object} */ schema = { type: 'object' }) => ({ description, ...json(schema) });
const ERRORS = {
  400: { $ref: '#/components/responses/Problem' },
  401: { $ref: '#/components/responses/Problem' },
  403: { $ref: '#/components/responses/Problem' },
  404: { $ref: '#/components/responses/Problem' },
  409: { $ref: '#/components/responses/Problem' },
  422: { $ref: '#/components/responses/Problem' },
  429: { $ref: '#/components/responses/Problem' },
};
const IDEMPOTENCY = {
  name: 'Idempotency-Key',
  in: 'header',
  required: true,
  description: '16–64 characters [A-Za-z0-9_-]. Retry with the same key and body → the same answer, never a second booking.',
  schema: { type: 'string' },
};
const REF = (/** @type {string} */ what) => ({ name: 'ref', in: 'path', required: true, description: what, schema: { type: 'string' } });

/** @param {string} scope @param {string} summary @param {Record<string, any>} more */
const op = (scope, summary, more) => ({
  summary,
  description: `Scope: \`${scope}\`.`,
  security: [{ apiKey: [] }],
  ...more,
  responses: { ...(more.responses ?? {}), ...ERRORS },
});

const SCHEMAS = {
  Rooms: {
    type: 'array',
    minItems: 1,
    maxItems: 9,
    items: {
      type: 'object',
      required: ['adults'],
      properties: {
        adults: { type: 'integer', minimum: 1, maximum: 8 },
        childrenAges: { type: 'array', items: { type: 'integer', minimum: 0, maximum: 17 }, maxItems: 4 },
      },
    },
  },
  Stay: {
    type: 'object',
    required: ['checkIn', 'checkOut', 'rooms'],
    properties: { checkIn: { type: 'string', format: 'date' }, checkOut: { type: 'string', format: 'date' }, rooms: ref('Rooms') },
  },
  Problem: {
    type: 'object',
    description: 'RFC 9457 problem details. Act on `code`; `title` is for people.',
    properties: {
      type: { type: 'string' },
      title: { type: 'string' },
      status: { type: 'integer' },
      code: { type: 'string', example: 'API_KEY_INVALID' },
      requestId: { type: 'string' },
    },
  },
  WebhookEvent: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'evt_3f1c…' },
      type: { type: 'string', enum: [...WEBHOOK_EVENTS] },
      apiVersion: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
      data: { type: 'object' },
    },
  },
};

const PATHS = {
  '/hotels/search': {
    post: op('hotel:search', 'Search hotels', {
      requestBody: json({
        allOf: [ref('Stay')],
        properties: {
          destination: { type: 'object', description: '{ type: CITY | AREA | PROPERTY, id }' },
          propertyRefs: { type: 'array', items: { type: 'string' } },
          sort: { type: 'string' },
          cursor: { type: 'string' },
          limit: { type: 'integer', maximum: 50 },
        },
      }),
      responses: { 200: ok('Hotels with their lowest price for the stay (B2B prices, paise)') },
    }),
  },
  '/hotels/{ref}/offers': {
    post: op('hotel:search', 'Room offers of a hotel', {
      parameters: [REF('Hotel ref')],
      requestBody: json(ref('Stay')),
      responses: { 200: ok('Offers, each with a `priceToken` (valid ~15 minutes)') },
    }),
  },
  '/hotels/offers/price-check': {
    post: op('hotel:search', 'Check a price before booking', {
      requestBody: json({ type: 'object', required: ['priceToken'], properties: { priceToken: { type: 'string' } } }),
      responses: { 200: ok('`status`: OK | PRICE_CHANGED | SOLD_OUT, with the current price') },
    }),
  },
  '/client/orders': {
    post: op('hotel:book', 'Book (holds the rooms; pay next)', {
      parameters: [IDEMPOTENCY],
      requestBody: json({
        type: 'object',
        required: ['priceToken', 'rooms', 'contact'],
        properties: {
          priceToken: { type: 'string' },
          rooms: {
            type: 'array',
            items: { type: 'object', properties: { leadGuest: { type: 'string' }, guests: { type: 'array', items: { type: 'string' } } } },
          },
          contact: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' } } },
          specialRequests: { type: 'string' },
          customerReference: { type: 'string', description: 'Your own reference' },
        },
      }),
      responses: { 201: ok('The order (`ref`, status HELD, total) — pay before the hold ends') },
    }),
  },
  '/client/orders/{ref}/pay': {
    post: op('hotel:book', 'Pay an order from the wallet / credit', {
      parameters: [REF('Order ref'), IDEMPOTENCY],
      requestBody: json({ type: 'object', properties: { method: { type: 'string', enum: ['WALLET'] } } }),
      responses: { 201: ok('Paid → CONFIRMED (a `booking.confirmed` webhook follows)') },
    }),
  },
  '/client/orders/{ref}': {
    get: op('orders:read', 'An order with its bookings', { parameters: [REF('Order ref')], responses: { 200: ok('The order') } }),
  },
  '/client/bookings': {
    get: op('orders:read', 'Your company’s bookings (filters, newest first)', { responses: { 200: ok('`{ data: [...] }`') } }),
  },
  '/bookings/hotels/{ref}/cancellation-quote': {
    post: op('hotel:book', 'What cancelling costs now', {
      parameters: [REF('Booking ref')],
      responses: { 200: ok('Charge and refund, with a `quoteToken` valid 5 minutes') },
    }),
  },
  '/bookings/hotels/{ref}/cancel': {
    post: op('hotel:book', 'Cancel a booking', {
      parameters: [REF('Booking ref'), IDEMPOTENCY],
      requestBody: json({
        type: 'object',
        required: ['quoteToken'],
        properties: { quoteToken: { type: 'string' }, reason: { type: 'string' } },
      }),
      responses: { 200: ok('Cancelled; the refund goes back to your wallet') },
    }),
  },
  '/wallet': { get: op('wallet:read', 'Wallet balance, money held and credit', { responses: { 200: ok('The wallet') } }) },
  '/webhook-endpoints': {
    get: op('webhooks:manage', 'Your webhook addresses', { responses: { 200: ok('`{ data: [...] }`') } }),
    post: op('webhooks:manage', 'Add a webhook address', {
      requestBody: json({
        type: 'object',
        required: ['url', 'events'],
        properties: {
          url: { type: 'string', format: 'uri' },
          events: { type: 'array', items: { type: 'string', enum: [...WEBHOOK_EVENTS] } },
          description: { type: 'string' },
        },
      }),
      responses: { 201: ok('The address and its `secret` (shown once)') },
    }),
  },
};

/** @param {NodeJS.ProcessEnv} env */
export function openApiDocument(env) {
  const server = (env.B2B_API_PUBLIC_URL || 'https://musafirbabaserver.3mongoose.online/api/v1').replace(/\/$/, '');
  return {
    openapi: '3.1.0',
    info: {
      title: 'MusafirBaba B2B API',
      version: '1.0.0',
      description: `Search, book, pay and cancel hotel stays from your own software. Send your key as \`Authorization: Bearer mb_live_…\`. Scopes: ${SCOPES.join(', ')}. Amounts are integer paise (₹1 = 100). Guides: https://musafirbaba.com/business/developers/docs`,
    },
    servers: [{ url: server }],
    components: {
      securitySchemes: { apiKey: { type: 'http', scheme: 'bearer', bearerFormat: 'mb_live_<prefix>_<secret>' } },
      responses: { Problem: { description: 'Error', content: { 'application/problem+json': { schema: ref('Problem') } } } },
      schemas: SCHEMAS,
    },
    paths: PATHS,
    webhooks: {
      bookingUpdate: {
        post: {
          summary: 'A booking update to your address',
          description:
            'Verify the `MB-Signature` header (t=…,v1=HMAC-SHA256(secret, t + "." + body)); reject if older than 5 minutes; ignore an `id` you have already handled; answer 2xx within 10 seconds.',
          requestBody: json(ref('WebhookEvent')),
          responses: { 200: { description: 'Received' } },
        },
      },
    },
  };
}

/** @param {import('express').Router} router @param {NodeJS.ProcessEnv} env */
export function openApiRoute(router, env) {
  const doc = openApiDocument(env);
  router.get('/openapi.json', publicRoute(), (_req, res) => {
    res.set('Cache-Control', 'public, max-age=600').json(doc);
  });
}
