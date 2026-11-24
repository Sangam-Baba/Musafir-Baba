// @ts-check
/**
 * Webhook deliveries (S14-T06): queued once per event per subscribed active endpoint; sent signed (verifiable with
 * the endpoint's secret, same body every try); retry schedule 1 m, 5 m, 15 m, 1 h, 3 h, 6 h, 12 h then FAILED; an
 * endpoint failing for 24 h switched off (event for the Owner); a send interrupted by a crash goes back after 2 min;
 * replay keeps the event id; test event; internal events → the client's public events (website orders → nothing);
 * switched off → no consumer, no sender.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { OrderRecord } from '../../src/b2b/modules/orders/index.js';
import {
  createDeliveries,
  createEndpoints,
  DeliveryRecord,
  EndpointRecord,
  RETRY_DELAYS_MS,
  verifySignature,
} from '../../src/b2b/modules/webhooks/index.js';
import { toPublicEvent, webhookParts } from '../../src/b2b/routes/webhooks-wiring.js';
import { startMongo } from './helpers/mongo.js';

let nowMs = Date.parse('2026-11-24T06:30:00Z');
const clock = { now: () => new Date(nowMs) };
const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const ORG = '65f0000000000000000a1403';
const WHO = { orgId: ORG, userId: '65f0000000000000000b1403', permissions: ['webhooks.endpoint.manage'] };
const SEAL = 'webhook-seal-key-for-tests-0002';
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
/** @type {{ url: string, body: string, headers: Record<string, string> }[]} */
let sent = [];
/** @type {number[]} */
let answers = [];

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
});
afterAll(async () => mongo.stop());
beforeEach(async () => {
  nowMs = Date.parse('2026-11-24T06:30:00Z');
  sent = [];
  answers = [];
  await EndpointRecord.deleteMany({}).setOptions(S);
  await DeliveryRecord.deleteMany({}).setOptions(S);
});

const endpoints = () => createEndpoints({ clock, sealKey: SEAL, planAllowsWebhooks: async () => true });
const deliveries = () =>
  createDeliveries({
    clock,
    sealKey: SEAL,
    send: async (url, body, headers) => {
      sent.push({ url, body, headers });
      const status = answers.shift() ?? 200;
      return { ok: status >= 200 && status < 300, status, snippet: status === 200 ? 'ok' : 'boom', error: null, ms: 5 };
    },
  });
/** @param {string} id @param {string} [type] */
const event = (id, type = 'booking.confirmed') => ({
  eventId: id,
  type,
  createdAt: clock.now(),
  data: { orderRef: 'MBO-1', bookingRefs: ['MBH-1'] },
});

