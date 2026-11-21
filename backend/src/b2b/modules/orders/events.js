// @ts-check
/** Event types (module.entity.pastVerb) this module emits. Payloads: ids + essentials only (always `orgId`). */
export const EVENTS = /** @type {const} */ ({
  /** rooms held, waiting for payment */
  orderCreated: 'orders.order.created',
  /** paid (verified) and every item confirmed — documents, customer and hotel notices follow */
  orderConfirmed: 'orders.order.confirmed',
  /** could not complete (rooms lost, held too long); a payment, if any, is refunded */
  orderFailed: 'orders.order.failed',
  /** the payment window ran out with nothing paid; rooms given back */
  orderExpired: 'orders.order.expired',
  /** every booking of a confirmed order cancelled by the buyer (refund on its way) */
  orderCancelled: 'orders.order.cancelled',
});
