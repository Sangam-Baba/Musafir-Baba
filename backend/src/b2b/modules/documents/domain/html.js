// @ts-check
/**
 * Safe HTML for documents (plan Stage 08 §8 "PDF template injection"): every value escaped, one self-contained page
 * (inline styles, no scripts, no images or fonts from elsewhere) that prints well — the browser's "Save as PDF" makes
 * the file. Pure.
 */

/** @param {unknown} v */
export function esc(v) {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Rupees from paise, Indian grouping, two decimals: 123456 → "₹1,234.56". @param {number} paise */
export const rupees = (paise) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** 'YYYY-MM-DD' → '1 Dec 2026'. @param {string} date */
export const day = (date) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** A moment in Indian time: '19 Nov 2026, 3:30 pm'. @param {Date | string} at */
export const moment = (at) =>
  new Date(at).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });

const STYLE = `
body{font-family:Arial,Helvetica,sans-serif;color:#1f2937;margin:0;padding:32px;font-size:13px;line-height:1.45}
.doc{max-width:760px;margin:0 auto}
header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #FE5300;padding-bottom:12px;margin-bottom:18px}
h1{font-size:20px;margin:0 0 4px}h2{font-size:14px;margin:18px 0 6px;color:#374151}
.brand{font-size:18px;font-weight:bold;color:#FE5300}.muted{color:#6b7280}
table{width:100%;border-collapse:collapse;margin-top:6px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb;vertical-align:top}
th{background:#f9fafb;font-size:12px;color:#4b5563}td.n,th.n{text-align:right}
.total td{font-weight:bold;border-top:2px solid #111827}.box{border:1px solid #e5e7eb;border-radius:6px;padding:10px 12px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}footer{margin-top:24px;font-size:11px;color:#6b7280}
@media print{body{padding:0}}`;

/**
 * A whole document page. `body` must already be escaped HTML (built with `esc`).
 * @param {string} title
 * @param {string} body
 */
export function page(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${STYLE}</style></head><body><div class="doc">${body}</div></body></html>`;
}
