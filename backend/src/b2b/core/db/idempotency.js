// @ts-check
/**
 * Idempotency for money/booking requests (docs/plan/06-api-and-events.md §1, 05-… §7).
 * Same (scope, key) → the first result is returned again; nothing runs twice.
 * Same key with a different request → 422 IDEMPOTENCY_KEY_REUSED.
 * Still running → 409 IDEMPOTENCY_IN_PROGRESS (an abandoned run is taken over after its lease).
 * If the operation throws, the record is removed so the client can retry — the business
 * steps themselves are idempotent (01-architecture.md §8), so a retry is always safe.
 * Records expire after 24 h (TTL index on `expiresAt` — disposable data only).
 */
import { createHash } from 'node:crypto';

import { AppError, ConflictError } from '../errors.js';
import { b2bMongoose } from './connection.js';
import { defineModel } from './model.js';

export const IDEMPOTENCY_COLLECTION = 'core_idempotency_keys';
const TTL_MS = 24 * 60 * 60 * 1000;
const LEASE_MS = 60 * 1000;
const DUPLICATE_KEY = 11000;

const schema = new b2bMongoose.Schema(
  {
    scope: { type: String, required: true, maxlength: 120 },
    key: { type: String, required: true, maxlength: 64 },
    requestHash: { type: String, required: true, maxlength: 64 },
    status: { type: String, required: true, enum: ['IN_PROGRESS', 'DONE'] },
    leaseUntil: { type: Date, required: true },
    response: { type: { statusCode: Number, body: b2bMongoose.Schema.Types.Mixed }, default: undefined, _id: false },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false, timestamps: true },
);
const IdempotencyRecord = defineModel('IdempotencyRecord', schema, IDEMPOTENCY_COLLECTION);

/** @typedef {{ statusCode: number, body: unknown }} StoredResponse */
/** @typedef {StoredResponse & { replayed: boolean }} IdempotentResult */

/**
 * Stable hash of what the request asks for (method, path, body with sorted keys).
 * @param {{ method: string, path: string, body?: unknown }} request
 */
export function hashRequest(request) {
  return createHash('sha256').update(stableStringify([request.method.toUpperCase(), request.path, request.body ?? null])).digest('hex');
}

/** @param {unknown} v @returns {string} */
function stableStringify(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  const o = /** @type {Record<string, unknown>} */ (v);
  return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`).join(',')}}`;
}

/**
 * Who the key belongs to — keys are only unique per caller.
 * @param {import('../context.js').RequestContext} ctx
 */
export function idempotencyScope(ctx) {
  const a = ctx.actor;
  switch (a.type) {
    case 'customer': return `customer:${a.customerId}`;
    case 'member': return `org:${a.orgId}`;
    case 'staff': return `staff:${a.staffId}`;
    case 'system': return `system:${a.reason}`;
    case 'anonymous': throw new AppError('IDEMPOTENCY_SCOPE_MISSING', 401, 'Sign in required');
    default: return assertNever(a);
  }
}

/** @param {never} x @returns {never} */
function assertNever(x) {
  throw new Error(`unexpected actor ${JSON.stringify(x)}`);
}

/**
 * @param {{ scope: string, key: string, requestHash: string, clock: import('../clock.js').Clock }} params
 * @param {() => Promise<StoredResponse>} operation
 * @returns {Promise<IdempotentResult>}
 */
export async function withIdempotency(params, operation) {
  const record = await claim(params);
  if (record.replay) return { ...record.replay, replayed: true };
  try {
    const response = await operation();
    await IdempotencyRecord.updateOne({ _id: record.id }, { $set: { status: 'DONE', response } });
    return { ...response, replayed: false };
  } catch (error) {
    await IdempotencyRecord.deleteOne({ _id: record.id, status: 'IN_PROGRESS' });
    throw error;
  }
}

/**
 * @param {{ scope: string, key: string, requestHash: string, clock: import('../clock.js').Clock }} p
 * @returns {Promise<{ id: unknown, replay?: StoredResponse }>}
 */
async function claim({ scope, key, requestHash, clock }) {
  const now = clock.now();
  const lease = new Date(now.getTime() + LEASE_MS);
  try {
    const created = await IdempotencyRecord.create({
      scope, key, requestHash, status: 'IN_PROGRESS', leaseUntil: lease, expiresAt: new Date(now.getTime() + TTL_MS),
    });
    return { id: created._id };
  } catch (error) {
    if (/** @type {{ code?: number }} */ (error).code !== DUPLICATE_KEY) throw error;
  }
  const existing = await IdempotencyRecord.findOne({ scope, key }).lean();
  if (!existing) throw new ConflictError('IDEMPOTENCY_IN_PROGRESS'); // removed by a failed run a moment ago
  if (existing.requestHash !== requestHash) throw new AppError('IDEMPOTENCY_KEY_REUSED', 422, 'This Idempotency-Key was used for a different request');
  if (existing.status === 'DONE' && existing.response) {
    return { id: existing._id, replay: { statusCode: Number(existing.response.statusCode), body: existing.response.body } };
  }
  const takenOver = await IdempotencyRecord.findOneAndUpdate(
    { _id: existing._id, status: 'IN_PROGRESS', leaseUntil: { $lt: now } },
    { $set: { leaseUntil: lease } },
  );
  if (!takenOver) throw new ConflictError('IDEMPOTENCY_IN_PROGRESS');
  return { id: existing._id };
}
