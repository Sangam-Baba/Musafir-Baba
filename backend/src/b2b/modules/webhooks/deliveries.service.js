// @ts-check
/**
 * Webhook deliveries (plan Stage 14 §3.4):
 *   enqueue  → one delivery per ACTIVE endpoint of the company subscribed to the event (repeat-safe per event);
 *   sendDue  → claims due deliveries one by one (conditional update), signs (`MB-Signature`, every valid secret) and
 *              sends through the guarded client; 2xx → SUCCEEDED; otherwise the next try per the schedule, FAILED when
 *              out of tries; an endpoint failing for 24 h is switched off (event → the Owner is told). Deliveries
 *              claimed but never finished (process stopped) go back to PENDING after 2 minutes;
 *   replay   → a new delivery with the same event id and body; test → a `webhook.test` event to one endpoint.
 */
import { randomBytes } from 'node:crypto';

import { newEvent } from '../../core/db/events.js';
import { systemScope } from '../../core/db/tenant-plugin.js';
import { NotFoundError } from '../../core/errors.js';
import { publicPayload } from './domain/events.js';
import { nextTryAt, shouldDisable } from './domain/retry.js';
import { SIGNATURE_HEADER, signatureHeader } from './domain/signature.js';
import { secretsOf } from './endpoints.service.js';
import { EVENTS } from './events.js';
import { guardedPost } from './guarded-client.js';
import { DeliveryRecord } from './models/delivery.model.js';
import { EndpointRecord } from './models/endpoint.model.js';

const SCOPE = systemScope('webhooks: sender', { routine: true });
const STUCK_MS = 2 * 60_000;

/**
 * @typedef {{ clock: import('../../core/clock.js').Clock, sealKey: string,
 *   send?: (url: string, body: string, headers: Record<string, string>) => Promise<import('./guarded-client.js').SendResult> }} DeliveryDeps
 * @typedef {{ eventId: string, type: string, createdAt: Date, data: Record<string, unknown> }} PublicEvent
 */

/** @param {Record<string, any>} d */
export const deliveryDto = (d) => ({
  id: String(d._id),
  endpointId: d.endpointId,
  eventId: d.eventId,
  type: d.type,
  status: d.status,
  attempts: d.attempts,
  nextAttemptAt: d.nextAttemptAt,
  lastAttemptAt: d.lastAttemptAt,
  responseCode: d.responseCode,
  responseSnippet: d.responseSnippet,
  error: d.error,
  replayOf: d.replayOf,
  createdAt: d.createdAt,
});

/** @param {DeliveryDeps} deps @param {Record<string, any>} endpoint @param {PublicEvent} e @param {string | null} replayOf */
async function insert(deps, endpoint, e, replayOf) {
  try {
    const d = await DeliveryRecord.create({
      orgId: endpoint.orgId,
      endpointId: String(endpoint._id),
      eventId: e.eventId,
      type: e.type,
      payload: publicPayload({ id: e.eventId, type: /** @type {any} */ (e.type), createdAt: e.createdAt, data: e.data }),
      nextAttemptAt: deps.clock.now(),
      replayOf,
    });
    return /** @type {Record<string, any>} */ (d.toObject());
  } catch (err) {
    if (/** @type {any} */ (err)?.code === 11000) return null; // this event was already queued for this endpoint
    throw err;
  }
}

/** @param {DeliveryDeps} deps @param {Record<string, any>} d @param {Record<string, any>} endpoint */
async function attempt(deps, d, endpoint) {
  const body = JSON.stringify(d.payload);
  const t = Math.floor(deps.clock.now().getTime() / 1000);
  const headers = {
    [SIGNATURE_HEADER]: signatureHeader(secretsOf(deps, endpoint), t, body),
    'MB-Event-Id': d.eventId,
    'MB-Event-Type': d.type,
    'MB-Delivery-Attempt': String(d.attempts + 1),
  };
  return (deps.send ?? guardedPost)(endpoint.url, body, headers);
}

/** After a try: the delivery's next state and the endpoint's failure clock. @param {DeliveryDeps} deps @param {Record<string, any>} d @param {Record<string, any>} endpoint @param {import('./guarded-client.js').SendResult} r */
async function record(deps, d, endpoint, r) {
  const now = deps.clock.now();
  const tries = d.attempts + 1;
  const next = r.ok ? null : nextTryAt(tries, now);
  const status = r.ok ? 'SUCCEEDED' : next ? 'PENDING' : 'FAILED';
  await DeliveryRecord.updateOne(
    { _id: d._id, status: 'SENDING' },
    {
      $set: {
        status,
        attempts: tries,
        nextAttemptAt: next,
        claimedAt: null,
        lastAttemptAt: now,
        responseCode: r.status,
        responseSnippet: r.snippet || null,
        error: r.error,
      },
      $push: { tries: { $each: [{ at: now, code: r.status ?? 0, error: r.error ?? '', ms: r.ms }], $slice: -10 } },
    },
  ).setOptions(SCOPE);
  if (r.ok) {
    if (endpoint.failingSince) await EndpointRecord.updateOne({ _id: endpoint._id }, { $set: { failingSince: null } }).setOptions(SCOPE);
    return status;
  }
  const since = endpoint.failingSince ?? now;
  if (!endpoint.failingSince)
    await EndpointRecord.updateOne({ _id: endpoint._id, failingSince: null }, { $set: { failingSince: now } }).setOptions(SCOPE);
  if (shouldDisable(since, now)) await disable(deps, endpoint);
  return status;
}

