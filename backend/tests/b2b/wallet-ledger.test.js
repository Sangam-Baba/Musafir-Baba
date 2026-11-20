// @ts-check
/** Ledger core (S07-T02, T03): chart of accounts, balanced repeat-safe journal entries, invariants under random entries. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import {
  AccountRecord,
  balanceOf,
  checkEntry,
  createLedger,
  PLATFORM_ACCOUNT_TYPES,
  seedPlatformAccounts,
  TransactionRecord,
} from '../../src/b2b/modules/wallet/index.js';
import { startMongo } from './helpers/mongo.js';

const clock = { now: () => new Date('2026-11-19T10:00:00Z') };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
/** a fresh ledger per test (it remembers account ids, and these tests recreate the accounts) */
let ledger = createLedger({ clock });
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
});
afterAll(async () => mongo.stop());
beforeEach(async () => {
  await TransactionRecord.deleteMany({});
  await AccountRecord.deleteMany({}).setOptions(SYSTEM);
  await seedPlatformAccounts();
  ledger = createLedger({ clock });
});

const codes = (/** @type {() => unknown} */ fn) => {
  try {
    fn();
  } catch (e) {
    return /** @type {any} */ (e).details.errors.map((/** @type {any} */ x) => x.code);
  }
  return [];
};

describe('entries (pure)', () => {
  it('balanced, at least two lines, one side per line, whole positive paise — all problems at once', () => {
    const ok = {
      reference: { type: 'test', id: '1' },
      purpose: 'payment-received',
      lines: [
        { accountId: 'a', debitPaise: 100 },
        { accountId: 'b', creditPaise: 100 },
      ],
    };
    expect(checkEntry(ok)).toHaveLength(2);
    expect(codes(() => checkEntry({ ...ok, lines: [{ accountId: 'a', debitPaise: 100 }] }))).toEqual(['LINE_COUNT', 'NOT_BALANCED']);
    expect(
      codes(() =>
        checkEntry({
          ...ok,
          lines: [
            { accountId: 'a', debitPaise: 100, creditPaise: 5 },
            { accountId: 'b', creditPaise: 95 },
          ],
        }),
      ),
    ).toEqual(['LINE_AMOUNT']);
    expect(
      codes(() =>
        checkEntry({
          ...ok,
          lines: [
            { accountId: 'a', debitPaise: -100 },
            { accountId: 'b', creditPaise: -100 },
          ],
        }),
      ),
    ).toEqual(['LINE_AMOUNT', 'LINE_AMOUNT']);
    expect(
      codes(() =>
        checkEntry({
          ...ok,
          lines: [
            { accountId: 'a', debitPaise: 10.5 },
            { accountId: 'b', creditPaise: 10.5 },
          ],
        }),
      ),
    ).toEqual(['LINE_AMOUNT', 'LINE_AMOUNT']);
    expect(codes(() => checkEntry({ ...ok, purpose: 'Bad Purpose', reference: { type: '', id: '' } }))).toEqual([
      'REFERENCE_TYPE_INVALID',
      'REFERENCE_ID_INVALID',
      'PURPOSE_INVALID',
    ]);
  });

  it('a balance is shown on the account’s normal side', () => {
    expect(balanceOf('DEBIT', 500, 200)).toBe(300);
    expect(balanceOf('CREDIT', 500, 200)).toBe(-300);
  });
});

describe('accounts', () => {
  it('MusafirBaba accounts opened once; a hotel payable once per hotel', async () => {
    expect(await AccountRecord.countDocuments({ ownerOrgId: 'platform' }).setOptions(SYSTEM)).toBe(PLATFORM_ACCOUNT_TYPES.length);
    await seedPlatformAccounts();
    expect(await AccountRecord.countDocuments({ ownerOrgId: 'platform' }).setOptions(SYSTEM)).toBe(PLATFORM_ACCOUNT_TYPES.length);
    const a = await ledger.openHotelPayable('64b0000000000000000000aa');
    expect(await ledger.openHotelPayable('64b0000000000000000000aa')).toBe(a);
    expect(await AccountRecord.findById(a).setOptions(SYSTEM).lean()).toMatchObject({
      ownerType: 'HOTEL',
      type: 'PAYABLE',
      normal: 'CREDIT',
      balanceMode: 'DERIVED',
    });
    await expect(AccountRecord.find({}).lean()).rejects.toThrow(/no ownership filter/);
  });
});

