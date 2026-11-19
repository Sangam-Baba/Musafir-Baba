// @ts-check
/** Paying and confirming (S08-T04, T05): verified payment → rooms booked → ledger entry as the table says → CONFIRMED; pending, failed, extra payment; paid after the hold expired (rooms free → confirmed; gone → FAILED + refund once). */
import { describe, expect, it } from 'vitest';

import { BookingRecord } from '../../src/b2b/modules/hotel-booking/index.js';
import { HoldRecord, sweepHolds } from '../../src/b2b/modules/hotel-inventory/index.js';
import { OrderRecord } from '../../src/b2b/modules/orders/index.js';
import { IntentRecord, pollPayments, RefundRecord } from '../../src/b2b/modules/payments/index.js';
import { AccountRecord, TransactionRecord } from '../../src/b2b/modules/wallet/index.js';
import { useOrderEngine } from './helpers/order-engine.js';

const E = useOrderEngine();
const { clock, S, logger, payuSays, engine, bookedOrder, newOrder, stored, ctx, signed } = E;

describe('pay with PayU', () => {
  it('verified → rooms booked → one ledger entry as the table says → CONFIRMED; repeats change nothing', async () => {
    const { order } = await bookedOrder();
    const e = await engine();
    const form = await e.orderPay.start(ctx(), await stored(order.ref), { returnUrl: 'https://musafirbaba.com/hotels/booking/x' });
    expect(form).toMatchObject({
      action: 'https://test.payu.in/_payment',
      txnId: expect.stringMatching(/^B2BH/),
      fields: { amount: (order.totalPaise / 100).toFixed(2) },
    });
    expect(new Date(form.windowEndsAt).getTime()).toBe(E.nowMs + 12 * 60_000); // min(12 min, 15 − 2)
    expect((await IntentRecord.findOne({ txnId: form.txnId }).lean())?.windowEndsAt?.getTime()).toBe(E.nowMs + 12 * 60_000);
    payuSays.set(form.txnId, { status: 'SUCCESS', amountPaise: order.totalPaise });
    expect((await e.payments.handleCallback(signed(form))).status).toBe('SUCCEEDED');
    await e.deliver(form.txnId);
    const o = await stored(order.ref);
    expect(o).toMatchObject({ status: 'CONFIRMED', journalPosted: true, payment: { verified: true } });
    const b = /** @type {any} */ (
      await BookingRecord.findOne({ orderId: String(o._id) })
        .setOptions(S)
        .lean()
    );
    expect(b.status).toBe('CONFIRMED');
    expect((await HoldRecord.findOne({ _id: b.holdId }).setOptions(S).lean())?.status).toBe('CONFIRMED');
    // the expected postings: PayU → customer advances; confirmation → hotel payable + GST payable + margin
    const [entry] = await TransactionRecord.find({ 'reference.type': 'order' }).lean();
    const t = b.price.totals;
    const accounts = new Map((await AccountRecord.find({}).setOptions(S).lean()).map((a) => [String(a._id), a.type]));
    const byType = Object.fromEntries(
      (entry?.lines ?? []).map((l) => [accounts.get(l.accountId), [l.debitPaise ?? 0, l.creditPaise ?? 0]]),
    );
    expect(byType.CUSTOMER_ADVANCES).toEqual([order.totalPaise, 0]);
    expect(byType.PAYABLE).toEqual([0, t.hotelPayablePaise]);
    expect((byType.TAX_PAYABLE_CGST?.[1] ?? 0) + (byType.TAX_PAYABLE_SGST?.[1] ?? 0) + (byType.TAX_PAYABLE_IGST?.[1] ?? 0)).toBe(
      t.gstPaise,
    );
    expect(byType.REVENUE_MARGIN).toEqual([0, order.totalPaise - t.hotelPayablePaise - t.gstPaise]);
    expect(await TransactionRecord.countDocuments({ purpose: 'payment-received' })).toBe(1);
    await e.deliver(form.txnId);
    await e.payments.handleCallback(signed(form));
    expect(await TransactionRecord.countDocuments({ 'reference.type': 'order' })).toBe(1);
    expect((await stored(order.ref)).history.filter((/** @type {any} */ h) => h.status === 'CONFIRMED')).toHaveLength(1);
  });

  it('a payment starts only while waiting and with enough hold left: < 5 min → extended once first; then too late', async () => {
    const { order } = await bookedOrder();
    const e = await engine();
    E.nowMs += 11 * 60_000; // 4 minutes of hold left
    const form = await e.orderPay.start(ctx(), await stored(order.ref), { returnUrl: 'https://x' });
    const o = await stored(order.ref);
    expect(o.holdExtended).toBe(true);
    expect(new Date(o.holdExpiresAt).getTime()).toBe(Date.parse('2026-11-19T10:25:00Z'));
    expect(new Date(form.windowEndsAt).getTime()).toBe(Date.parse('2026-11-19T10:23:00Z')); // hold end − 2 min
    E.nowMs += 11 * 60_000; // 3 minutes left, already extended
    await OrderRecord.updateOne({ ref: order.ref }, { $set: { status: 'AWAITING_PAYMENT' } }).setOptions(S);
    await expect(e.orderPay.start(ctx(), await stored(order.ref), { returnUrl: 'https://x' })).rejects.toThrow(/HOLD_ENDING/);
  });

  it('PayU pending → PAYMENT_PENDING with the hold extended once; failed → back to waiting (pay again)', async () => {
    const { order } = await bookedOrder();
    const e = await engine();
    const form = await e.orderPay.start(ctx(), await stored(order.ref), { returnUrl: 'https://x' });
    payuSays.set(form.txnId, { status: 'PENDING' });
    E.nowMs += 2 * 60_000;
    await pollPayments(e.paymentsDeps);
    await e.deliver(form.txnId);
    expect(await stored(order.ref)).toMatchObject({ status: 'PAYMENT_PENDING', holdExtended: true });
    payuSays.set(form.txnId, { status: 'FAILURE' });
    E.nowMs += 2 * 60_000;
    await pollPayments(e.paymentsDeps);
    await e.deliver(form.txnId);
    expect((await stored(order.ref)).status).toBe('AWAITING_PAYMENT');
    const again = await e.orderPay.start(ctx(), await stored(order.ref), { returnUrl: 'https://x' });
    expect(again.txnId).not.toBe(form.txnId);
  });

  it('two payments both succeed → the order confirmed once, the second refunded to its source', async () => {
    const { order } = await bookedOrder();
    const e = await engine();
    const first = await e.orderPay.start(ctx(), await stored(order.ref), { returnUrl: 'https://x' });
    const second = await e.orderPay.start(ctx(), await stored(order.ref), { returnUrl: 'https://x' });
    for (const f of [first, second]) {
      payuSays.set(f.txnId, { status: 'SUCCESS', amountPaise: order.totalPaise });
      await e.payments.handleCallback(signed(f));
    }
    await e.deliver(first.txnId);
    await e.deliver(second.txnId);
    await e.deliver(second.txnId);
    expect((await stored(order.ref)).status).toBe('CONFIRMED');
    expect(await RefundRecord.find({}).lean()).toEqual([
      expect.objectContaining({ txnId: second.txnId, key: `extra:${second.txnId}`, amountPaise: order.totalPaise }),
    ]);
    expect(E.refundCalls).toHaveLength(1);
  });
});

