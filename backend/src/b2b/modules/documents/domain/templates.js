// @ts-check
/**
 * The three booking documents (plan Stage 08 §3.8), as pure functions of the order's facts (copies kept at booking
 * time — never today's hotel data): the **voucher** (what the guest shows at the hotel), the **GST tax invoice** (from
 * MusafirBaba's registration: GSTINs, place of supply, SAC, taxable value, rate, CGST / SGST or IGST) and the
 * **receipt** (the payment). Layout of the invoice: CA to review.
 */
import { day, esc, moment, page, rupees } from './html.js';

/**
 * @typedef {{ date: string, room: number, sellPaise: number, gst: { rateBps: number, sac: string, cgstPaise: number,
 *   sgstPaise: number, igstPaise: number, issuerGstin: string | null, issuerState: string, placeOfSupply: string } }} Night
 * @typedef {{ bookingRef: string, property: { name: string, address: { line1: string | null, line2: string | null, pin: string | null },
 *   city: string | null, area: string | null, checkInTime: string | null, checkOutTime: string | null },
 *   roomTypeName: string, ratePlanName: string, mealPlanKey: string | null, cancellation: string,
 *   stay: { checkIn: string, checkOut: string, nights: number, occupancies: { adults: number, children: number }[] },
 *   rooms: { leadGuest: string, guests: string[] }[], specialRequests: string | null,
 *   breakdown: { lines: Night[], fee: { sellPaise: number, cgstPaise: number, sgstPaise: number, igstPaise: number } | null,
 *     totals: { sellPaise: number, gstPaise: number, totalPaise: number } } }} ItemFacts
 * @typedef {{ ref: string, totalPaise: number, confirmedAt: Date | string, contact: { name: string, email: string, phone: string },
 *   payment: { txnId: string | null, gatewayPaymentId: string | null, mode: string | null, paidAt: Date | string | null } }} OrderPart
 * @typedef {{ order: OrderPart, items: ItemFacts[] }} OrderFacts
 */

const MEAL = /** @type {Record<string, string>} */ ({
  ep: 'Room only',
  cp: 'Breakfast included',
  map: 'Breakfast and one meal',
  ap: 'All meals',
});
const SUPPORT = 'MusafirBaba support: +91 92896 02447 · care@musafirbaba.com'; // as on musafirbaba.com

/** @param {ItemFacts['property']['address'] & { city?: string | null }} a */
const address = (a) => [a.line1, a.line2, a.city, a.pin].filter(Boolean).map(esc).join(', ');

/** @param {string} title @param {string} subtitle */
const head = (title, subtitle) =>
  `<header><div><div class="brand">MusafirBaba</div><div class="muted">musafirbaba.com</div></div><div style="text-align:right"><h1>${esc(title)}</h1><div class="muted">${subtitle}</div></div></header>`;

/** @param {ItemFacts} it */
function voucherItem(it) {
  const guests = it.stay.occupancies.map((o, i) => {
    const r = it.rooms[i];
    const who = [r?.leadGuest, ...(r?.guests ?? [])].filter(Boolean).map(esc).join(', ');
    return `<tr><td>Room ${i + 1}</td><td>${who}</td><td>${o.adults} adult${o.adults > 1 ? 's' : ''}${o.children ? `, ${o.children} child${o.children > 1 ? 'ren' : ''}` : ''}</td></tr>`;
  });
  return `<div class="grid"><div class="box"><strong>${esc(it.property.name)}</strong><br>${address({ ...it.property.address, city: it.property.city })}</div>
<div class="box">Check-in <strong>${esc(day(it.stay.checkIn))}</strong>${it.property.checkInTime ? ` from ${esc(it.property.checkInTime)}` : ''}<br>
Check-out <strong>${esc(day(it.stay.checkOut))}</strong>${it.property.checkOutTime ? ` by ${esc(it.property.checkOutTime)}` : ''}<br>${it.stay.nights} night${it.stay.nights > 1 ? 's' : ''}</div></div>
<h2>Room</h2><p>${esc(it.roomTypeName)} · ${esc(it.ratePlanName)}${it.mealPlanKey ? ` · ${esc(MEAL[it.mealPlanKey] ?? it.mealPlanKey)}` : ''}</p>
<h2>Guests</h2><table><tr><th>Room</th><th>Guests</th><th>Occupancy</th></tr>${guests.join('')}</table>
${it.specialRequests ? `<h2>Special requests</h2><p>${esc(it.specialRequests)} <span class="muted">(passed to the hotel; not guaranteed)</span></p>` : ''}
<h2>Cancellation</h2><p>${esc(it.cancellation)}</p><p class="muted">Booking reference ${esc(it.bookingRef)}</p>`;
}

/**
 * The B2B client's own voucher for its guest (plan Stage 12 §3.6, Stage 15 white-label): the client's name, logo,
 * colour and contact instead of MusafirBaba's, the stay and guests only — never a price, the hotel rate or MusafirBaba's
 * margin. Colour and logo are checked again here (only `#rrggbb` and an `https://` link are ever printed).
 * @param {OrderFacts} f
 * @param {{ name: string, contactPhone?: string | null, contactEmail?: string | null, colour?: string | null, logoUrl?: string | null }} brand
 */
