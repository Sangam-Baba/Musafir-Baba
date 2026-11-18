// @ts-check
/**
 * Which documents an organisation must upload, by org type — configuration, not code (plan Stage 02
 * §3.3: "Document sets are configuration per org type"; Stage 10 adds CLIENT here only).
 * Hotels without GST registration give a below-threshold declaration instead of a GST certificate (D31).
 */

/** @typedef {{ key: string, label: string, required: boolean, when?: 'gst-registered' | 'gst-unregistered' }} DocumentRequirement */
/** @typedef {Record<string, readonly DocumentRequirement[]>} DocumentSets */

/** @type {DocumentSets} */
export const DOCUMENT_SETS = Object.freeze({
  HOTEL: /** @type {readonly DocumentRequirement[]} */ (
    Object.freeze([
      { key: 'gst_certificate', label: 'GST registration certificate', required: true, when: 'gst-registered' },
      {
        key: 'gst_declaration',
        label: 'Declaration: turnover below the GST registration threshold',
        required: true,
        when: 'gst-unregistered',
      },
      { key: 'pan_card', label: 'PAN card of the business (or owner)', required: true },
      { key: 'registration_proof', label: 'Trade licence or business registration', required: true },
      { key: 'cancelled_cheque', label: 'Cancelled cheque of the payout bank account', required: true },
      { key: 'signed_contract', label: 'Signed MusafirBaba hotel agreement', required: true },
    ])
  ),
  // Stage 10: B2B clients (travel companies) — configuration only, the engine is unchanged
  CLIENT: /** @type {readonly DocumentRequirement[]} */ (
    Object.freeze([
      { key: 'gst_certificate', label: 'GST registration certificate', required: true, when: 'gst-registered' },
      {
        key: 'gst_declaration',
        label: 'Declaration: turnover below the GST registration threshold',
        required: true,
        when: 'gst-unregistered',
      },
      { key: 'pan_card', label: 'PAN card of the company (or owner)', required: true },
      {
        key: 'registration_proof',
        label: 'Company registration (incorporation certificate, partnership deed or trade licence)',
        required: true,
      },
      { key: 'address_proof', label: 'Office address proof (rent agreement, utility bill or property tax receipt)', required: true },
      { key: 'cancelled_cheque', label: 'Cancelled cheque of the company bank account (for refunds)', required: true },
    ])
  ),
});

/**
 * @param {string} orgType
 * @param {{ gstRegistered: boolean }} facts
 * @param {DocumentSets} [sets] configuration (tests pass their own to prove a new org type needs no code)
 * @returns {DocumentRequirement[]}
 */
export function requiredDocuments(orgType, facts, sets = DOCUMENT_SETS) {
  const set = sets[orgType];
  if (!set) throw new Error(`[b2b] no KYC document set for org type ${orgType}`);
  return set.filter((d) => !d.when || (d.when === 'gst-registered') === facts.gstRegistered);
}

/**
 * Required documents still missing.
 * @param {DocumentRequirement[]} required
 * @param {readonly { key: string }[]} uploaded
 * @returns {string[]} keys
 */
export function missingDocuments(required, uploaded) {
  const have = new Set(uploaded.map((u) => u.key));
  return required.filter((d) => d.required && !have.has(d.key)).map((d) => d.key);
}
