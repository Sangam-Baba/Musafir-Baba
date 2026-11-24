// @ts-check
/** Event types of the api-access module. Payloads: ids + essentials only. */
export const EVENTS = /** @type {const} */ ({
  keyCreated: 'api-access.key.created',
  keyRevoked: 'api-access.key.revoked',
  keyNewIp: 'api-access.key.used-new-ip',
});