export function clientVoucherHtml(f, brand) {
  const colour = brand.colour && /^#[0-9a-fA-F]{6}$/.test(brand.colour) ? ` style="color:${brand.colour}"` : '';
  const logo =
    brand.logoUrl && /^https:\/\/[^\s"'<>()\\]+$/.test(brand.logoUrl)
      ? `<img src="${esc(brand.logoUrl)}" alt="" style="max-height:48px;max-width:180px;display:block;padding-bottom:4px">`
      : '';
  const contact = [brand.contactPhone, brand.contactEmail]
    .filter(Boolean)
    .map((c) => esc(String(c)))
    .join(' · ');
  const body = `<header><div>${logo}<div class="brand"${colour}>${esc(brand.name)}</div></div><div style="text-align:right"><h1>Hotel voucher</h1><div class="muted">Booking ${esc(f.order.ref)}</div></div></header><p>Lead guest: <strong>${esc(f.items[0]?.rooms[0]?.leadGuest ?? f.order.contact.name)}</strong> · <strong>Confirmed</strong></p>
${f.items.map(voucherItem).join('<hr>')}<p>Please carry a government photo ID for every guest. Show this voucher at check-in.</p><footer>Booked through ${esc(brand.name)} — contact them for any help with this booking${contact ? `: ${contact}` : '.'}</footer>`;
  return page(`Voucher ${f.order.ref}`, body);
}

/** @param {OrderFacts} f */
export function voucherHtml(f) {
  const body = `${head('Hotel voucher', `Booking ${esc(f.order.ref)}`)}<p>Lead guest: <strong>${esc(f.order.contact.name)}</strong> · Booked ${esc(moment(f.order.confirmedAt))} · <strong>Confirmed and paid</strong></p>
${f.items.map(voucherItem).join('<hr>')}<p>Please carry a government photo ID for every guest. Show this voucher at check-in.</p><footer>${esc(SUPPORT)}</footer>`;
  return page(`Voucher ${f.order.ref}`, body);
}

/**
 * Invoice lines: room-nights grouped by SAC and rate, plus the fee if any. Sums only (each night already rounded).
 * @param {ItemFacts[]} items
 */
export function invoiceLines(items) {
  /** @type {Map<string, { description: string, sac: string, rateBps: number, qty: number, taxablePaise: number, cgstPaise: number, sgstPaise: number, igstPaise: number }>} */
  const rows = new Map();
  for (const it of items) {
    for (const l of it.breakdown.lines) {
      const k = `${it.bookingRef}|${l.gst.sac}|${l.gst.rateBps}`;
      const r = rows.get(k) ?? {
        description: `Accommodation — ${it.property.name}, ${it.roomTypeName} (${day(it.stay.checkIn)} – ${day(it.stay.checkOut)})`,
        sac: l.gst.sac,
        rateBps: l.gst.rateBps,
        qty: 0,
        taxablePaise: 0,
        cgstPaise: 0,
        sgstPaise: 0,
        igstPaise: 0,
      };
      r.qty += 1;
      r.taxablePaise += l.sellPaise;
      r.cgstPaise += l.gst.cgstPaise;
      r.sgstPaise += l.gst.sgstPaise;
      r.igstPaise += l.gst.igstPaise;
      rows.set(k, r);
    }
    const fee = it.breakdown.fee;
    if (fee)
      rows.set(`${it.bookingRef}|fee`, {
        description: 'Booking service fee',
        sac: '—',
        rateBps: 0,
        qty: 1,
        taxablePaise: fee.sellPaise,
        cgstPaise: fee.cgstPaise,
        sgstPaise: fee.sgstPaise,
        igstPaise: fee.igstPaise,
      });
  }
  return [...rows.values()];
}

/**
 * @param {OrderFacts} f
 * @param {{ number: string, issuedAt: Date, gstin: string }} n the number, when, and MusafirBaba's GSTIN for that registration
 */
export function taxInvoiceHtml(f, n) {
  const first = /** @type {Night} */ (f.items[0]?.breakdown.lines[0]);
  const lines = invoiceLines(f.items);
  const sum = (/** @type {'taxablePaise' | 'cgstPaise' | 'sgstPaise' | 'igstPaise'} */ k) => lines.reduce((s, l) => s + l[k], 0);
  const rows = lines
    .map(
      (l) =>
        `<tr><td>${esc(l.description)}</td><td>${esc(l.sac)}</td><td class="n">${l.qty}</td><td class="n">${rupees(l.taxablePaise)}</td><td class="n">${l.rateBps / 100}%</td><td class="n">${rupees(l.cgstPaise)}</td><td class="n">${rupees(l.sgstPaise)}</td><td class="n">${rupees(l.igstPaise)}</td></tr>`,
    )
    .join('');
  const body = `${head('Tax invoice', `No. <strong>${esc(n.number)}</strong> · ${esc(moment(n.issuedAt))}`)}
<div class="grid"><div class="box"><strong>Supplier</strong><br>MusafirBaba<br>GSTIN ${esc(n.gstin)}<br>State code ${esc(first.gst.issuerState)}</div>
<div class="box"><strong>Billed to</strong><br>${esc(f.order.contact.name)}<br>${esc(f.order.contact.email)}<br>Place of supply: state ${esc(first.gst.placeOfSupply)}</div></div>
<p class="muted">Order ${esc(f.order.ref)}</p>
<table><tr><th>Description</th><th>SAC</th><th class="n">Qty (room-nights)</th><th class="n">Taxable value</th><th class="n">Rate</th><th class="n">CGST</th><th class="n">SGST</th><th class="n">IGST</th></tr>${rows}
<tr class="total"><td colspan="3">Total</td><td class="n">${rupees(sum('taxablePaise'))}</td><td></td><td class="n">${rupees(sum('cgstPaise'))}</td><td class="n">${rupees(sum('sgstPaise'))}</td><td class="n">${rupees(sum('igstPaise'))}</td></tr></table>
<p><strong>Invoice total (incl. GST): ${rupees(f.order.totalPaise)}</strong></p><footer>This is a computer-generated invoice. ${esc(SUPPORT)}</footer>`;
  return page(`Tax invoice ${n.number}`, body);
}

/** @param {OrderFacts} f */
export function receiptHtml(f) {
  const p = f.order.payment;
  const body = `${head('Payment receipt', `Order ${esc(f.order.ref)}`)}
<table><tr><th>Received from</th><td>${esc(f.order.contact.name)} (${esc(f.order.contact.email)})</td></tr>
<tr><th>Amount</th><td><strong>${rupees(f.order.totalPaise)}</strong> (incl. GST)</td></tr>
<tr><th>Paid on</th><td>${esc(p.paidAt ? moment(p.paidAt) : moment(f.order.confirmedAt))}</td></tr>
<tr><th>Paid through</th><td>PayU${p.mode ? ` · ${esc(p.mode)}` : ''}</td></tr>
<tr><th>Transaction</th><td>${esc(p.txnId)}${p.gatewayPaymentId ? ` · PayU id ${esc(p.gatewayPaymentId)}` : ''}</td></tr>
<tr><th>For</th><td>${f.items.map((it) => `${esc(it.property.name)} — ${esc(day(it.stay.checkIn))} to ${esc(day(it.stay.checkOut))} (${esc(it.bookingRef)})`).join('<br>')}</td></tr></table>
<footer>${esc(SUPPORT)}</footer>`;
  return page(`Receipt ${f.order.ref}`, body);
}

/**
 * @typedef {{ orderRef: string, bookingRef: string, propertyName: string, contact: { name: string, email: string },
 *   invoiceNumber: string, invoiceDate: Date | string, gstin: string, issuerState: string, placeOfSupply: string,
 *   sac: string, rateBps: number, taxablePaise: number, cgstPaise: number, sgstPaise: number, igstPaise: number,
 *   refundPaise: number, reason: string }} CreditFacts
 */

/**
 * The GST credit note for a refund (plan Stage 09 §3.10): against the original tax invoice, the refunded taxable value
 * and its GST — the same amounts the ledger reversed.
 * @param {CreditFacts} c
 * @param {{ number: string, issuedAt: Date }} n
 */
export function creditNoteHtml(c, n) {
  const body = `${head('Credit note', `No. <strong>${esc(n.number)}</strong> · ${esc(moment(n.issuedAt))}`)}
<div class="grid"><div class="box"><strong>Supplier</strong><br>MusafirBaba<br>GSTIN ${esc(c.gstin)}<br>State code ${esc(c.issuerState)}</div>
<div class="box"><strong>Issued to</strong><br>${esc(c.contact.name)}<br>${esc(c.contact.email)}<br>Place of supply: state ${esc(c.placeOfSupply)}</div></div>
<p>Against tax invoice <strong>${esc(c.invoiceNumber)}</strong> of ${esc(moment(c.invoiceDate))} · order ${esc(c.orderRef)} · booking ${esc(c.bookingRef)}</p>
<table><tr><th>Description</th><th>SAC</th><th class="n">Taxable value</th><th class="n">Rate</th><th class="n">CGST</th><th class="n">SGST</th><th class="n">IGST</th></tr>
<tr><td>${esc(c.reason)} — ${esc(c.propertyName)}</td><td>${esc(c.sac)}</td><td class="n">${rupees(c.taxablePaise)}</td><td class="n">${c.rateBps / 100}%</td><td class="n">${rupees(c.cgstPaise)}</td><td class="n">${rupees(c.sgstPaise)}</td><td class="n">${rupees(c.igstPaise)}</td></tr>
<tr class="total"><td colspan="2">Total credited</td><td class="n">${rupees(c.taxablePaise)}</td><td></td><td class="n">${rupees(c.cgstPaise)}</td><td class="n">${rupees(c.sgstPaise)}</td><td class="n">${rupees(c.igstPaise)}</td></tr></table>
<p><strong>Amount refunded (incl. GST): ${rupees(c.refundPaise)}</strong></p><footer>This is a computer-generated credit note. ${esc(SUPPORT)}</footer>`;
  return page(`Credit note ${n.number}`, body);
}
