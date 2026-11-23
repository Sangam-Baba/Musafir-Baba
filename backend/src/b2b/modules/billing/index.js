// @ts-check
/** Public interface of the billing module (SaaS invoices, collection, dunning) — other modules import only from here. */
export { GST_BPS, overageLines, chargeLines, invoiceTotals, intraState } from './domain/rating.js';
export { saasInvoiceHtml } from './domain/invoice-html.js';
export { INVOICES_COLLECTION, INVOICE_STATUSES, InvoiceRecord } from './models/invoice.model.js';
export { createBilling, invoiceDto, saasInvoiceNumber, MONTH_CLOSE_AFTER_MS, BILL } from './billing.service.js';
