// @ts-check
/**
 * Booking documents (S08-T08): invoice numbers (financial year, ≤ 16 chars, gap-free under concurrency), escaping,
 * and a paid order → voucher + receipt at once, the tax invoice once MusafirBaba's GSTIN is set (no number used
 * before), new versions never overwrite, the buyer reads them through the order (strict page headers), others can't.
 */
import { describe, expect, it } from 'vitest';

import {
  documentInvariants,
  DocumentRecord,
  financialYear,
  invoiceNumber,
  NumberSeriesRecord,
  reserveNumber,
  voucherHtml,
} from '../../src/b2b/modules/documents/index.js';
import { EVENTS as ORDER_EVENTS } from '../../src/b2b/modules/orders/index.js';
import { PricingSettingsRecord, SETTINGS_ID } from '../../src/b2b/modules/pricing/index.js';
import { documentJobs } from '../../src/b2b/routes/documents-wiring.js';
import { useOrderEngine } from './helpers/order-engine.js';

const E = useOrderEngine();
const { app, clock, S, payuSays, engine, bookedOrder, stored, ctx, signed } = E;
const SESSION = 'guest-session-0000000000001';

describe('numbers and pages', () => {
  it('financial year in Indian time; MB/26-27/000123 within 16 characters', () => {
    expect(financialYear(new Date('2027-03-31T18:29:00Z'))).toBe('26-27'); // 23:59 on 31 Mar in India
    expect(financialYear(new Date('2027-03-31T18:31:00Z'))).toBe('27-28'); // 00:01 on 1 Apr in India
    expect(invoiceNumber('26-27', 123)).toBe('MB/26-27/000123');
    expect(invoiceNumber('26-27', 9_999_999)).toHaveLength(16);
    expect(() => invoiceNumber('26-27', 0)).toThrow(/INVOICE_NUMBER_INVALID/);
  });

  it('30 invoices numbered at once → 1…30, no gaps, no doubles; the same order ten times → one number', async () => {
    const at = clock.now();
    const got = await Promise.all(Array.from({ length: 30 }, (_, i) => reserveNumber('TAX_INVOICE:07:26-27', `order:o${i}`, at)));
    expect([...got].sort((a, b) => a - b)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    const same = await Promise.all(Array.from({ length: 10 }, () => reserveNumber('TAX_INVOICE:07:26-27', 'order:again', at)));
    expect(new Set(same)).toEqual(new Set([31]));
    expect((await NumberSeriesRecord.findById('TAX_INVOICE:07:26-27').lean())?.last).toBe(31);
  });

  it('what a guest typed is shown as text, never run', () => {
    const html = voucherHtml(
      /** @type {any} */ ({
        order: {
          ref: 'MBO-1',
          totalPaise: 100,
          confirmedAt: clock.now(),
          contact: { name: 'A', email: 'a@b.in', phone: '1' },
          payment: {},
        },
        items: [
          {
            bookingRef: 'MBH-1',
            property: { name: 'H', address: {}, city: null },
            roomTypeName: 'R',
            ratePlanName: 'P',
            mealPlanKey: 'ep',
            cancellation: 'x',
            stay: { checkIn: '2026-12-01', checkOut: '2026-12-02', nights: 1, occupancies: [{ adults: 1, children: 0 }] },
            rooms: [{ leadGuest: 'A', guests: [] }],
            specialRequests: '<img src=x onerror=alert(1)><script>alert(2)</script>',
          },
        ],
      }),
    );
    expect(html).not.toMatch(/<script|<img/);
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
});

describe('a paid order', () => {
  it('voucher + receipt at once; invoice only once the GSTIN is set; versions never overwrite; buyer-only pages', async () => {
    const { order } = await bookedOrder();
    const e = await engine();
    const form = await e.orderPay.start(ctx(), await stored(order.ref), { returnUrl: 'https://x' });
    payuSays.set(form.txnId, { status: 'SUCCESS', amountPaise: order.totalPaise });
    await e.payments.handleCallback(signed(form));
    await e.deliver(form.txnId);
    const o = await stored(order.ref);
    expect(o.status).toBe('CONFIRMED');
    const jobs = documentJobs(e.deps, ORDER_EVENTS.orderConfirmed);
    await jobs.consumer.handler({ payload: { orderId: String(o._id) } });
    expect((await DocumentRecord.find({}).setOptions(S).lean()).map((d) => d.type).sort()).toEqual(['RECEIPT', 'VOUCHER']);
    expect(await NumberSeriesRecord.countDocuments({})).toBe(0); // no GSTIN → no invoice, no number used
    await PricingSettingsRecord.updateOne(
      { _id: SETTINGS_ID },
      { $set: { issuers: [{ gstin: '07AABCM1234F1Z5', stateCode: '07', isDefault: true }] } },
    );
    await jobs.retryMissing();
    await jobs.retryMissing();
    const invoice = /** @type {any} */ (await DocumentRecord.findOne({ type: 'TAX_INVOICE' }).setOptions(S).lean());
    expect(invoice).toMatchObject({ number: 'MB/26-27/000001', version: 1, sha256: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(invoice.html).toContain('07AABCM1234F1Z5');
    expect(invoice.html).toContain(order.ref);
    await jobs.docs.regenerate(String(o._id), 'TAX_INVOICE');
    const versions = await DocumentRecord.find({ type: 'TAX_INVOICE' }).setOptions(S).sort({ version: 1 }).lean();
    expect(versions.map((v) => [v.version, v.number])).toEqual([
      [1, 'MB/26-27/000001'],
      [2, 'MB/26-27/000001'],
    ]);
    for (const inv of documentInvariants({ clock })) expect(await inv.check()).toEqual([]);
    // the buyer, through the order
    const list = await app.srv.get(`/api/v1/orders/${order.ref}/documents`, { 'x-guest-session': SESSION });
    expect(list.body.data.map((/** @type {any} */ d) => [d.type, d.version]).sort()).toEqual([
      ['RECEIPT', 1],
      ['TAX_INVOICE', 2],
      ['VOUCHER', 1],
    ]);
    const voucher = list.body.data.find((/** @type {any} */ d) => d.type === 'VOUCHER');
    const page = await app.srv.get(`/api/v1/orders/${order.ref}/documents/${voucher.id}`, { 'x-guest-session': SESSION });
    expect(page.status).toBe(200);
    expect(page.headers.get('content-type')).toMatch(/text\/html/);
    expect(page.headers.get('content-security-policy')).toMatch(/default-src 'none'/);
    expect(String(page.body)).toContain('Hotel voucher');
    expect(
      (await app.srv.get(`/api/v1/orders/${order.ref}/documents/${voucher.id}`, { 'x-guest-session': 'someone-else-session-000000003' }))
        .status,
    ).toBe(404);
  });
});
