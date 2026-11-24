// @ts-check
/** Public interface of the documents module — other modules import only from here. */
export { EVENTS } from './events.js';
export { PERMISSION_CATALOGUE, PERMISSIONS } from './permissions.js';
export {
  INVOICE_PREFIX,
  MAX_INVOICE_LENGTH,
  STATE_LETTERS,
  financialYear,
  seriesKey,
  invoiceNumber,
  creditSeriesKey,
  creditNoteNumber,
} from './domain/numbering.js';
export { esc, page } from './domain/html.js';
export { voucherHtml, clientVoucherHtml, taxInvoiceHtml, receiptHtml, invoiceLines, creditNoteHtml } from './domain/templates.js';
export { DOCUMENTS_COLLECTION, DOCUMENT_TYPES, DocumentRecord } from './models/document.model.js';
export { NUMBER_SERIES_COLLECTION, NumberSeriesRecord } from './models/number-series.model.js';
export { createDocuments, reserveNumber, documentInvariants, taxDocumentsBetween, invoiceTax } from './documents.service.js';
