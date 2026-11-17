// @ts-check
/**
 * MongoDB job queue (no Redis — D22, docs/plan/01-architecture.md §8.2).
 * - enqueue: one document in `core_jobs`; optional `dedupeKey` makes enqueue repeat-safe.
 * - claim: ONE findOneAndUpdate takes a READY job (or a RUNNING one whose lease expired —
 *   its worker crashed) and leases it to this worker, so a job never runs on two workers at once.
 * - complete / fail: failures retry with exponential backoff; after maxAttempts → DEAD + alert.
 * Handlers must be idempotent (a crashed run is retried).
 */
import { b2bMongoose } from '../db/connection.js';
import { defineModel } from '../db/model.js';

export const JOBS_COLLECTION = 'core_jobs';
const JOB_STATUSES = /** @type {const} */ (['READY', 'RUNNING', 'DONE', 'DEAD']);
const DUPLICATE_KEY = 11000;
const MAX_ERROR_LENGTH = 1000;

const schema = new b2bMongoose.Schema(
  {
    queue: { type: String, required: true, maxlength: 60 },
    name: { type: String, required: true, maxlength: 100 },
    payload: { type: b2bMongoose.Schema.Types.Mixed, default: {} },
    runAt: { type: Date, required: true },
    status: { type: String, required: true, enum: JOB_STATUSES },
    attempts: { type: Number, required: true, default: 0 },
    maxAttempts: { type: Number, required: true, default: 5 },
    lockedBy: { type: String, default: undefined },
    lockedUntil: { type: Date, default: undefined },
    lastError: { type: String, default: undefined },
    dedupeKey: { type: String, default: undefined, maxlength: 200 },
    finishedAt: { type: Date, default: undefined },
  },
  { versionKey: false, timestamps: true },
);
export const JobRecord = defineModel('JobRecord', schema, JOBS_COLLECTION);

/** @typedef {{ _id: unknown, queue: string, name: string, payload: Record<string, unknown>, attempts: number, maxAttempts: number, lockedBy?: string }} ClaimedJob */

/**
 * @param {{ queue?: string, name: string, payload?: Record<string, unknown>, runAt?: Date, maxAttempts?: number, dedupeKey?: string, clock: import('../clock.js').Clock }} input
 * @returns {Promise<{ id: unknown, created: boolean }>}
 */
export async function enqueue(input) {
  const queue = input.queue ?? 'default';
  try {
    const job = await JobRecord.create({
      queue,
      name: input.name,
      payload: input.payload ?? {},
      runAt: input.runAt ?? input.clock.now(),
      status: 'READY',
      attempts: 0,
      maxAttempts: input.maxAttempts ?? 5,
      ...(input.dedupeKey ? { dedupeKey: input.dedupeKey } : {}),
    });
    return { id: job._id, created: true };
  } catch (error) {
    if (/** @type {{ code?: number }} */ (error).code !== DUPLICATE_KEY || !input.dedupeKey) throw error;
    const existing = await JobRecord.findOne({ queue, dedupeKey: input.dedupeKey }, { _id: 1 }).lean();
    return { id: existing?._id, created: false };
  }
}

/**
 * @param {{ queue: string, workerId: string, leaseMs: number, clock: import('../clock.js').Clock }} p
 * @returns {Promise<ClaimedJob | null>}
 */
export async function claimNext({ queue, workerId, leaseMs, clock }) {
  const now = clock.now();
  const job = await JobRecord.findOneAndUpdate(
    {
      queue,
      $or: [
        { status: 'READY', runAt: { $lte: now } },
        { status: 'RUNNING', lockedUntil: { $lt: now } },
      ],
    },
    { $set: { status: 'RUNNING', lockedBy: workerId, lockedUntil: new Date(now.getTime() + leaseMs) }, $inc: { attempts: 1 } },
    { sort: { runAt: 1 }, new: true },
  ).lean();
  return /** @type {ClaimedJob | null} */ (/** @type {unknown} */ (job));
}

/** @param {ClaimedJob} job @param {import('../clock.js').Clock} clock @returns {Promise<boolean>} */
export async function completeJob(job, clock) {
  const res = await JobRecord.updateOne(
    { _id: job._id, status: 'RUNNING', lockedBy: job.lockedBy },
    { $set: { status: 'DONE', finishedAt: clock.now() }, $unset: { lockedBy: '', lockedUntil: '' } },
  );
  return res.modifiedCount === 1;
}

/** Exponential backoff: 5 s, 10 s, 20 s … capped at 1 h. @param {number} attempts */
export function backoffMs(attempts) {
  return Math.min(5000 * 2 ** Math.max(0, attempts - 1), 60 * 60 * 1000);
}

/**
 * @param {ClaimedJob} job @param {unknown} error @param {import('../clock.js').Clock} clock
 * @returns {Promise<'RETRY' | 'DEAD'>}
 */
export async function failJob(job, error, clock) {
  const dead = job.attempts >= job.maxAttempts;
  const message = (error instanceof Error ? `${error.name}: ${error.message}` : String(error)).slice(0, MAX_ERROR_LENGTH);
  await JobRecord.updateOne(
    { _id: job._id, status: 'RUNNING', lockedBy: job.lockedBy },
    {
      $set: dead
        ? { status: 'DEAD', lastError: message, finishedAt: clock.now() }
        : { status: 'READY', lastError: message, runAt: new Date(clock.now().getTime() + backoffMs(job.attempts)) },
      $unset: { lockedBy: '', lockedUntil: '' },
    },
  );
  return dead ? 'DEAD' : 'RETRY';
}
