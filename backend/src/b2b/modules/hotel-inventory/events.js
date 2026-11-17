// @ts-check
/** Event types (module.entity.pastVerb) this module emits. Payloads: ids + essentials only (always `orgId`). */
export const EVENTS = /** @type {const} */ ({
  /** rooms, prices or rules changed for some nights — search caches and open pages refresh */
  inventoryChanged: 'hotel-inventory.inventory.changed',
  /** a checkout's hold ran out and its rooms went back */
  holdExpired: 'hotel-inventory.hold.expired',
});
