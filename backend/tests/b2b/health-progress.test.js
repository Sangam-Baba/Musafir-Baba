// @ts-check
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { countStage, parseStageFile, renderStatus, validate } from '../../scripts/b2b/progress-lib.js';
import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { checkHealth } from '../../src/b2b/core/health.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { startMongo } from './helpers/mongo.js';

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
const now = new Date('2026-11-12T10:00:00Z');
const clock = { now: () => now };

describe('health', () => {
  beforeAll(async () => {
    mongo = await startMongo();
    await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  });
  afterAll(async () => mongo.stop());
  beforeEach(async () => {
    await mongo.db.collection('core_jobs').deleteMany({});
    await mongo.db.collection('core_schedules').deleteMany({});
  });

  it('ok when work is keeping up', async () => {
    await mongo.db.collection('core_schedules').insertOne({ _id: /** @type {any} */ ('reconciler'), everyMs: 30000, nextRunAt: now, lastRunAt: new Date(now.getTime() - 20_000) });
    expect(await checkHealth(clock)).toEqual({ status: 'ok', database: 'up', jobLagSeconds: 0, reconcilerLastRunSecondsAgo: 20 });
  });

  it('degraded when jobs wait too long or the reconciler stopped', async () => {
    await mongo.db.collection('core_jobs').insertOne({ queue: 'default', name: 'x', status: 'READY', runAt: new Date(now.getTime() - 90_000), attempts: 0, maxAttempts: 5 });
    expect(await checkHealth(clock)).toMatchObject({ status: 'degraded', jobLagSeconds: 90 });
    await mongo.db.collection('core_jobs').deleteMany({});
    await mongo.db.collection('core_schedules').insertOne({ _id: /** @type {any} */ ('reconciler'), everyMs: 30000, nextRunAt: now, lastRunAt: new Date(now.getTime() - 300_000) });
    expect(await checkHealth(clock)).toMatchObject({ status: 'degraded', reconcilerLastRunSecondsAgo: 300 });
  });
});

describe('progress counting', () => {
  const stage = `| **Started** | 2026-11-12 |
| **Finished** | — |

| ID | Task | Plan ref | Status | Owner | PR | Tests | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S00-T01 | a | §1 | DONE | | | | |
| S00-T02 | b | §1 | DOING | | | | |
| S00-T03 | c | §1 | DEFERRED | | | | DEF-022 later |
| S00-T04 | d | §1 | DROPPED | | | | not needed |
| S00-T14b | e | §1 | DONE | | | | |
`;

  it('counts done / total / deferred and derives the stage status', () => {
    const f = parseStageFile('00', stage);
    expect(f.tasks.map((t) => t.id)).toEqual(['S00-T01', 'S00-T02', 'S00-T03', 'S00-T04', 'S00-T14b']);
    expect(countStage(f)).toEqual({ done: 2, total: 4, deferred: 1, percent: 67, status: 'IN_PROGRESS' });
  });

  it('flags deferred tasks without a DEFERRED.md row and unknown statuses', () => {
    const f = parseStageFile('00', stage.replace('| DOING |', '| WIP |'));
    expect(validate([f], '| DEF-001 | x |')).toEqual(['S00-T02: unknown status "WIP"', 'S00-T03: DEF-022 has no row in DEFERRED.md']);
    expect(validate([parseStageFile('00', stage)], '| DEF-022 | later |')).toEqual([]);
  });

  it('rewrites only the generated block, keeping rows of stages without a file', () => {
    const status = `intro\n<!-- progress:start -->\n| # | Stage |\n| --- | --- |\n| 00 | Foundations | A | X | 0 / 0 | 0 | 0 % | — | — | — |\n| 01 | Orgs | A | NOT_STARTED | 0 / 0 | 0 | 0 % | — | — | — |\n\n**Overall (stages with task lists):** old\n<!-- progress:end -->\noutro`;
    const out = renderStatus(status, [parseStageFile('00', stage)]);
    expect(out).toContain('| 00 | Foundations | A | IN_PROGRESS | 2 / 4 | 1 | 67 % | 2026-11-12 | — | [stage-00](stages/stage-00.md) |');
    expect(out).toContain('| 01 | Orgs | A | NOT_STARTED | 0 / 0 |');
    expect(out).toContain('**Overall (stages with task lists):** 2 of 3 tasks done (67 %) · deferred on purpose: 1');
    expect(out.startsWith('intro')).toBe(true);
    expect(out.endsWith('outro')).toBe(true);
  });
});
