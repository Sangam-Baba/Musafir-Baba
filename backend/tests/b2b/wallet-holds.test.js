// @ts-check
/**
 * Money holds (S11-T04, plan §8): 100 concurrent holds never exceed what is available (credit included); capture above
 * the hold is refused; capture posts its journal once and frees the rest; release and expiry free the money; middle
 * statuses left by a stopped process are finished; live balances match the journal throughout.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import {
  AccountRecord,
  createHolds,
  createLedger,
  createLiveWallets,
  liveInvariants,
  seedPlatformAccounts,
  TransactionRecord,
  WalletHoldRecord,
} from '../../src/b2b/modules/wallet/index.js';
import { startMongo } from './helpers/mongo.js';

let nowMs = Date.parse('2026-11-21T10:00:00Z');
const clock = { now: () => new Date(nowMs) };
const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const CLIENT = '65f000000000000000000c02';
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
let ledger = createLedger({ clock });
let wallets = createLiveWallets({ clock, ledger });
let holds = createHolds({ clock, ledger });
let n = 0;

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
});
afterAll(async () => mongo.stop());
beforeEach(async () => {
  nowMs = Date.parse('2026-11-21T10:00:00Z');
  await TransactionRecord.deleteMany({});
  await WalletHoldRecord.deleteMany({}).setOptions(S);
  await AccountRecord.deleteMany({}).setOptions(S);
  await seedPlatformAccounts();
  ledger = createLedger({ clock });
  wallets = createLiveWallets({ clock, ledger });
  holds = createHolds({ clock, ledger });
  await wallets.open(CLIENT);
});

/** @param {number} amount */
async function topUp(amount) {
  const id = `t-${(n += 1)}`;
  const bank = await ledger.accountId('platform', 'BANK');
  await wallets.apply({
    clientOrgId: CLIENT,
    opId: id,
    type: 'TOPUP',
    amountPaise: amount,
    journal: { reference: { type: 'test-topup', id }, purpose: 'wallet-topup', lines: [{ accountId: bank, debitPaise: amount }] },
    by: 'test',
  });
}
/** @param {string} key @param {number} amount */
const hold = (key, amount) => holds.hold({ clientOrgId: CLIENT, key, amountPaise: amount, ttlMs: 15 * 60_000, by: 'test' });
/** @param {string} id @param {number} amount */
async function capture(id, amount) {
  const adv = await ledger.accountId('platform', 'CUSTOMER_ADVANCES');
  return holds.capture(id, {
    amountPaise: amount,
    journal: { reference: { type: 'test-order', id }, purpose: 'order-paid-wallet', lines: [{ accountId: adv, creditPaise: amount }] },
    by: 'test',
  });
}
const check = async () => /** @type {any} */ (liveInvariants()[0]).check();

describe('holding', () => {
  it('100 holds of ₹50 at once against ₹1 000 + ₹500 credit → exactly 30 held, available never below zero', async () => {
    await topUp(100_000);
    await AccountRecord.updateOne({ ownerOrgId: CLIENT, type: 'WALLET' }, { $set: { creditLimitPaise: 50_000 } }).setOptions(S);
    const got = await Promise.allSettled(Array.from({ length: 100 }, (_, i) => hold(`order:${i}`, 5_000)));
    expect(got.filter((r) => r.status === 'fulfilled')).toHaveLength(30);
    expect(
      got.filter((r) => r.status === 'rejected').every((r) => /** @type {any} */ (r).reason.code === 'INSUFFICIENT_WALLET_BALANCE'),
    ).toBe(true);
    expect(await wallets.read(CLIENT)).toMatchObject({ balancePaise: 100_000, heldPaise: 150_000, availablePaise: 0 });
    expect(await check()).toEqual([]);
  });

  it('the same key again → the same hold; another amount under that key → refused; a failed hold is tried again', async () => {
    await topUp(10_000);
    const a = await hold('order:a', 6_000);
    expect(await hold('order:a', 6_000)).toEqual(a);
    await expect(hold('order:a', 7_000)).rejects.toMatchObject({ code: 'HOLD_KEY_REUSED' });
    await expect(hold('order:b', 6_000)).rejects.toMatchObject({ code: 'INSUFFICIENT_WALLET_BALANCE' });
    await topUp(2_000);
    expect(await hold('order:b', 6_000)).toMatchObject({ status: 'HELD' });
    expect((await wallets.read(CLIENT)).heldPaise).toBe(12_000);
  });
});

