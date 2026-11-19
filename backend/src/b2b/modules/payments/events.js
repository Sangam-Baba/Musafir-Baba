// @ts-check
/** Event types (module.entity.pastVerb) this module emits. Payloads: ids + essentials only (always `orgId`). */
export const EVENTS = /** @type {const} */ ({
  /** PayU confirmed the payment (verify API) — the order (Stage 08) goes ahead */
  intentSucceeded: 'payments.intent.succeeded',
  /** the payment failed or was abandoned */
  intentFailed: 'payments.intent.failed',
  /** a refund reached its final state */
  refundSucceeded: 'payments.refund.succeeded',
  refundFailed: 'payments.refund.failed',
  /** reconciliation found a difference — finance looks at it */
  reconExceptionRaised: 'payments.recon.exception-raised',
});
