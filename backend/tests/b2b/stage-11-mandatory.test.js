// @ts-check
/**
 * Stage 11 mandatory tests (plan §8). Where each one lives:
 * - 100 concurrent holds never break the floor (credit included) → wallet-holds.test.js, and here: randomised rounds of
 *   concurrent top-ups, spends, holds, captures and releases with a credit line;
 * - capture above the hold refused; expiry releases → wallet-holds.test.js;
 * - live balance = Σ journal lines (+ ops still finishing); held = Σ hold ops → every wallet test, and here after each round;
 * - op ids: never applied twice (also after finishing, crash, retry) → wallet-live.test.js;
 * - PayU top-up late success credits once, never refunded → wallet-topups.test.js;
 * - bank-transfer top-up needs two finance users; credit lines and wallet adjustments too → wallet-manual-topups,
 *   wallet-credit, wallet-adjustments tests;
 * - overdue credit blocks spending and holds; top-ups clear it → wallet-credit.test.js;
 * - statement = journal; alerts once → wallet-statement.test.js.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import {
  AccountRecord,
  createHolds,
  createLedger,
  createLiveWallets,
  ledgerInvariants,
  liveInvariants,
  seedPlatformAccounts,
  WalletHoldRecord,
} from '../../src/b2b/modules/wallet/index.js';
import { startMongo } from './helpers/mongo.js';

const clock = { now: () => new Date('2026-11-21T10:00:00Z') };
const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const CLIENT = '65f000000000000000000c11';
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  await seedPlatformAccounts();
});
afterAll(async () => mongo.stop());

/** Small seeded random numbers. @param {number} seed */
function random(seed) {
  let s = seed;
  return (/** @type {number} */ min, /** @type {number} */ max) => {
    s = (s * 1_103_515_245 + 12_345) % 2_147_483_648;
    return min + (s % (max - min + 1));
  };
}

describe('randomised concurrent wallet use', () => {
  it('20 rounds × 40 concurrent operations with a ₹5,000 credit line: never past the floor, books always agree', async () => {
    const ledger = createLedger({ clock });
    const wallets = createLiveWallets({ clock, ledger });
    const holds = createHolds({ clock, ledger });
    await wallets.open(CLIENT);
    await AccountRecord.updateOne(
      { ownerOrgId: CLIENT, type: 'WALLET' },
      { $set: { creditLimitPaise: 500_000, creditDueDays: 30, lowBalanceThresholdPaise: 0 } },
    ).setOptions(S);
    const bank = await ledger.accountId('platform', 'BANK');
    const advances = await ledger.accountId('platform', 'CUSTOMER_ADVANCES');
    const rnd = random(11);
    let n = 0;
    /** @type {string[]} */
    const held = [];
    const ops = {
      top: (/** @type {number} */ amount) =>
        wallets.apply({
          clientOrgId: CLIENT,
          opId: `t${(n += 1)}`,
          type: 'TOPUP',
          amountPaise: amount,
          journal: { reference: { type: 'mt', id: `t${n}` }, purpose: 'wallet-topup', lines: [{ accountId: bank, debitPaise: amount }] },
          by: 't',
        }),
      spend: (/** @type {number} */ amount) =>
        wallets.apply({
          clientOrgId: CLIENT,
          opId: `d${(n += 1)}`,
          type: 'DEBIT',
          amountPaise: -amount,
          journal: { reference: { type: 'mt', id: `d${n}` }, purpose: 'wallet-debit', lines: [{ accountId: bank, creditPaise: amount }] },
          by: 't',
        }),
      hold: (/** @type {number} */ amount) =>
        holds
          .hold({ clientOrgId: CLIENT, key: `h${(n += 1)}`, amountPaise: amount, ttlMs: 900_000, by: 't' })
          .then((h) => void held.push(h.id)),
      capture: (/** @type {string} */ id, /** @type {number} */ amount) =>
        holds.capture(id, {
          amountPaise: amount,
          journal: {
            reference: { type: 'mt-order', id },
            purpose: 'order-paid-wallet',
            lines: [{ accountId: advances, creditPaise: amount }],
          },
          by: 't',
        }),
    };
    for (let round = 0; round < 20; round += 1) {
      const batch = [];
      const toFinish = held.splice(0, rnd(0, held.length));
      for (const id of toFinish) batch.push(rnd(0, 1) ? ops.capture(id, rnd(1, 2_000)) : holds.release(id));
      for (let i = batch.length; i < 40; i += 1) {
        const k = rnd(0, 9);
        batch.push(k < 2 ? ops.top(rnd(1_000, 300_000)) : k < 5 ? ops.spend(rnd(1_000, 200_000)) : ops.hold(rnd(2_000, 150_000)));
      }
      const got = await Promise.allSettled(batch);
      for (const r of got)
        if (r.status === 'rejected')
          expect(['INSUFFICIENT_WALLET_BALANCE', 'CAPTURE_EXCEEDS_HOLD', 'HOLD_NOT_HELD']).toContain(/** @type {any} */ (r.reason).code);
      const w = await wallets.read(CLIENT);
      expect(w.availablePaise).toBeGreaterThanOrEqual(0); // never past the floor (balance − held + credit ≥ 0)
      expect(w.balancePaise).toBeGreaterThanOrEqual(-500_000);
      const live = await /** @type {any} */ (liveInvariants()[0]).check();
      expect(live).toEqual([]);
      const heldSum = (await WalletHoldRecord.find({ clientOrgId: CLIENT, status: 'HELD' }).setOptions(S).lean()).reduce(
        (s, h) => s + h.amountPaise,
        0,
      );
      expect(w.heldPaise).toBe(heldSum);
    }
    for (const inv of ledgerInvariants()) expect(await inv.check()).toEqual([]);
  });
});
