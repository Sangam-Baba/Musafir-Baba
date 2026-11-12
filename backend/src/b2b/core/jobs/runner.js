// @ts-check
/**
 * Job runner loop for the worker: claim → run handler → complete/fail. Polls quickly while
 * there is work and backs off to `maxIdleMs` when idle, to keep load on the shared database
 * small (docs/plan/12-… D5). stop() waits for the job in progress.
 */
import { claimNext, completeJob, failJob } from './queue.js';

/** @typedef {(payload: Record<string, unknown>, job: import('./queue.js').ClaimedJob) => Promise<void>} JobHandler */

/**
 * @param {{ queue?: string, handlers: ReadonlyMap<string, JobHandler>, workerId: string, clock: import('../clock.js').Clock,
 *   logger: import('../logger.js').Logger, leaseMs?: number, minIdleMs?: number, maxIdleMs?: number }} options
 */
export function createJobRunner(options) {
  const queue = options.queue ?? 'default';
  const leaseMs = options.leaseMs ?? 60_000;
  const minIdle = options.minIdleMs ?? 500;
  const maxIdle = options.maxIdleMs ?? 5000;
  let running = false;
  /** @type {Promise<void> | null} */
  let loop = null;
  /** @type {(() => void) | null} */
  let wake = null;

  /** @returns {Promise<boolean>} true if a job was processed */
  async function processOne() {
    const job = await claimNext({ queue, workerId: options.workerId, leaseMs, clock: options.clock });
    if (!job) return false;
    const handler = options.handlers.get(job.name);
    try {
      if (!handler) throw new Error(`no handler registered for job "${job.name}"`);
      await handler(job.payload ?? {}, job);
      await completeJob(job, options.clock);
    } catch (error) {
      const outcome = await failJob(job, error, options.clock);
      const log = outcome === 'DEAD' ? options.logger.error : options.logger.warn;
      log({ jobId: String(job._id), job: job.name, attempts: job.attempts, outcome, err: error }, 'job failed');
    }
    return true;
  }

  async function run() {
    let idle = minIdle;
    while (running) {
      let worked = false;
      try {
        worked = await processOne();
      } catch (error) {
        options.logger.error({ err: error }, 'job runner: claim failed');
      }
      if (worked) {
        idle = minIdle;
        continue;
      }
      await new Promise((resolve) => {
        const t = setTimeout(resolve, idle);
        wake = () => { clearTimeout(t); resolve(undefined); };
      });
      idle = Math.min(idle * 2, maxIdle);
    }
  }

  return {
    start() {
      if (running) return;
      running = true;
      loop = run();
    },
    async stop() {
      running = false;
      wake?.();
      await loop;
    },
    processOne,
  };
}
