// @ts-check
/**
 * Stage 08: emails to website customers (they have no bell): booking confirmed (with the link to the order's voucher,
 * invoice and receipt) and "rooms sold out — your payment is being refunded". Sent once per event (the consumer inbox)
 * to the email given at checkout, from the notification templates (values cleaned there). Without the email settings
 * nothing is sent (logged only).
 */
import { renderTemplate } from '../modules/notifications/index.js';
import { linkKey, ORDERS, OrderRecord } from '../modules/orders/index.js';

/** @param {number} paise */
const rupees = (paise) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const REFUNDED_FAILURES = ['ROOMS_LOST'];

/**
 * @param {{
 *   ordersDeps: import('../modules/orders/payment.service.js').PayDeps,
 *   publicUrl: string, linkSecret: string,
 *   send: ((message: { to: string, subject: string, text: string }) => Promise<unknown>) | null,
 *   events: { orderConfirmed: string, orderFailed: string, orderCancelled: string },
 * }} deps
 */
export function customerEmailConsumers(deps) {
  const base = deps.publicUrl.replace(/\/$/, '');
  /** @param {string} orderId */
  const load = async (orderId) =>
    /^[a-f0-9]{24}$/.test(orderId) ? /** @type {any} */ (await OrderRecord.findOne({ _id: orderId }).setOptions(ORDERS).lean()) : null;
  /** @param {any} o */
  const link = (o) => `${base}/hotels/booking/${o.ref}?key=${linkKey(deps.linkSecret, o.ref)}`;
  /** @param {any} o @param {string} key @param {Record<string, unknown>} vars */
  async function mail(o, key, vars) {
    const msg = renderTemplate(key, { name: o.contact.name, orderRef: o.ref, total: rupees(o.totalPaise), link: link(o), ...vars });
    if (!deps.send) return deps.ordersDeps.logger.info({ ref: o.ref, template: key }, 'customer email not sent (email settings missing)');
    await deps.send({ to: o.contact.email, subject: msg.subject, text: msg.text });
  }
  return [
    {
      consumer: 'customer-email-order-confirmed',
      types: [deps.events.orderConfirmed],
      handler: async (/** @type {{ payload: any }} */ e) => {
        const o = await load(String(e.payload.orderId));
        if (!o) return;
        const item = o.items[0];
        const view = /** @type {any} */ (item ? await deps.ordersDeps.handlers.get(item.type).view(item, 'BUYER') : null);
        await mail(o, 'order.confirmed-customer', {
          propertyName: view?.property?.name ?? 'your hotel',
          checkIn: view?.stay?.checkIn ?? '',
          checkOut: view?.stay?.checkOut ?? '',
        });
      },
    },
    {
      consumer: 'customer-email-order-cancelled',
      types: [deps.events.orderCancelled],
      handler: async (/** @type {{ payload: any }} */ e) => {
        const o = await load(String(e.payload.orderId));
        if (!o) return;
        let refund = 0;
        let propertyName = 'your hotel';
        for (const it of o.items) {
          const v = /** @type {any} */ (await deps.ordersDeps.handlers.get(it.type).view(it, 'BUYER'));
          refund += v.cancelled?.refundPaise ?? 0;
          propertyName = v.property?.name ?? propertyName;
        }
        await mail(o, 'order.cancelled-customer', { propertyName, refund: rupees(refund) });
      },
    },
    {
      consumer: 'customer-email-order-refunding',
      types: [deps.events.orderFailed],
      handler: async (/** @type {{ payload: any }} */ e) => {
        const o = await load(String(e.payload.orderId));
        if (!o || !o.payment?.verified || !REFUNDED_FAILURES.includes(o.failure?.code)) return;
        await mail(o, 'order.refunding-customer', {});
      },
    },
  ];
}
