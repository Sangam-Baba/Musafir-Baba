// @ts-check
/**
 * Paying from the wallet (S12-T13): money held → rooms confirmed → money taken → journal as the table says → CONFIRMED;
 * not enough money → rooms given back and the order failed; credit line used when the balance is short; a paid order
 * stopped half-way is finished by the reconciler once; rooms lost after the money was held → hold freed, nothing taken;
 * cancelled → refund straight into the wallet.
 */
import { describe, expect, it } from 'vitest';

import { BookingRecord } from '../../src/b2b/modules/hotel-booking/index.js';
import { HoldRecord, sweepHolds } from '../../src/b2b/modules/hotel-inventory/index.js';
import { confirmForward, createOrderCancellations, OrderRecord } from '../../src/b2b/modules/orders/index.js';
import { AccountRecord, createHolds, createLedger, TransactionRecord, WalletHoldRecord } from '../../src/b2b/modules/wallet/index.js';
import { useOrderEngine } from './helpers/order-engine.js';

const E = useOrderEngine();
const { clock, S, logger, engine, bookedOrder, newOrder, stored, ctx } = E;
let n = 0;

/** A held website-style order turned into a B2B client's order, with the client's wallet topped up. @param {number} topUpPaise @param {number} [rooms] */
async function clientOrder(topUpPaise, rooms = 3) {
  const { h, order } = await bookedOrder(rooms);
  const client = `65f0000000000000000c${String((n += 1)).padStart(4, '0')}`;
  await OrderRecord.updateOne({ ref: order.ref }, { $set: { clientOrgId: client, guestKey: null, channel: 'B2B_PORTAL' } }).setOptions(S);
  const e = await engine();
  await e.wallets.open(client);
  if (topUpPaise > 0) {
    const bank = await e.deps.ledger.accountId('platform', 'BANK');
    await e.wallets.apply({
      clientOrgId: client,
      opId: `top-${client}`,
      type: 'TOPUP',
      amountPaise: topUpPaise,
      journal: {
        reference: { type: 'test-top', id: client },
        purpose: 'wallet-topup',
        lines: [{ accountId: bank, debitPaise: topUpPaise }],
      },
      by: 'test',
    });
  }
  return { h, e, client, order: await stored(order.ref) };
}
/** @param {string} client */
const wallet = async (client) =>
  /** @type {any} */ (await AccountRecord.findOne({ ownerOrgId: client, type: 'WALLET' }).setOptions(S).lean());
/** @param {any} o */
const booking = async (o) =>
  /** @type {any} */ (
    await BookingRecord.findOne({ orderId: String(o._id) })
      .setOptions(S)
      .lean()
  );

describe('pay from the wallet', () => {
  it('money held → rooms booked → money taken → entries as the table says → CONFIRMED; a repeat changes nothing', async () => {
    const { e, client, order } = await clientOrder(10_000_000);
    const r = await e.orderPay.start(ctx(), order, { returnUrl: '', mode: 'WALLET' });
    expect(r).toMatchObject({ action: 'WALLET', status: 'CONFIRMED' });
    const o = await stored(order.ref);
    expect(o).toMatchObject({ status: 'CONFIRMED', paymentMode: 'WALLET', journalPosted: true, payment: { verified: true } });
    expect((await booking(o)).status).toBe('CONFIRMED');
    const w = await wallet(client);
    expect(w).toMatchObject({ balancePaise: 10_000_000 - o.totalPaise, heldPaise: 0 });
    expect(
      (
        await WalletHoldRecord.findOne({ key: `order:${o._id}` })
          .setOptions(S)
          .lean()
      )?.status,
    ).toBe('CAPTURED');
    // the table: Dr wallet / Cr customer advances, then Dr customer advances / Cr hotel payable + GST + margin
    const advances = await createLedger({ clock }).accountId('platform', 'CUSTOMER_ADVANCES');
    const paid = /** @type {any} */ (
      await TransactionRecord.findOne({ 'reference.type': 'order-wallet', 'reference.id': String(o._id) }).lean()
    );
    expect(paid.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ accountId: String(w._id), debitPaise: o.totalPaise }),
        expect.objectContaining({ accountId: advances, creditPaise: o.totalPaise }),
      ]),
    );
    const confirmed = /** @type {any} */ (
      await TransactionRecord.findOne({ 'reference.type': 'order', 'reference.id': String(o._id) }).lean()
    );
    expect(confirmed.lines[0]).toMatchObject({ accountId: advances, debitPaise: o.totalPaise });
    await expect(e.orderPay.start(ctx(), o, { returnUrl: '', mode: 'WALLET' })).rejects.toMatchObject({ code: 'ORDER_NOT_PAYABLE' });
    expect(await TransactionRecord.countDocuments({ 'reference.id': String(o._id) })).toBe(2);
  });

  it('not enough money → rooms given back, order FAILED, wallet untouched', async () => {
    const { e, client, order } = await clientOrder(1_000);
    await expect(e.orderPay.start(ctx(), order, { returnUrl: '', mode: 'WALLET' })).rejects.toMatchObject({
      code: 'INSUFFICIENT_WALLET_BALANCE',
    });
    const o = await stored(order.ref);
    expect(o).toMatchObject({ status: 'FAILED', failure: { code: 'INSUFFICIENT_WALLET_BALANCE' } });
    const b = await booking(o);
    expect(b.status).toBe('FAILED');
    expect((await HoldRecord.findOne({ _id: b.holdId }).setOptions(S).lean())?.status).toBe('RELEASED');
    expect(await wallet(client)).toMatchObject({ balancePaise: 1_000, heldPaise: 0 });
  });

  it('short on balance but a credit line covers it → confirmed, the wallet below zero', async () => {
    const { e, client, order } = await clientOrder(1_000);
    await AccountRecord.updateOne(
      { ownerOrgId: client, type: 'WALLET' },
      { $set: { creditLimitPaise: 50_000_000, creditDueDays: 15 } },
    ).setOptions(S);
    expect((await e.orderPay.start(ctx(), order, { returnUrl: '', mode: 'WALLET' })).status).toBe('CONFIRMED');
    const w = await wallet(client);
    expect(w.balancePaise).toBe(1_000 - order.totalPaise);
    expect(w.negativeSince).not.toBeNull();
  });
});