describe('capture and release', () => {
  it('capture ≤ hold: balance down by the amount, the rest freed, journal once; again → same; above the hold → refused', async () => {
    await topUp(20_000);
    const h = await hold('order:c', 10_000);
    await expect(capture(h.id, 10_001)).rejects.toMatchObject({ code: 'CAPTURE_EXCEEDS_HOLD' });
    expect(await capture(h.id, 8_000)).toMatchObject({ status: 'CAPTURED', capturedPaise: 8_000 });
    expect(await capture(h.id, 8_000)).toMatchObject({ status: 'CAPTURED', capturedPaise: 8_000 });
    expect(await wallets.read(CLIENT)).toMatchObject({ balancePaise: 12_000, heldPaise: 0, availablePaise: 12_000 });
    expect(await TransactionRecord.countDocuments({ 'reference.type': 'test-order' })).toBe(1);
    await expect(holds.release(h.id)).rejects.toMatchObject({ code: 'HOLD_NOT_HELD' });
    expect(await check()).toEqual([]);
  });

  it('two captures at once → one amount taken, once', async () => {
    await topUp(20_000);
    const h = await hold('order:d', 10_000);
    await Promise.all([capture(h.id, 10_000), capture(h.id, 10_000)]);
    expect((await wallets.read(CLIENT)).balancePaise).toBe(10_000);
    expect(await check()).toEqual([]);
  });

  it('release frees the money; a released hold cannot be captured; expiry frees holds past their time', async () => {
    await topUp(20_000);
    const h = await hold('order:e', 10_000);
    expect(await holds.release(h.id)).toMatchObject({ status: 'RELEASED' });
    expect(await holds.release(h.id)).toMatchObject({ status: 'RELEASED' });
    await expect(capture(h.id, 1_000)).rejects.toMatchObject({ code: 'HOLD_NOT_HELD' });
    await hold('order:f', 5_000);
    nowMs += 14 * 60_000;
    expect(await holds.sweep()).toEqual({ expired: 0 });
    nowMs += 2 * 60_000;
    expect(await holds.sweep()).toEqual({ expired: 1 });
    expect(await holds.byKey('order:f')).toMatchObject({ status: 'EXPIRED' });
    expect(await wallets.read(CLIENT)).toMatchObject({ balancePaise: 20_000, heldPaise: 0 });
    expect(await check()).toEqual([]);
  });
});

describe('a process stopping half-way', () => {
  it('capture stopped after the wallet step → the reconciler posts the journal once and marks it captured', async () => {
    await topUp(20_000);
    const h = await hold('order:g', 10_000);
    const adv = await ledger.accountId('platform', 'CUSTOMER_ADVANCES');
    const journal = {
      reference: { type: 'test-order', id: h.id },
      purpose: 'order-paid-wallet',
      lines: [{ accountId: adv, creditPaise: 10_000 }],
    };
    await WalletHoldRecord.updateOne(
      { _id: h.id },
      { $set: { status: 'CAPTURING', statusAt: clock.now(), capture: { amountPaise: 10_000, journal } } },
    ).setOptions(S);
    await AccountRecord.updateOne(
      { ownerOrgId: CLIENT, type: 'WALLET', 'ops.opId': `hold:${h.id}` },
      {
        $inc: { heldPaise: -10_000, balancePaise: -10_000 },
        $set: { 'ops.$.type': 'CAPTURE', 'ops.$.amountPaise': -10_000, 'ops.$.journal': journal },
      },
    ).setOptions(S);
    expect(await check()).toEqual([]);
    nowMs += 61_000;
    expect(await holds.reconcile()).toEqual({ resumed: 1, freed: 0 });
    expect(await holds.byKey('order:g')).toMatchObject({ status: 'CAPTURED' });
    expect(await TransactionRecord.countDocuments({ 'reference.type': 'test-order' })).toBe(1);
    expect(await wallets.read(CLIENT)).toMatchObject({ balancePaise: 10_000, heldPaise: 0 });
    expect(await check()).toEqual([]);
  });

  it('placing stopped before the wallet step → FAILED; a HOLD op whose hold failed → freed; release stopped → finished', async () => {
    await topUp(20_000);
    const p = await WalletHoldRecord.create({
      key: 'order:h',
      clientOrgId: CLIENT,
      accountId: (await wallets.read(CLIENT)).accountId,
      amountPaise: 3_000,
      status: 'PLACING',
      statusAt: clock.now(),
      expiresAt: new Date(nowMs + 900_000),
      createdBy: 'test',
    });
    const orphan = {
      opId: 'hold:65f0000000000000000000aa',
      type: 'HOLD',
      amountPaise: 4_000,
      holdId: '65f0000000000000000000aa',
      at: clock.now(),
    };
    await AccountRecord.updateOne(
      { ownerOrgId: CLIENT, type: 'WALLET' },
      { $inc: { heldPaise: 4_000 }, $push: { ops: orphan } },
    ).setOptions(S);
    const r = await hold('order:i', 5_000);
    await WalletHoldRecord.updateOne(
      { _id: r.id },
      { $set: { status: 'RELEASING', releaseAs: 'RELEASED', statusAt: clock.now() } },
    ).setOptions(S);
    nowMs += 61_000;
    expect(await holds.reconcile()).toEqual({ resumed: 2, freed: 1 });
    expect((await WalletHoldRecord.findById(p._id).setOptions(S).lean())?.status).toBe('FAILED');
    expect(await holds.byKey('order:i')).toMatchObject({ status: 'RELEASED' });
    expect(await wallets.read(CLIENT)).toMatchObject({ balancePaise: 20_000, heldPaise: 0 });
    expect(await check()).toEqual([]);
  });
});