describe('deliveries', () => {
  it('queued once per subscribed active endpoint; sent signed with the same body; success clears the failure clock', async () => {
    const eps = endpoints();
    const a = await eps.create(WHO, { url: 'https://hooks.trips.co/a', events: ['booking.confirmed'] });
    await eps.create(WHO, { url: 'https://hooks.trips.co/b', events: ['booking.cancelled'] });
    const off = await eps.create(WHO, { url: 'https://hooks.trips.co/c', events: ['booking.confirmed'] });
    await eps.update(ORG, off.id, { enabled: false });
    const d = deliveries();
    expect(await d.enqueue(ORG, event('evt_1'))).toBe(1);
    expect(await d.enqueue(ORG, event('evt_1'))).toBe(0); // repeat-safe
    expect(await d.sendDue()).toEqual({ SUCCEEDED: 1 });
    expect(sent).toHaveLength(1);
    const [s] = sent;
    expect(s?.url).toBe('https://hooks.trips.co/a');
    expect(JSON.parse(String(s?.body))).toMatchObject({
      id: 'evt_1',
      type: 'booking.confirmed',
      apiVersion: '2026-11-24',
      data: { orderRef: 'MBO-1' },
    });
    expect(s?.headers['MB-Event-Id']).toBe('evt_1');
    expect(verifySignature(String(s?.headers['MB-Signature']), String(s?.body), a.secret, Math.floor(nowMs / 1000))).toBe(true);
    expect((await d.list(ORG))[0]).toMatchObject({ status: 'SUCCEEDED', attempts: 1, responseCode: 200 });
    expect(await d.sendDue()).toEqual({});
  });

  it('retry schedule, then FAILED; an endpoint failing for 24 h is switched off; a crashed send comes back after 2 min', async () => {
    await endpoints().create(WHO, { url: 'https://hooks.trips.co/a', events: ['booking.confirmed'] });
    const d = deliveries();
    await d.enqueue(ORG, event('evt_retry'));
    const start = nowMs;
    answers = Array(20).fill(500);
    expect(await d.sendDue()).toEqual({ PENDING: 1 });
    for (const [i, delay] of RETRY_DELAYS_MS.entries()) {
      const row = /** @type {any} */ (await DeliveryRecord.findOne({ eventId: 'evt_retry' }).setOptions(S).lean());
      expect(new Date(row.nextAttemptAt).getTime() - nowMs).toBe(delay);
      nowMs += delay - 1;
      expect(await d.sendDue()).toEqual({}); // not yet due
      nowMs += 1;
      expect(await d.sendDue()).toEqual(i === RETRY_DELAYS_MS.length - 1 ? { FAILED: 1 } : { PENDING: 1 });
    }
    expect(sent.map((x) => x.body).every((b) => b === sent[0]?.body)).toBe(true); // same body every time
    expect((await d.list(ORG))[0]).toMatchObject({ status: 'FAILED', attempts: 8, responseCode: 500 });
    let ep = /** @type {any} */ (await EndpointRecord.findOne({ orgId: ORG }).setOptions(S).lean());
    expect(new Date(ep.failingSince).getTime()).toBe(start);
    expect(ep.status).toBe('ACTIVE'); // 22 h 21 m of retries < 24 h

    nowMs = start + 24 * 60 * 60_000;
    await d.enqueue(ORG, event('evt_after_a_day'));
    await d.sendDue();
    ep = /** @type {any} */ (await EndpointRecord.findOne({ orgId: ORG }).setOptions(S).lean());
    expect(ep).toMatchObject({ status: 'DISABLED', disabledReason: 'FAILING_24H' });
    expect(ep.pendingEvents.map((/** @type {any} */ e) => e.type)).toContain('webhooks.endpoint.disabled');
    await DeliveryRecord.updateOne({ eventId: 'evt_after_a_day' }, { $set: { status: 'PENDING', nextAttemptAt: clock.now() } }).setOptions(
      S,
    );
    expect(await d.sendDue()).toEqual({ FAILED: 1 }); // switched off → not sent
    expect((await DeliveryRecord.findOne({ eventId: 'evt_after_a_day' }).setOptions(S).lean())?.error).toBe('ENDPOINT_NOT_ACTIVE');

    await endpoints().update(ORG, String(ep._id), { enabled: true });
    await d.enqueue(ORG, event('evt_crash'));
    await DeliveryRecord.updateOne({ eventId: 'evt_crash' }, { $set: { status: 'SENDING', claimedAt: clock.now() } }).setOptions(S);
    expect(await d.sendDue()).toEqual({});
    nowMs += 2 * 60_000 + 1;
    answers = [200];
    expect(await d.sendDue()).toEqual({ SUCCEEDED: 1 });
  });

  it('replay keeps the event id and body; test event to one endpoint; other companies see nothing', async () => {
    const a = await endpoints().create(WHO, { url: 'https://hooks.trips.co/a', events: ['booking.confirmed'] });
    const d = deliveries();
    await d.enqueue(ORG, event('evt_replay'));
    await d.sendDue();
    const [first] = await d.list(ORG);
    const again = await d.replay(ORG, String(first?.id));
    expect(again).toMatchObject({ eventId: 'evt_replay', replayOf: first?.id, status: 'PENDING' });
    await d.sendDue();
    expect(sent).toHaveLength(2);
    expect(sent[1]?.body).toBe(sent[0]?.body);
    await expect(d.replay('65f0000000000000000a9999', String(first?.id))).rejects.toMatchObject({ code: 'WEBHOOK_DELIVERY_NOT_FOUND' });
    expect(await d.list('65f0000000000000000a9999')).toEqual([]);
    const t = await d.test(ORG, a.id);
    expect(t).toMatchObject({ type: 'webhook.test', status: 'PENDING' });
    await d.sendDue();
    expect(JSON.parse(String(sent[2]?.body))).toMatchObject({ type: 'webhook.test', data: { message: 'Test event from MusafirBaba' } });
  });
});

describe('which events go to whom', () => {
  it('a client order → booking.confirmed for that client; a website order, platform payments → nothing; switched off → no parts', async () => {
    const order = await OrderRecord.collection.insertOne({
      ref: 'MBO-WH1',
      clientOrgId: ORG,
      items: [{ bookingRef: 'MBH-WH1' }],
      channel: 'B2B_API',
      idempotency: { scope: 'test', key: 'wh1' },
    });
    const site = await OrderRecord.collection.insertOne({
      ref: 'MBO-WH2',
      clientOrgId: null,
      items: [{ bookingRef: 'MBH-WH2' }],
      channel: 'WEBSITE',
      idempotency: { scope: 'test', key: 'wh2' },
    });
    expect(await toPublicEvent({ type: 'orders.order.confirmed', payload: { orderId: String(order.insertedId) } })).toEqual({
      orgId: ORG,
      type: 'booking.confirmed',
      data: { orderRef: 'MBO-WH1', bookingRefs: ['MBH-WH1'], status: 'CONFIRMED' },
    });
    expect(
      await toPublicEvent({ type: 'hotel-booking.booking.cancelled', payload: { orderId: String(order.insertedId), ref: 'MBH-WH1' } }),
    ).toMatchObject({ type: 'booking.cancelled', data: { bookingRef: 'MBH-WH1' } });
    expect(await toPublicEvent({ type: 'orders.order.confirmed', payload: { orderId: String(site.insertedId) } })).toBeNull();
    expect(await toPublicEvent({ type: 'payments.intent.succeeded', payload: { orgId: 'platform', txnId: 'B2BH1' } })).toBeNull();
    expect(await toPublicEvent({ type: 'wallet.account.low-balance', payload: { orgId: ORG, amountPaise: 500_000 } })).toEqual({
      orgId: ORG,
      type: 'wallet.low_balance',
      data: { thresholdPaise: 500_000 },
    });
    expect(await toPublicEvent({ type: 'orders.order.created', payload: {} })).toBeNull();
    expect(webhookParts(clock, {})).toEqual({ consumers: [], schedules: [] });
    expect(webhookParts(clock, { B2B_API_ENABLED: 'true', B2B_AUTH_SECRET: SEAL }).consumers[0]?.types).toHaveLength(8);
    await OrderRecord.collection.deleteMany({ ref: { $in: ['MBO-WH1', 'MBO-WH2'] } });
  });
});
