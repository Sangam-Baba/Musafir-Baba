// @ts-check
import express from 'express';
import { afterEach, describe, expect, it } from 'vitest';

import { fixedClock } from '../../src/b2b/core/clock.js';
import { createContext, systemContext } from '../../src/b2b/core/context.js';
import { ConflictError, NotFoundError, RateLimitError, toProblem } from '../../src/b2b/core/errors.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startServer } from './helpers/http.js';

/** @param {string[]} lines */
const silentLogger = (lines = []) => createLogger({ write: (l) => lines.push(l), clock: fixedClock(new Date('2026-11-12T00:00:00Z')) });

describe('problem details', () => {
  it('maps typed errors with stable codes and safe details', () => {
    expect(toProblem(new ConflictError('PRICE_CHANGED', { newTotalPaise: 100 }), 'req-1')).toEqual({
      type: 'https://musafirbaba.com/problems/price-changed',
      title: 'The request conflicts with the current state',
      status: 409,
      code: 'PRICE_CHANGED',
      newTotalPaise: 100,
      requestId: 'req-1',
    });
  });

  it('never leaks unknown errors', () => {
    const p = toProblem(new Error(['connection string mongodb://user', ':pass', '@host'].join('')));
    expect(p).toEqual({
      type: 'https://musafirbaba.com/problems/internal-error',
      title: 'Something went wrong',
      status: 500,
      code: 'INTERNAL_ERROR',
    });
  });
});

describe('/api/v1 error handling', () => {
  /** @type {Awaited<ReturnType<typeof startServer>> | undefined} */
  let server;
  afterEach(async () => server?.close());

  it('answers unknown paths with a 404 problem carrying the request id', async () => {
    const app = express();
    app.use('/api/v1', createB2BRouter({ connect: false, logger: silentLogger() }));
    server = await startServer(app);
    const missing = await server.get('/api/v1/nope');
    expect(missing.status).toBe(404);
    expect(missing.body.code).toBe('ROUTE_NOT_FOUND');
    expect(missing.body.requestId).toMatch(/[0-9a-f-]{36}/);
  });
});

describe('logger', () => {
  it('writes JSON lines and redacts secrets and personal data at any depth', () => {
    /** @type {string[]} */
    const lines = [];
    const log = silentLogger(lines).child({ module: 'test' });
    log.info(
      {
        orderId: 'MBO-1',
        password: 'x',
        guest: { name: 'Asha' },
        contact: { name: 'Asha', phone: '999', email: 'a@b.c' },
        headers: { authorization: 'Bearer t' },
      },
      'hello',
    );
    const entry = JSON.parse(lines[0] ?? '{}');
    expect(entry).toMatchObject({
      time: '2026-11-12T00:00:00.000Z',
      level: 'info',
      msg: 'hello',
      module: 'test',
      orderId: 'MBO-1',
      password: '[REDACTED]',
    });
    expect(entry.guest).toBe('[REDACTED]'); // whole guest objects are personal data
    expect(entry.contact).toEqual({ name: 'Asha', phone: '[REDACTED]', email: '[REDACTED]' });
    expect(entry.headers.authorization).toBe('[REDACTED]');
  });

  it('respects the level and serialises errors', () => {
    /** @type {string[]} */
    const lines = [];
    const log = createLogger({ level: 'warn', write: (l) => lines.push(l) });
    log.info({}, 'skipped');
    log.error({ err: new NotFoundError() }, 'failed');
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] ?? '{}').err).toMatchObject({ name: 'NotFoundError', message: 'NOT_FOUND: Not found' });
  });
});

describe('request context', () => {
  it('is frozen and binds request id, channel and actor to the logger', () => {
    /** @type {string[]} */
    const lines = [];
    const ctx = createContext({
      requestId: 'r1',
      channel: 'WEBSITE',
      actor: { type: 'customer', customerId: 'c1' },
      logger: silentLogger(lines),
    });
    expect(Object.isFrozen(ctx)).toBe(true);
    ctx.logger.info({}, 'x');
    expect(JSON.parse(lines[0] ?? '{}')).toMatchObject({ requestId: 'r1', channel: 'WEBSITE', actor: 'customer' });
  });

  it('system context requires a reason', () => {
    expect(() => systemContext(' ', 'r', silentLogger())).toThrow(/reason/);
    expect(systemContext('hold-sweeper', 'r', silentLogger()).actor).toEqual({ type: 'system', reason: 'hold-sweeper' });
  });

  it('rate limit errors carry retryAfterSeconds', () => {
    expect(toProblem(new RateLimitError(30)).retryAfterSeconds).toBe(30);
  });
});
