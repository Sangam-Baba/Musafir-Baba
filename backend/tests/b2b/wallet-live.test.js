// @ts-check
/**
 * Live client wallets (S11-T02, T03): opened once per client, balance moved only by op-id updates (never twice), debits
 * only within what is available (concurrent debits never overdraw), the journal entry posted once, ops left half-way
 * finished by the reconciler, the hourly check catches a balance that doesn't match the journal.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { OrganizationRecord } from '../../src/b2b/modules/organizations/index.js';
import {
  AccountRecord,
  createLedger,
  createLiveWallets,
  liveInvariants,
  seedPlatformAccounts,
  TransactionRecord,
} from '../../src/b2b/modules/wallet/index.js';
import { openMissingWallets } from '../../src/b2b/routes/wallet-wiring.js';
import { startMongo } from './helpers/mongo.js';

let nowMs = Date.parse('2026-11-21T10:00:00Z');
const clock = { now: () => new Date(nowMs) };
const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const CLIENT = '65f000000000000000000c01';
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
let ledger = createLedger({ clock });
let wallets = createLiveWallets({ clock, ledger });
let n = 0;

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
});
afterAll(async () => mongo.stop());
beforeEach(async () => {
  nowMs = Date.parse('2026-11-21T10:00:00Z');
  await TransactionRecord.deleteMany({});
  await AccountRecord.deleteMany({}).setOptions(S);
  await seedPlatformAccounts();
  ledger = createLedger({ clock });
  wallets = createLiveWallets({ clock, ledger });
  await wallets.open(CLIENT);
});

/** A move of `amount` against MusafirBaba's bank (+ top-up, − spend). @param {number} amount @param {string} [opId] */
async function move(amount, opId = `op-${(n += 1)}`) {
  const bank = await ledger.accountId('platform', 'BANK');
  const counter = amount > 0 ? { accountId: bank, debitPaise: amount } : { accountId: bank, creditPaise: -amount };
  return wallets.apply({
    clientOrgId: CLIENT,
    opId,
    type: amount > 0 ? 'TOPUP' : 'DEBIT',
    amountPaise: amount,
    journal: { reference: { type: 'test-op', id: opId }, purpose: amount > 0 ? 'wallet-topup' : 'wallet-debit', lines: [counter] },
    by: 'test',
  });
}
const check = async () => /** @type {any} */ (liveInvariants()[0]).check();

describe('opening', () => {
  it('one wallet per client, repeat-safe, starts at zero; active clients without one are opened by the job', async () => {
    const id = await wallets.open(CLIENT);
    expect(await wallets.open(CLIENT)).toBe(id);
    expect(await AccountRecord.countDocuments({ ownerOrgId: CLIENT, type: 'WALLET' }).setOptions(S)).toBe(1);
    expect(await wallets.read(CLIENT)).toMatchObject({ balancePaise: 0, heldPaise: 0, availablePaise: 0, creditUsedPaise: 0 });
    await expect(wallets.read('65f000000000000000000c99')).rejects.toMatchObject({ code: 'WALLET_NOT_FOUND' });

    await OrganizationRecord.deleteMany({}).setOptions(S);
    const base = { reference: 'MBC-TEST', legalName: 'A', displayName: 'A' };
    await OrganizationRecord.collection.insertMany([
      { ...base, type: 'CLIENT', status: 'ACTIVE', reference: 'MBC-1' },
      { ...base, type: 'CLIENT', status: 'ONBOARDING', reference: 'MBC-2' },
      { ...base, type: 'HOTEL', status: 'ACTIVE', reference: 'MBH-3' },
    ]);
    expect(await openMissingWallets(wallets)).toBe(1);
    expect(await openMissingWallets(wallets)).toBe(0);
  });
});

