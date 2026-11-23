// @ts-check
/** Credit notes (S09-T06): number format; a cancelled booking's refund → one credit note against its invoice, amounts = the reversal, gap-free; none without a GSTIN or an invoice. */
import { describe, expect, it } from 'vitest';

import { creditNoteNumber, documentInvariants, DocumentRecord, NumberSeriesRecord } from '../../src/b2b/modules/documents/index.js';
import { BookingRecord } from '../../src/b2b/modules/hotel-booking/index.js';
import { EVENTS as ORDER_EVENTS } from '../../src/b2b/modules/orders/index.js';
import { PricingSettingsRecord, SETTINGS_ID } from '../../src/b2b/modules/pricing/index.js';
import { documentJobs } from '../../src/b2b/routes/documents-wiring.js';
import { useOrderEngine } from './helpers/order-engine.js';
import { seedPricing, sellableHotel } from './helpers/search-setup.js';

const E = useOrderEngine();
const { app, clock, S, payuSays, engine, bookedOrder, newOrder, stored, ctx, signed } = E;
let n = 0;

/** A paid booking for this guest session, its documents issued, then cancelled through the website API. @param {string} session @param {any} [hotel] */
async function paidThenCancelled(session, hotel) {
  const order = hotel ? await newOrder(hotel, session) : (await bookedOrder()).order;
  const e = await engine();
  const form = await e.orderPay.start(ctx(), await stored(order.ref), { returnUrl: 'https://x' });
  payuSays.set(form.txnId, { status: 'SUCCESS', amountPaise: order.totalPaise });
  await e.payments.handleCallback(signed(form));
  await e.deliver(form.txnId);
  const o = await stored(order.ref);
  const jobs = documentJobs(e.deps, ORDER_EVENTS.orderConfirmed);
  await jobs.consumer.handler({ payload: { orderId: String(o._id) } });
  const ref = o.items[0].bookingRef;
  const me = { 'x-guest-session': session };
  const q = (await app.srv.post(`/api/v1/bookings/hotels/${ref}/cancellation-quote`, {}, me)).body;
  n += 1;
  await app.srv.post(
    `/api/v1/bookings/hotels/${ref}/cancel`,
    { quoteToken: q.quoteToken },
    { ...me, 'idempotency-key': `credit-key-${String(n).padStart(8, '0')}` },
  );
  return { order, o, jobs, bookingId: o.items[0].bookingId };
}

describe('credit notes', () => {
  it('C + financial year + state letters + gap-free number, at most 16 characters', () => {
    expect(creditNoteNumber('26-27', '07', 45)).toBe('C2627DL000045');
    expect(creditNoteNumber('26-27', '27', 1)).toBe('C2627MH000001');
    expect(creditNoteNumber('26-27', '07', 999_999).length).toBeLessThanOrEqual(16);
    expect(() => creditNoteNumber('26-27', '07', 0)).toThrow(/CREDIT_NOTE_NUMBER_INVALID/);
  });

  it('a refunded cancellation → one credit note against the invoice, amounts = the reversal; repeats add nothing; numbers have no gaps', async () => {
    await seedPricing(clock);
    await PricingSettingsRecord.updateOne(
      { _id: SETTINGS_ID },
      { $set: { issuers: [{ gstin: '07AABCM1234F1Z5', stateCode: '07', isDefault: true }] } },
    );
    const first = await paidThenCancelled('guest-session-0000000000001');
    await first.jobs.creditNotes.handler({ payload: { orderId: String(first.o._id), bookingId: first.bookingId } });
    await first.jobs.creditNotes.handler({ payload: { orderId: String(first.o._id), bookingId: first.bookingId } });
    const notes = await DocumentRecord.find({ type: 'CREDIT_NOTE' }).setOptions(S).lean();
    expect(notes).toHaveLength(1);
    const invoice = /** @type {any} */ (
      await DocumentRecord.findOne({ type: 'TAX_INVOICE', orderId: String(first.o._id) })
        .setOptions(S)
        .lean()
    );
    expect(notes[0]).toMatchObject({ number: 'C2627DL000001', againstNumber: invoice.number, subjectId: first.bookingId, version: 1 });
    const b = /** @type {any} */ (await BookingRecord.findById(first.bookingId).setOptions(S).lean());
    const t = b.price.totals;
    const part = (/** @type {number} */ x) => Math.round((x * b.cancellation.refundPaise) / t.totalPaise);
    const rupees = (/** @type {number} */ p) =>
      `₹${(p / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    expect(notes[0]?.html).toContain(invoice.number);
    expect(notes[0]?.html).toContain(
      rupees(part(t.igstPaise) + part(t.cgstPaise) === 0 ? part(t.sgstPaise) : part(t.igstPaise) || part(t.cgstPaise)),
    );
    expect(notes[0]?.html).toContain(rupees(b.cancellation.refundPaise));
    // the buyer sees it with the other documents
    const list = await app.srv.get(`/api/v1/orders/${first.order.ref}/documents`, { 'x-guest-session': 'guest-session-0000000000001' });
    expect(list.body.data.map((/** @type {any} */ d) => d.type)).toContain('CREDIT_NOTE');
    const h = await sellableHotel(app);
    const second = await paidThenCancelled('guest-session-0000000000002', h);
    await second.jobs.creditNotes.handler({ payload: { orderId: String(second.o._id), bookingId: second.bookingId } });
    expect((await DocumentRecord.find({ type: 'CREDIT_NOTE' }).setOptions(S).lean()).map((d) => d.number).sort()).toEqual([
      'C2627DL000001',
      'C2627DL000002',
    ]);
    E.nowMs += 11 * 60_000;
    for (const inv of documentInvariants({ clock })) expect(await inv.check()).toEqual([]);
  });

  it('no GSTIN set → no credit note and no number used (issued later by the retry job once the GSTIN is set)', async () => {
    const c = await paidThenCancelled('guest-session-0000000000001');
    expect(await c.jobs.docs.issueCreditNote(String(c.o._id), c.bookingId)).toEqual({ skipped: 'ISSUER_GSTIN_MISSING' });
    expect(await NumberSeriesRecord.countDocuments({ _id: /^CREDIT_NOTE/ })).toBe(0);
  });
});