describe('stopped half-way', () => {
  it('money held, order CONFIRMING, process stopped → the reconciler confirms and takes the money once', async () => {
    const { e, client, order } = await clientOrder(10_000_000);
    const h = await createHolds({ clock, ledger: e.deps.ledger }).hold({
      clientOrgId: client,
      key: `order:${order._id}`,
      amountPaise: order.totalPaise,
      ttlMs: 3_600_000,
      by: 't',
    });
    await OrderRecord.updateOne(
      { _id: order._id },
      {
        $set: {
          status: 'CONFIRMING',
          paymentMode: 'WALLET',
          'payment.verified': true,
          'payment.verifiedIntentId': h.id,
          'payment.intentId': h.id,
        },
      },
    ).setOptions(S);
    expect(await confirmForward(e.deps, await stored(order.ref))).toBe('CONFIRMED');
    expect(await confirmForward(e.deps, { ...(await stored(order.ref)), status: 'CONFIRMING' })).toBe('CONFIRMED');
    expect(await wallet(client)).toMatchObject({ balancePaise: 10_000_000 - order.totalPaise, heldPaise: 0 });
    expect(await TransactionRecord.countDocuments({ 'reference.type': 'order-wallet' })).toBe(1);
  });

  it('rooms lost after the money was held → order FAILED, hold freed, nothing taken', async () => {
    const { h, e, client, order } = await clientOrder(10_000_000, 1);
    const hold = await createHolds({ clock, ledger: e.deps.ledger }).hold({
      clientOrgId: client,
      key: `order:${order._id}`,
      amountPaise: order.totalPaise,
      ttlMs: 3_600_000,
      by: 't',
    });
    await OrderRecord.updateOne(
      { _id: order._id },
      {
        $set: {
          status: 'CONFIRMING',
          paymentMode: 'WALLET',
          'payment.verified': true,
          'payment.verifiedIntentId': hold.id,
          'payment.intentId': hold.id,
        },
      },
    ).setOptions(S);
    E.nowMs += 16 * 60_000;
    await sweepHolds({ clock, logger });
    await newOrder(h, 'someone-else-session-00000009'); // the last room goes to someone else
    expect(await confirmForward(e.deps, await stored(order.ref))).toBe('FAILED');
    expect(await stored(order.ref)).toMatchObject({ status: 'FAILED', failure: { code: 'ROOMS_LOST' } });
    expect(await wallet(client)).toMatchObject({ balancePaise: 10_000_000, heldPaise: 0 });
    expect((await WalletHoldRecord.findById(hold.id).setOptions(S).lean())?.status).toBe('RELEASED');
  });
});

describe('cancelled', () => {
  it('refund straight into the wallet, once', async () => {
    const { e, client, order } = await clientOrder(10_000_000);
    await e.orderPay.start(ctx(), order, { returnUrl: '', mode: 'WALLET' });
    const o = await stored(order.ref);
    const cancellations = createOrderCancellations(e.deps);
    const b = await booking(o);
    await cancellations.cancel({ order: o, bookingRef: b.ref, chargePaise: 0, refundPaise: o.totalPaise, by: 'test' });
    await cancellations.finishBooking(String(o._id), String(b._id));
    expect(await wallet(client)).toMatchObject({ balancePaise: 10_000_000, heldPaise: 0 });
    expect(await TransactionRecord.countDocuments({ purpose: 'wallet-refund' })).toBe(1);
    expect((await stored(order.ref)).status).toBe('CANCELLED');
  });
});
