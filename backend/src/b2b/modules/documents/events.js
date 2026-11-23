// @ts-check
/** Event types (module.entity.pastVerb) this module emits. Payloads: ids + essentials only (always `orgId`). */
export const EVENTS = /** @type {const} */ ({
  /** a voucher, invoice or receipt was issued — the customer email attaches the link */
  documentGenerated: 'documents.document.generated',
});