describe('moving the balance', () => {
  it('top-up and spend: balance moves, one journal entry each, the op cleared; the same op again → nothing', async () => {
    expect(await move(50_000, 'top-1')).toEqual({ applied: true });
    expect(await move(50_000, 'top-1')).toEqual({ applied: false });
    expect(await move(-20_000, 'spend-1')).toEqual({ applied: true });
    const w = await wallets.read(CLIENT);
    expect(w).toMatchObject({ balancePaise: 30_000, availablePaise: 30_000 });
    expect(await TransactionRecord.countDocuments({ 'reference.type': 'test-op' })).toBe(2);
    expect(/** @type {any} */ (await AccountRecord.findById(w.accountId).setOptions(S).lean()).ops).toEqual([]);
    expect(await check()).toEqual([]);
  });

  it('a spend above what is available is refused; zero and fractions are refused', async () => {
    await move(10_000);
    await expect(move(-10_001)).rejects.toMatchObject({ code: 'INSUFFICIENT_WALLET_BALANCE' });
    await expect(move(0)).rejects.toMatchObject({ code: 'AMOUNT_INVALID' });
    await expect(move(10.5)).rejects.toMatchObject({ code: 'AMOUNT_INVALID' });
    expect((await wallets.read(CLIENT)).balancePaise).toBe(10_000);
  });

  it('30 spends of ₹100 at once against ₹1 000 → exactly 10 succeed, never below zero, books match', async () => {
    await move(100_000);
    const got = await Promise.allSettled(Array.from({ length: 30 }, () => move(-10_000)));
    expect(got.filter((r) => r.status === 'fulfilled')).toHaveLength(10);
    expect((await wallets.read(CLIENT)).balancePaise).toBe(0);
    expect(await check()).toEqual([]);
  });

  it('a credit line lets the balance go below zero up to the limit; credit used and since-when are tracked', async () => {
    await AccountRecord.updateOne({ ownerOrgId: CLIENT, type: 'WALLET' }, { $set: { creditLimitPaise: 50_000 } }).setOptions(S);
    await move(-30_000);
    let w = await wallets.read(CLIENT);
    expect(w).toMatchObject({ balancePaise: -30_000, creditUsedPaise: 30_000, availablePaise: 20_000 });
    expect(w.negativeSince).toEqual(clock.now());
    await expect(move(-20_001)).rejects.toMatchObject({ code: 'INSUFFICIENT_WALLET_BALANCE' });
    await move(40_000);
    w = await wallets.read(CLIENT);
    expect(w).toMatchObject({ balancePaise: 10_000, creditUsedPaise: 0, negativeSince: null });
  });
});

describe('crashes and the hourly check', () => {
  it('balance moved but the process stopped before the journal → the reconciler posts it once and clears the op', async () => {
    const w = await wallets.read(CLIENT);
    const bank = await ledger.accountId('platform', 'BANK');
    const op = {
      opId: 'crash-1',
      type: 'TOPUP',
      amountPaise: 7_000,
      at: clock.now(),
      journal: { reference: { type: 'test-op', id: 'crash-1' }, purpose: 'wallet-topup', lines: [{ accountId: bank, debitPaise: 7_000 }] },
    };
    await AccountRecord.updateOne({ _id: w.accountId }, { $inc: { balancePaise: 7_000 }, $push: { ops: op } }).setOptions(S);
    expect(await check()).toEqual([]); // pending ops count until finished
    expect(await wallets.reconcileOps()).toEqual({ finished: 0 }); // younger than 60 s — its owner may still be on it
    nowMs += 61_000;
    expect(await wallets.reconcileOps()).toEqual({ finished: 1 });
    expect(await wallets.reconcileOps()).toEqual({ finished: 0 });
    expect(await TransactionRecord.countDocuments({ 'reference.id': 'crash-1' })).toBe(1);
    expect(await move(7_000, 'crash-1')).toEqual({ applied: false }); // the caller retrying → already done
    expect((await wallets.read(CLIENT)).balancePaise).toBe(7_000);
    expect(await check()).toEqual([]);
  });

  it('a retry while the op is still pending finishes it instead of applying it again', async () => {
    const w = await wallets.read(CLIENT);
    const bank = await ledger.accountId('platform', 'BANK');
    const journal = { reference: { type: 'test-op', id: 'p-1' }, purpose: 'wallet-topup', lines: [{ accountId: bank, debitPaise: 5_000 }] };
    await AccountRecord.updateOne(
      { _id: w.accountId },
      { $inc: { balancePaise: 5_000 }, $push: { ops: { opId: 'p-1', type: 'TOPUP', amountPaise: 5_000, at: clock.now(), journal } } },
    ).setOptions(S);
    expect(await move(5_000, 'p-1')).toEqual({ applied: false });
    expect((await wallets.read(CLIENT)).balancePaise).toBe(5_000);
    expect(await check()).toEqual([]);
  });

  it('a balance changed by hand (not through an op) is reported', async () => {
    await move(10_000);
    await AccountRecord.updateOne({ ownerOrgId: CLIENT, type: 'WALLET' }, { $inc: { balancePaise: 1 } }).setOptions(S);
    expect(await check()).toEqual([expect.objectContaining({ detail: expect.stringContaining('balance 10001') })]);
  });
});
