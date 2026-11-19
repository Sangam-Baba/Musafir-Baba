// @ts-check
/** Derived balances (S07-T04): roll-up from the journal, repeat-safe when cut short, batches, invariant catches damage. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import {
  AccountRecord,
  BalanceSnapshotRecord,
  balancesOf,
  createLedger,
  JOURNAL_CURSOR,
  ledgerInvariants,
  rollUpBalances,
  seedPlatformAccounts,
  TransactionRecord,
} from '../../src/b2b/modules/wallet/index.js';
import { startMongo } from './helpers/mongo.js';

const clock = { now: () => new Date('2026-11-19T10:00:00Z') };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
let ledger = createLedger({ clock });
let clearing = '';
let advances = '';
let fees = '';

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
});
afterAll(async () => mongo.stop());
beforeEach(async () => {
  await Promise.all([
    TransactionRecord.deleteMany({}),
    BalanceSnapshotRecord.deleteMany({}),
    AccountRecord.deleteMany({}).setOptions(SYSTEM),
  ]);
  await seedPlatformAccounts();
  ledger = createLedger({ clock });
  [clearing, advances, fees] = await Promise.all([
    ledger.accountId('platform', 'GATEWAY_CLEARING'),
    ledger.accountId('platform', 'CUSTOMER_ADVANCES'),
    ledger.accountId('platform', 'GATEWAY_FEES'),
  ]);
});

/** @param {string} id @param {number} amount */
const paid = (id, amount) =>
  ledger.post(
    {
      reference: { type: 'pay-intent', id },
      purpose: 'payment-received',
      lines: [
        { accountId: clearing, debitPaise: amount },
        { accountId: advances, creditPaise: amount },
      ],
    },
    's',
  );
const balance = async (/** @type {string} */ id) => (await balancesOf([id]))[0]?.balancePaise;

describe('roll-up', () => {
  it('balances follow the journal, each on its normal side', async () => {
    await paid('a', 99750);
    await paid('b', 89250);
    await ledger.post(
      {
        reference: { type: 'settlement', id: 's1' },
        purpose: 'gateway-fee',
        lines: [
          { accountId: fees, debitPaise: 3780 },
          { accountId: clearing, creditPaise: 3780 },
        ],
      },
      's',
    );
    expect(await rollUpBalances({ clock })).toBe(3);
    expect(await balance(clearing)).toBe(99750 + 89250 - 3780); // asset: debits − credits
    expect(await balance(advances)).toBe(189000); // liability: credits − debits
    expect(await balance(fees)).toBe(3780);
    expect(await rollUpBalances({ clock })).toBe(0); // nothing new
    await paid('c', 1000);
    await rollUpBalances({ clock });
    expect(await balance(advances)).toBe(190000);
  });

  it('a run cut short after some accounts is finished by the next run without counting anything twice', async () => {
    await paid('a', 500);
    await paid('b', 700);
    const last = String((await TransactionRecord.findOne({}).sort({ _id: -1 }).lean())?._id);
    // the cut-short run had already updated CLEARING (to the batch's last entry) but not ADVANCES, nor the cursor
    await BalanceSnapshotRecord.create({ accountId: clearing, debitPaise: 1200, creditPaise: 0, asOfTransactionId: last, at: clock.now() });
    await rollUpBalances({ clock });
    expect(await balance(clearing)).toBe(1200);
    expect(await balance(advances)).toBe(1200);
    expect((await BalanceSnapshotRecord.findOne({ accountId: JOURNAL_CURSOR }).lean())?.asOfTransactionId).toBe(last);
  });

  it('reads the journal in batches (1 000 at a time)', async () => {
    const docs = Array.from({ length: 1500 }, (_, i) => ({
      reference: { type: 'test', id: String(i) },
      purpose: 'bulk',
      lines: [
        { accountId: clearing, debitPaise: 1, creditPaise: 0 },
        { accountId: advances, debitPaise: 0, creditPaise: 1 },
      ],
      memo: null,
      createdBy: 's',
      at: clock.now(),
    }));
    await TransactionRecord.insertMany(docs);
    expect(await rollUpBalances({ clock })).toBe(1000);
    expect(await rollUpBalances({ clock })).toBe(500);
    expect(await balance(clearing)).toBe(1500);
  });
});

describe('invariant', () => {
  it('a snapshot that does not match its journal lines is reported', async () => {
    await paid('a', 500);
    await rollUpBalances({ clock });
    const [check] = ledgerInvariants();
    expect(await check?.check()).toEqual([]);
    await BalanceSnapshotRecord.updateOne({ accountId: clearing }, { $inc: { debitPaise: 1 } }); // someone "fixed" a balance by hand
    expect(await check?.check()).toEqual([{ id: clearing, detail: 'snapshot 501 / 0, journal 500 / 0' }]);
  });
});
