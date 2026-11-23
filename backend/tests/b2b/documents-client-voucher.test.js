// @ts-check
/**
 * The B2B client's own voucher (S12-T16, plan §7 "net rate / margin leak"): the client's name instead of MusafirBaba's,
 * the stay and guests — never an amount (no B2B price, hotel rate, margin or GST); what was typed shown as text.
 */
import { describe, expect, it } from 'vitest';

import { clientVoucherHtml } from '../../src/b2b/modules/documents/index.js';

const facts = /** @type {any} */ ({
  order: {
    ref: 'MBO-7',
    totalPaise: 1_785_00,
    confirmedAt: new Date('2026-11-20T10:00:00Z'),
    contact: { name: 'Ravi', email: 'r@t.in', phone: '1' },
    payment: {},
  },
  items: [
    {
      bookingRef: 'MBH-7',
      property: { name: 'Sea View', address: { line1: 'Marine Drive', line2: null, pin: '400002' }, city: 'Mumbai' },
      roomTypeName: 'Deluxe',
      ratePlanName: 'Flexible',
      mealPlanKey: 'cp',
      cancellation: 'Free cancellation until 2 days before check-in',
      stay: { checkIn: '2026-12-01', checkOut: '2026-12-03', nights: 2, occupancies: [{ adults: 2, children: 0 }] },
      rooms: [{ leadGuest: 'Asha Verma', guests: [] }],
      specialRequests: null,
      breakdown: {
        lines: [{ sellPaise: 75_000, gst: { cgstPaise: 4_500 } }],
        fee: null,
        totals: { sellPaise: 150_000, gstPaise: 28_500, totalPaise: 178_500 },
      },
    },
  ],
});

describe('client voucher', () => {
  it("shows the client's name, the stay and the guests — never an amount or MusafirBaba's brand", () => {
    const page = clientVoucherHtml(facts, { name: 'Trips <Co>' });
    const html = page.replace(/<style[\s\S]*?<\/style>/g, ''); // the page's styling (CSS `margin`) is not text
    expect(html).toContain('Trips &lt;Co&gt;');
    expect(html).toContain('Asha Verma');
    expect(html).toContain('Sea View');
    expect(html).not.toMatch(/₹|Rs\.?\s|1,785|1785|750\.00|285\.00|INR/);
    expect(html).not.toMatch(/class="brand">MusafirBaba/);
    expect(html).not.toMatch(/margin|net rate|GST/i);
  });
});
