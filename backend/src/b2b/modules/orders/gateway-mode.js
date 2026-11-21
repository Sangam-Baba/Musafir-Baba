// @ts-check
/**
 * The `GATEWAY` payment mode (PayU, Stage 07's payments module): a payment intent for the order's total with a window
 * that ends before the room hold, the debit account a confirmed order uses (customer advances — the payment was
 * recorded there when PayU confirmed it), and refunds to the source (repeat-safe by key).
 */
import { refundPayment } from '../payments/index.js';

/**
 * @param {{
 *   payments: ReturnType<typeof import('../payments/index.js').createPayments>,
 *   paymentsDeps: import('../payments/payments.service.js').PaymentsDeps,
 *   ledger: ReturnType<typeof import('../wallet/index.js').createLedger>,
 * }} deps
 * @returns {import('./registry.js').PaymentMode}
 */
export function createGatewayMode(deps) {
  return {
    start: (_ctx, order, opts) =>
      deps.payments.createIntent({
        purpose: 'ORDER',
        reference: { type: 'order', id: String(order._id) },
        amountPaise: order.totalPaise,
        productinfo: `Hotel booking ${order.ref}`,
        payer: { firstname: order.contact.name.split(' ')[0].slice(0, 60), email: order.contact.email, phone: order.contact.phone },
        returnUrl: opts.returnUrl,
        customerId: order.customerId ?? null,
        orgId: order.clientOrgId ?? null,
        createdBy: order.createdBy,
        windowMinutes: opts.windowMinutes,
      }),
    debitAccount: () => deps.ledger.accountId('platform', 'CUSTOMER_ADVANCES'),
    refund: async (_ctx, order, a) => {
      await refundPayment(deps.paymentsDeps, {
        intentId: a.intentId,
        amountPaise: a.amountPaise ?? order.totalPaise,
        key: a.key,
        reason: a.reason,
        by: 'system:orders',
      });
    },
  };
}