/** @param {DeliveryDeps} deps @param {Record<string, any>} endpoint */
async function disable(deps, endpoint) {
  const event = newEvent(EVENTS.endpointDisabled, { orgId: endpoint.orgId, endpointId: String(endpoint._id), url: endpoint.url }, deps);
  await EndpointRecord.updateOne(
    { _id: endpoint._id, status: 'ACTIVE' },
    {
      $set: { status: 'DISABLED', disabledReason: 'FAILING_24H', hasPendingEvents: true },
      $push: { pendingEvents: event },
      $inc: { version: 1 },
    },
  ).setOptions(SCOPE);
}

/** Claim and send one due delivery; false when none is due. @param {DeliveryDeps} deps */
async function sendOne(deps) {
  const now = deps.clock.now();
  const d = /** @type {Record<string, any> | null} */ (
    await DeliveryRecord.findOneAndUpdate(
      { status: 'PENDING', nextAttemptAt: { $lte: now } },
      { $set: { status: 'SENDING', claimedAt: now } },
      { sort: { nextAttemptAt: 1 }, new: true },
    )
      .setOptions(SCOPE)
      .lean()
  );
  if (!d) return null;
  const endpoint = /** @type {Record<string, any> | null} */ (await EndpointRecord.findOne({ _id: d.endpointId }).setOptions(SCOPE).lean());
  if (!endpoint || endpoint.status !== 'ACTIVE') {
    await DeliveryRecord.updateOne(
      { _id: d._id, status: 'SENDING' },
      { $set: { status: 'FAILED', claimedAt: null, error: 'ENDPOINT_NOT_ACTIVE' } },
    ).setOptions(SCOPE);
    return 'FAILED';
  }
  return record(deps, d, endpoint, await attempt(deps, d, endpoint));
}

/** @param {DeliveryDeps} deps */
export function createDeliveries(deps) {
  return {
    /** @param {string} orgId @param {PublicEvent} e */
    async enqueue(orgId, e) {
      const endpoints = await EndpointRecord.find({ orgId, status: 'ACTIVE', events: e.type }).lean();
      let queued = 0;
      for (const ep of endpoints) if (await insert(deps, ep, e, null)) queued += 1;
      return queued;
    },
    /** Send what is due (at most `limit`). @param {number} [limit] */
    async sendDue(limit = 50) {
      const stuckBefore = new Date(deps.clock.now().getTime() - STUCK_MS);
      await DeliveryRecord.updateMany(
        { status: 'SENDING', claimedAt: { $lt: stuckBefore } },
        { $set: { status: 'PENDING', claimedAt: null } },
      ).setOptions(SCOPE);
      /** @type {Record<string, number>} */
      const out = {};
      for (let i = 0; i < limit; i += 1) {
        const s = await sendOne(deps);
        if (!s) break;
        out[s] = (out[s] ?? 0) + 1;
      }
      return out;
    },
    /** @param {string} orgId @param {{ endpointId?: string, status?: string, before?: Date }} [q] */
    async list(orgId, q = {}) {
      /** @type {Record<string, unknown>} */
      const f = { orgId };
      if (q.endpointId) f.endpointId = q.endpointId;
      if (q.status) f.status = q.status;
      if (q.before) f.createdAt = { $lt: q.before };
      return (await DeliveryRecord.find(f).sort({ createdAt: -1 }).limit(100).lean()).map(deliveryDto);
    },
    /** A new delivery with the same event id and body. @param {string} orgId @param {string} id */
    async replay(orgId, id) {
      const d = /^[a-f0-9]{24}$/.test(id) ? await DeliveryRecord.findOne({ _id: id, orgId }).lean() : null;
      if (!d) throw new NotFoundError('WEBHOOK_DELIVERY_NOT_FOUND');
      const endpoint = await EndpointRecord.findOne({ _id: d.endpointId, orgId, status: 'ACTIVE' }).lean();
      if (!endpoint) throw new NotFoundError('WEBHOOK_ENDPOINT_NOT_FOUND');
      const copy = await DeliveryRecord.create({
        orgId,
        endpointId: d.endpointId,
        eventId: d.eventId,
        type: d.type,
        payload: d.payload,
        nextAttemptAt: deps.clock.now(),
        replayOf: String(d._id),
      });
      return deliveryDto(copy.toObject());
    },
    /** A `webhook.test` event to one endpoint. @param {string} orgId @param {string} endpointId */
    async test(orgId, endpointId) {
      const endpoint = /^[a-f0-9]{24}$/.test(endpointId)
        ? await EndpointRecord.findOne({ _id: endpointId, orgId, status: 'ACTIVE' }).lean()
        : null;
      if (!endpoint) throw new NotFoundError('WEBHOOK_ENDPOINT_NOT_FOUND');
      const e = {
        eventId: `evt_test_${randomBytes(9).toString('base64url')}`,
        type: 'webhook.test',
        createdAt: deps.clock.now(),
        data: { message: 'Test event from MusafirBaba' },
      };
      return deliveryDto(/** @type {Record<string, any>} */ (await insert(deps, endpoint, e, null)));
    },
  };
}
