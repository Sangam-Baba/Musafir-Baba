// @ts-check
/**
 * Dunning (S13-T07, plan §8 "dunning state machine"): PAST_DUE → reminders on day 0, 3, 7 (once each, with an event)
 * → day 10 SUSPENDED (event) → a top-up pays the invoice → ACTIVE again; a new episode starts the steps again;
 * the dunning board shows what is owed.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import {
  createBilling,
  dunningBoard,
  dunningStepsDue,
  DunningRecord,
  InvoiceRecord,
  runDunning,
} from '../../src/b2b/modules/billing/index.js';
import { NumberSeriesRecord } from '../../src/b2b/modules/documents/index.js';
import { createSubscriptions, PlanVersionRecord, seedPlans, SubscriptionRecord } from '../../src/b2b/modules/subscriptions/index.js';
import { createLedger, createLiveWallets, seedPlatformAccounts } from '../../src/b2b/modules/wallet/index.js';
import { runBilling } from '../../src/b2b/routes/subscriptions-wiring.js';
import { startMongo } from './helpers/mongo.js';

let nowMs = Date.parse('2026-11-10T06:30:00Z');
const clock = { now: () => new Date(nowMs) };
const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const DAY = 86_400_000;
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  await seedPlatformAccounts();
});
afterAll(async () => mongo.stop());
beforeEach(async () => {
  nowMs = Date.parse('2026-11-10T06:30:00Z');
  await InvoiceRecord.deleteMany({}).setOptions(S);
  await SubscriptionRecord.deleteMany({}).setOptions(S);
  await DunningRecord.deleteMany({}).setOptions(S);
  await PlanVersionRecord.deleteMany({});
  await NumberSeriesRecord.deleteMany({});
  await seedPlans();
});

describe('dunning', () => {
  it('the steps due by day', () => {
    const since = new Date('2026-11-10T00:00:00Z');
    expect(dunningStepsDue(since, new Date(since.getTime() + 2 * DAY)).map((s) => s.day)).toEqual([0]);
    expect(dunningStepsDue(since, new Date(since.getTime() + 10 * DAY)).map((s) => s.day)).toEqual([0, 3, 7, 10]);
  });

  it('reminders day 0 / 3 / 7 once each → suspended on day 10 → a top-up pays and switches it back on', async () => {
    const ledger = createLedger({ clock });
    const wallets = createLiveWallets({ clock, ledger });
    const subs = createSubscriptions({ clock });
    const billing = createBilling({
      clock,
      ledger,
      wallets,
      subscriptions: subs,
      issuer: async () => ({ stateCode: '07', gstin: null }),
      client: async () => ({ name: 'Trips Co', gstin: null }),
    });
    const c = '65f0000000000000000f0001';
    await wallets.open(c);
    const s = await subs.start(c);
    await subs.change({ clientOrgId: c, planKey: 'A', expectedVersion: s.version, by: 'u' });
    await runBilling(subs, billing);
    expect(await subs.current(c)).toMatchObject({ status: 'PAST_DUE' });

    expect(await runDunning({ clock })).toEqual({ reminded: 1, suspended: 0 });
    expect(await runDunning({ clock })).toEqual({ reminded: 0, suspended: 0 });
    nowMs += 7 * DAY;
    expect(await runDunning({ clock })).toEqual({ reminded: 2, suspended: 0 });
    nowMs += 3 * DAY;
    expect(await runDunning({ clock })).toEqual({ reminded: 0, suspended: 1 });
    expect(await subs.current(c)).toMatchObject({ status: 'SUSPENDED' });
    const events = (await DunningRecord.find({ clientOrgId: c }).setOptions(S).lean()).flatMap((d) =>
      (d.pendingEvents ?? []).map((e) => e.type),
    );
    expect(events.sort()).toEqual([
      'billing.dunning.reminded',
      'billing.dunning.reminded',
      'billing.dunning.reminded',
      'billing.subscription.suspended',
    ]);
    expect((await dunningBoard())[0]).toMatchObject({ clientOrgId: c, status: 'SUSPENDED', steps: [0, 3, 7, 10] });

    await wallets.apply({
      clientOrgId: c,
      opId: 'pay-up',
      type: 'TOPUP',
      amountPaise: 1_000_000,
      journal: {
        reference: { type: 'test-top', id: 'pay-up' },
        purpose: 'wallet-topup',
        lines: [{ accountId: await ledger.accountId('platform', 'BANK'), debitPaise: 1_000_000 }],
      },
      by: 't',
    });
    expect(await billing.retryUnpaid(c)).toMatchObject({ unpaidPaid: 1 });
    expect(await subs.current(c)).toMatchObject({ status: 'ACTIVE', pastDueSince: null });
    expect(await dunningBoard()).toEqual([]);
  });
});
