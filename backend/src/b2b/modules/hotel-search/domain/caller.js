// @ts-check
/**
 * Who is searching, as decided by the search gateway (never by the request body): the pricing channel, the
 * catalogue channel for visibility, and the buyer.
 * @typedef {{ channel: 'WEBSITE' | 'B2B_PORTAL', catalogChannel: 'WEBSITE' | 'B2B', clientOrgId: string | null,
 *   clientCategory: string | null, customerId: string | null }} SearchCaller
 */
export const WEBSITE_CALLER = /** @type {SearchCaller} */ (
  Object.freeze({ channel: 'WEBSITE', catalogChannel: 'WEBSITE', clientOrgId: null, clientCategory: null, customerId: null })
);