describe('posting', () => {
  it('once per reference and purpose; again → the first; same reference with other lines → refused', async () => {
    const clearing = await ledger.accountId('platform', 'GATEWAY_CLEARING');
    const advances = await ledger.accountId('platform', 'CUSTOMER_ADVANCES');
    const entry = {
      reference: { type: 'pay-intent', id: 'B2BH1' },
      purpose: 'payment-received',
      lines: [
        { accountId: clearing, debitPaise: 99750 },
        { accountId: advances, creditPaise: 99750 },
      ],
    };
    const first = await ledger.post(entry, 'system:test');
    expect(first.created).toBe(true);
    expect(await ledger.post({ ...entry, lines: [...entry.lines].reverse() }, 'system:test')).toEqual({ id: first.id, created: false });
    await expect(
      ledger.post(
        {
          ...entry,
          lines: [
            { accountId: clearing, debitPaise: 1 },
            { accountId: advances, creditPaise: 1 },
          ],
        },
        'system:test',
      ),
    ).rejects.toThrow(/JOURNAL_REFERENCE_REUSED/);
    expect(await TransactionRecord.countDocuments({})).toBe(1);
  });

  it('unknown or closed accounts are refused', async () => {
    const clearing = await ledger.accountId('platform', 'GATEWAY_CLEARING');
    const suspense = await ledger.accountId('platform', 'SUSPENSE');
    await AccountRecord.updateOne({ _id: suspense }, { $set: { status: 'CLOSED' } }).setOptions(SYSTEM);
    for (const other of [suspense, '64b0000000000000000000ff', 'not-an-id'])
      await expect(
        ledger.post(
          {
            reference: { type: 'test', id: other },
            purpose: 'x-y',
            lines: [
              { accountId: clearing, debitPaise: 5 },
              { accountId: other, creditPaise: 5 },
            ],
          },
          's',
        ),
      ).rejects.toThrow(/JOURNAL_ENTRY_INVALID/);
  });

  it('ten processes posting the same entry at once → one entry', async () => {
    const clearing = await ledger.accountId('platform', 'GATEWAY_CLEARING');
    const advances = await ledger.accountId('platform', 'CUSTOMER_ADVANCES');
    const entry = {
      reference: { type: 'pay-intent', id: 'B2BH-race' },
      purpose: 'payment-received',
      lines: [
        { accountId: clearing, debitPaise: 500 },
        { accountId: advances, creditPaise: 500 },
      ],
    };
    const results = await Promise.all(Array.from({ length: 10 }, () => ledger.post(entry, 's')));
    expect(new Set(results.map((r) => r.id)).size).toBe(1);
    expect(results.filter((r) => r.created)).toHaveLength(1);
  });

  it('randomised: 300 balanced entries over many accounts — debits always equal credits, per entry and in total', async () => {
    const accounts = await Promise.all(
      ['GATEWAY_CLEARING', 'BANK', 'GATEWAY_FEES', 'CUSTOMER_ADVANCES', 'REVENUE_MARGIN', 'TAX_PAYABLE_IGST'].map((t) =>
        ledger.accountId('platform', /** @type {any} */ (t)),
      ),
    );
    for (let i = 0; i < 300; i += 1) {
      const n = 2 + (i % 4);
      const amounts = Array.from({ length: n - 1 }, () => 1 + Math.floor(Math.random() * 1_000_000));
      const total = amounts.reduce((s, a) => s + a, 0);
      const lines = [
        ...amounts.map((a, k) => ({ accountId: /** @type {string} */ (accounts[(i + k) % accounts.length]), debitPaise: a })),
        { accountId: /** @type {string} */ (accounts[(i + n) % accounts.length]), creditPaise: total },
      ];
      await ledger.post({ reference: { type: 'test', id: String(i) }, purpose: 'random-entry', lines }, 's');
    }
    const [sum] = await TransactionRecord.aggregate([
      { $unwind: '$lines' },
      { $group: { _id: null, d: { $sum: '$lines.debitPaise' }, c: { $sum: '$lines.creditPaise' } } },
    ]);
    expect(sum.d).toBe(sum.c);
    const perEntry = await TransactionRecord.aggregate([
      { $project: { d: { $sum: '$lines.debitPaise' }, c: { $sum: '$lines.creditPaise' } } },
      { $match: { $expr: { $ne: ['$d', '$c'] } } },
    ]);
    expect(perEntry).toEqual([]);
  });
});