describe('paid after the hold expired', () => {
  it('rooms still free → held again and confirmed', async () => {
    const { order } = await bookedOrder();
    const e = await engine();
    const form = await e.orderPay.start(ctx(), await stored(order.ref), { returnUrl: 'https://x' });
    E.nowMs += 16 * 60_000;
    await sweepHolds({ clock, logger }); // the hold expires and its rooms go back
    payuSays.set(form.txnId, { status: 'SUCCESS', amountPaise: order.totalPaise });
    await e.payments.handleCallback(signed(form));
    await e.deliver(form.txnId);
    const o = await stored(order.ref);
    expect(o.status).toBe('CONFIRMED');
    const b = /** @type {any} */ (
      await BookingRecord.findOne({ orderId: String(o._id) })
        .setOptions(S)
        .lean()
    );
    expect(b).toMatchObject({ status: 'CONFIRMED', holdIds: [expect.any(String), expect.any(String)] });
    expect(E.refundCalls).toHaveLength(0);
  });

  it('rooms gone → order FAILED, booking FAILED, payment refunded to the source once', async () => {
    const { h, order } = await bookedOrder(1);
    const e = await engine();
    const form = await e.orderPay.start(ctx(), await stored(order.ref), { returnUrl: 'https://x' });
    E.nowMs += 16 * 60_000;
    await sweepHolds({ clock, logger });
    await newOrder(h, 'someone-else-session-00000002'); // the last room goes to someone else
    payuSays.set(form.txnId, { status: 'SUCCESS', amountPaise: order.totalPaise });
    await e.payments.handleCallback(signed(form));
    await e.deliver(form.txnId);
    await e.deliver(form.txnId);
    const o = await stored(order.ref);
    expect(o).toMatchObject({ status: 'FAILED', failure: { code: 'ROOMS_LOST' }, payment: { verified: true, refundKey: 'rooms-lost' } });
    expect(
      (
        await BookingRecord.findOne({ orderId: String(o._id) })
          .setOptions(S)
          .lean()
      )?.status,
    ).toBe('FAILED');
    expect(await RefundRecord.find({}).lean()).toEqual([
      expect.objectContaining({ txnId: form.txnId, key: 'rooms-lost', amountPaise: order.totalPaise }),
    ]);
    expect(E.refundCalls).toHaveLength(1);
    expect(await TransactionRecord.countDocuments({ 'reference.type': 'order' })).toBe(0); // nothing confirmed
  });

  it('PayU confirms after the payment window (abandoned) → the order still decides: held again and confirmed', async () => {
    const { order } = await bookedOrder();
    const e = await engine();
    const form = await e.orderPay.start(ctx(), await stored(order.ref), { returnUrl: 'https://x' });
    E.nowMs += 13 * 60_000;
    await pollPayments(e.paymentsDeps); // not found at PayU after the window → abandoned
    expect((await IntentRecord.findOne({ txnId: form.txnId }).lean())?.failureReason).toBe('ABANDONED');
    E.nowMs += 61 * 60_000;
    await sweepHolds({ clock, logger });
    payuSays.set(form.txnId, { status: 'SUCCESS', amountPaise: order.totalPaise });
    await pollPayments(e.paymentsDeps); // late success → `paid-late`
    await e.deliver(form.txnId);
    expect((await stored(order.ref)).status).toBe('CONFIRMED');
    expect(E.refundCalls).toHaveLength(0);
  });
});
