// @ts-check
/**
 * Stage 18 B6: emails to bus buyers (sent once per event, from the notification templates): the e-ticket when the
 * order is confirmed, and "seats gone — refund on the way" when a payment arrived after the seats were taken (the
 * engine refunds automatically). Hotel orders keep their own emails (customer-emails.js skips bus orders).
 * B2B orders go to the person who booked them; website orders to the checkout email.
 */
import { renderTemplate } from '../modules/notifications/index.js';
import { linkKey, ORDERS, OrderRecord } from '../modules/orders/index.js';
import { orderEmailTo } from './customer-emails.js';

/** @param {number} paise */
const rupees = (paise) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
/** @param {Date | string} at */
const ist = (at) =>
  new Date(at).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

/**
 * @param {{
 *   ordersDeps: import('../modules/orders/payment.service.js').PayDeps,
 *   publicUrl: string, linkSecret: string,
 *   send: ((message: { to: string, subject: string, text: string }) => Promise<unknown>) | null,
 *   events: { orderConfirmed: string, orderFailed: string },
 * }} deps
 */
export function busEmailConsumers(deps) {
  const base = deps.publicUrl.replace(/\/+$/, '');
  /** @param {string} id */
  const load = async (id) =>
    /^[a-f0-9]{24}$/.test(id)
      ? /** @type {any} */ (await OrderRecord.findOne({ _id: id, 'items.type': 'BUS' }).setOptions(ORDERS).lean())
      : null;
  /** @param {any} o */
  const link = (o) =>
    o.clientOrgId ? `${base}/business/orders/${o.ref}` : `${base}/buses/booking/${o.ref}?key=${linkKey(deps.linkSecret, o.ref)}`;
  /** @param {any} o @param {string} key @param {Record<string, unknown>} vars */
  async function mail(o, key, vars) {
    const msg = renderTemplate(key, { name: o.contact.name, orderRef: o.ref, total: rupees(o.totalPaise), link: link(o), ...vars });
    if (!deps.send) return deps.ordersDeps.logger.info({ ref: o.ref, template: key }, 'bus email not sent (email settings missing)');
    const to = await orderEmailTo(o);
    if (to) await deps.send({ to, subject: msg.subject, text: msg.text });
  }
  return [
    {
      consumer: 'bus-email-ticket',
      types: [deps.events.orderConfirmed],
      handler: async (/** @type {{ payload: any }} */ e) => {
        const o = await load(String(e.payload.orderId));
        if (!o) return;
        const v = /** @type {any} */ (await deps.ordersDeps.handlers.get('BUS').view(o.items[0], 'BUYER'));
        await mail(o, 'bus.ticket-customer', {
          pnr: v.ref,
          operator: v.operatorName,
          journey: `${v.from.name} → ${v.to.name}`,
          departure: ist(v.from.at),
          seats: v.seats.map((/** @type {any} */ s) => `${s.no} (${s.passenger.name})`).join(', '),
        });
      },
    },
    {
      consumer: 'bus-email-refunding',
      types: [deps.events.orderFailed],
      handler: async (/** @type {{ payload: any }} */ e) => {
        const o = await load(String(e.payload.orderId));
        if (!o || !o.payment?.verified || o.failure?.code !== 'ROOMS_LOST') return; // the engine's "item lost after payment"
        await mail(o, 'bus.refunding-customer', {});
      },
    },
  ];
}
