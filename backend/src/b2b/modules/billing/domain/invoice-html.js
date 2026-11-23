// @ts-check
/** The printable SaaS GST invoice (plan Stage 13 §3.8) — pure. Layout: CA to review. */

/** @param {unknown} v */
const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
/** @param {number} p */
const rupees = (p) => `₹${(p / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * @param {{ number: string, issuedAt: Date, clientName: string, period: string, sac: string,
 *   supply: { intraState: boolean, issuerGstin: string | null, clientGstin: string | null },
 *   lines: import('./rating.js').InvoiceLine[], totals: ReturnType<typeof import('./rating.js').invoiceTotals> }} f
 */
export function saasInvoiceHtml(f) {
  const rows = f.lines
    .map(
      (l) =>
        `<tr><td>${esc(l.description)}</td><td>${esc(f.sac)}</td><td class="n">${l.quantity}</td><td class="n">${rupees(l.unitPaise)}</td><td class="n">${rupees(l.amountPaise)}</td></tr>`,
    )
    .join('');
  const tax = f.supply.intraState
    ? `<tr><td colspan="4">CGST 9%</td><td class="n">${rupees(f.totals.cgstPaise)}</td></tr><tr><td colspan="4">SGST 9%</td><td class="n">${rupees(f.totals.sgstPaise)}</td></tr>`
    : `<tr><td colspan="4">IGST 18%</td><td class="n">${rupees(f.totals.igstPaise)}</td></tr>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Tax invoice ${esc(f.number)}</title><style>
body{font-family:system-ui,sans-serif;color:#111;margin:32px;font-size:13px}h1{font-size:18px;margin:0}table{width:100%;border-collapse:collapse;margin-top:16px}
td,th{border-bottom:1px solid #e5e7eb;padding:6px;text-align:left}.n{text-align:right}.muted{color:#6b7280}.tot td{font-weight:700}</style></head><body>
<h1>Tax invoice</h1><p class="muted">MusafirBaba${f.supply.issuerGstin ? ` · GSTIN ${esc(f.supply.issuerGstin)}` : ''}</p>
<p>Invoice <strong>${esc(f.number)}</strong> · ${esc(f.issuedAt.toISOString().slice(0, 10))} · for ${esc(f.period)}</p>
<p>Billed to <strong>${esc(f.clientName)}</strong>${f.supply.clientGstin ? ` · GSTIN ${esc(f.supply.clientGstin)}` : ''}</p>
<table><tr><th>Description</th><th>SAC</th><th class="n">Qty</th><th class="n">Rate</th><th class="n">Amount</th></tr>${rows}
<tr><td colspan="4">Taxable value</td><td class="n">${rupees(f.totals.taxablePaise)}</td></tr>${tax}
<tr class="tot"><td colspan="4">Total</td><td class="n">${rupees(f.totals.totalPaise)}</td></tr></table>
<p class="muted">MusafirBaba Business · care@musafirbaba.com · +91 92896 02447</p></body></html>`;
}
