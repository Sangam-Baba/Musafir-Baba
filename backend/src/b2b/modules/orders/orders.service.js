// @ts-check
/**
 * Creating and reading orders (plan Stage 08 §3.3, §7). No transactions (`01-…` §8):
 *   price check (token re-priced now; changed / sold out → refused, nothing taken)
 *   → order `HOLDING` (unique per idempotency key) → item prepared (rooms held, booking `HELD`)
 *   → order `AWAITING_PAYMENT` (+ `orders.order.created`).
 * A crash in between leaves `HOLDING`; the reconciler gives the rooms back and fails it (`holdingRule`).
 * The same buyer sending the same token again within 2 minutes with a new key → `DUPLICATE_ORDER_SUSPECTED`
 * (with the order), unless they say it's on purpose (`confirmDuplicate`).
 * Reading: the buyer only — signed-in customer, the guest's browser session, the order link's key — or staff.
 * Everyone else gets 404.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import { newEvent } from '../../core/db/events.js';
import { systemScope } from '../../core/db/tenant-plugin.js';
import { transition } from '../../core/db/transition.js';
import { ConflictError, NotFoundError, ValidationError } from '../../core/errors.js';
import { newReference, parseReference } from '../../core/ids.js';
import { EVENTS } from './events.js';
import { checkBuyerInput, DUPLICATE_WINDOW_MINUTES } from './domain/order.js';
import { OrderRecord } from './models/order.model.js';

export const ORDERS = systemScope('orders: booking engine', { routine: true });
const DUPLICATE_KEY = 11000;

/**
 * @typedef {import('../../core/context.js').RequestContext} Ctx
 * @typedef {import('./registry.js').OrderInfo} OrderInfo
 * @typedef {{
 *   clock: import('../../core/clock.js').Clock,
 *   logger: import('../../core/logger.js').Logger,
 *   handlers: ReturnType<typeof import('./registry.js').createItemHandlers>,
 *   modes: ReturnType<typeof import('./registry.js').createPaymentModes>,
 * }} OrdersDeps
 * @typedef {{ clientOrgId: string | null, customerId: string | null, guestKey: string | null }} Buyer
 * @typedef {{ channel: 'WEBSITE' | 'B2B_PORTAL' | 'B2B_API' | 'ADMIN', buyer: Buyer, createdBy: string,
 *   idempotency: { scope: string, key: string }, ip: string | null, paymentMode: 'GATEWAY' | 'WALLET' | 'CREDIT',
 *   contact: { name: string, email: string, phone: string }, confirmDuplicate?: boolean,
 *   item: { type: 'HOTEL', input: { caller: unknown, priceToken: string, rooms: { leadGuest: string, guests?: string[] }[], specialRequests?: string | null } } }} CreateInput
 * @typedef {{ customerId?: string | null, guestKey?: string | null, accessKey?: string | null, linkSecret?: string, clientOrgId?: string | null, staff?: boolean }} Viewer
 */

/** @param {string} text */
export const fingerprint = (text) => createHash('sha256').update(text).digest('base64url');

/**
 * The key in an order's private link (guests, emails): derived from the server secret and the reference, so nothing
 * secret is stored and the email can rebuild the link.
 * @param {string} secret
 * @param {string} ref
 */
export const linkKey = (secret, ref) => createHmac('sha256', secret).update(`order-link:${ref}`).digest('base64url').slice(0, 32);

/** @param {string} a @param {string} b */
const sameText = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** @param {Record<string, any>} o @returns {OrderInfo} */
export const orderInfo = (o) => ({
  id: String(o._id),
  ref: o.ref,
  channel: o.channel,
  buyer: { clientOrgId: o.clientOrgId ?? null, customerId: o.customerId ?? null, guestKey: o.guestKey ?? null },
  contact: o.contact,
});

/** @param {Record<string, any>} filter */
async function findOrder(filter) {
  return /** @type {Record<string, any> | null} */ (await OrderRecord.findOne(filter).setOptions(ORDERS).lean());
}

/** @param {Buyer} b */
const buyerFilter = (b) =>
  b.customerId ? { customerId: b.customerId } : b.clientOrgId ? { clientOrgId: b.clientOrgId } : { guestKey: b.guestKey };

/**
 * An order for the same token by the same buyer in the last 2 minutes that is still going (or confirmed).
 * @param {OrdersDeps} deps
 * @param {Buyer} buyer
 * @param {string} tokenHash
 */
async function recentTwin(deps, buyer, tokenHash) {
  const since = new Date(deps.clock.now().getTime() - DUPLICATE_WINDOW_MINUTES * 60_000);
  return findOrder({ ...buyerFilter(buyer), tokenHash, createdAt: { $gte: since }, status: { $nin: ['FAILED', 'EXPIRED'] } });
}

/**
 * @param {OrdersDeps} deps
 * @param {CreateInput} input
 * @param {{ totalPaise: number, gstPaise: number, tokenHash: string }} priced
 */
async function insertHolding(deps, input, priced) {
  const now = deps.clock.now();
  try {
    const o = await OrderRecord.create({
      ref: newReference('MBO'),
      channel: input.channel,
      ...input.buyer,
      createdBy: input.createdBy,
      idempotency: input.idempotency,
      tokenHash: priced.tokenHash,
      ip: input.ip,
      contact: {
        name: input.contact.name.trim(),
        email: input.contact.email.trim().toLowerCase(),
        phone: input.contact.phone.replace(/[\s-]/g, ''),
      },
      totalPaise: priced.totalPaise,
      gstPaise: priced.gstPaise,
      paymentMode: input.paymentMode,
      status: 'HOLDING',
      statusChangedAt: now,
      history: [{ at: now, status: 'HOLDING', by: input.createdBy }],
    });
    return /** @type {Record<string, any>} */ (o.toObject());
  } catch (e) {
    if (/** @type {any} */ (e)?.code !== DUPLICATE_KEY) throw e;
    return null; // the same idempotency key won a moment earlier
  }
}

/**
 * @param {OrdersDeps} deps
 * @param {Ctx} ctx
 * @param {CreateInput} input
 */
async function create(deps, ctx, input) {
  const problems = checkBuyerInput({
    contact: input.contact,
    rooms: input.item.input.rooms,
    specialRequests: input.item.input.specialRequests,
  });
  if (problems.length > 0) throw new ValidationError({ problems });
  const byKey = { 'idempotency.scope': input.idempotency.scope, 'idempotency.key': input.idempotency.key };
  const again = await findOrder(byKey);
  if (again) return again;
  deps.modes.get(input.paymentMode); // refuse a payment mode this engine doesn't have yet, before taking rooms
  const handler = deps.handlers.get(input.item.type);
  const priced = await handler.price(ctx, input.item.input);
  if (!input.confirmDuplicate) {
    const twin = await recentTwin(deps, input.buyer, priced.tokenHash);
    if (twin) throw new ConflictError('DUPLICATE_ORDER_SUSPECTED', { ref: twin.ref, orderStatus: twin.status });
  }
  const order = await insertHolding(deps, input, priced);
  if (!order) return /** @type {Record<string, any>} */ (await findOrder(byKey));
  return hold(deps, ctx, order, priced);
}

/**
 * Rooms held and the order waiting for payment — or failed, with the rooms given back.
 * @param {OrdersDeps} deps
 * @param {Ctx} ctx
 * @param {Record<string, any>} order
 * @param {import('./registry.js').Priced} priced
 */
async function hold(deps, ctx, order, priced) {
  const handler = deps.handlers.get('HOTEL');
  const info = orderInfo(order);
  let prepared;
  try {
    prepared = await handler.prepare(ctx, info, priced);
  } catch (e) {
    const code = /** @type {any} */ (e)?.code ?? 'PREPARE_FAILED';
    await failOrder(deps, order, 'HOLDING', { code, detail: /** @type {any} */ (e)?.details ?? null });
    await handler.abandon(ctx, info).catch((err) => deps.logger.warn({ err, ref: order.ref }, 'orders: give back after a failed hold'));
    throw e;
  }
  const event = newEvent(
    EVENTS.orderCreated,
    { orgId: prepared.item.hotelOrgId, orderId: info.id, ref: order.ref, channel: order.channel },
    deps,
  );
  const moved = await transition(OrderRecord, {
    id: order._id,
    from: 'HOLDING',
    to: 'AWAITING_PAYMENT',
    set: { items: [prepared.item], hotelOrgIds: [prepared.item.hotelOrgId], holdExpiresAt: prepared.holdExpiresAt },
    events: [event],
    clock: deps.clock,
    options: ORDERS,
  });
  if (!moved) {
    await handler.abandon(ctx, info);
    throw new ConflictError('ORDER_LOST'); // the reconciler gave up on it meanwhile
  }
  await pushHistory(deps, order._id, { status: 'AWAITING_PAYMENT', by: 'system:orders' });
  return /** @type {Record<string, any>} */ (await findOrder({ _id: order._id }));
}

/**
 * @param {OrdersDeps} deps
 * @param {unknown} id
 * @param {{ status: string, by: string, note?: string | null }} entry
 */
export async function pushHistory(deps, id, entry) {
  await OrderRecord.updateOne({ _id: id }, { $push: { history: { at: deps.clock.now(), note: null, ...entry } } }).setOptions(ORDERS);
}

/**
 * @param {OrdersDeps} deps
 * @param {Record<string, any>} order
 * @param {string | string[]} from
 * @param {{ code: string, detail?: unknown }} failure
 */
export async function failOrder(deps, order, from, failure) {
  const event = newEvent(
    EVENTS.orderFailed,
    { orgId: order.hotelOrgIds?.[0] ?? 'platform', orderId: String(order._id), ref: order.ref, reason: failure.code },
    deps,
  );
  const moved = await transition(OrderRecord, {
    id: order._id,
    from,
    to: 'FAILED',
    set: { failure },
    events: [event],
    clock: deps.clock,
    options: ORDERS,
  });
  if (moved) await pushHistory(deps, order._id, { status: 'FAILED', by: 'system:orders', note: failure.code });
  return moved;
}

/**
 * May this viewer see the order?
 * @param {Record<string, any>} o
 * @param {Viewer} v
 */
export function canSee(o, v) {
  if (v.staff) return true;
  if (v.customerId && o.customerId === v.customerId) return true;
  if (v.clientOrgId && o.clientOrgId === v.clientOrgId) return true;
  if (v.guestKey && o.guestKey === fingerprint(v.guestKey)) return true;
  return Boolean(v.accessKey && v.linkSecret && sameText(v.accessKey, linkKey(v.linkSecret, o.ref)));
}

/**
 * @param {string} ref
 * @param {Viewer} viewer
 */
async function readable(ref, viewer) {
  const canonical = parseReference(ref);
  const o = canonical?.startsWith('MBO-') ? await findOrder({ ref: canonical }) : null;
  if (!o || !canSee(o, viewer)) throw new NotFoundError('ORDER_NOT_FOUND');
  return o;
}

/**
 * What the buyer sees: status, totals (their price view), the hold's end, payment state, items (each handler's buyer
 * view), what went wrong. Never internal amounts or other people's data.
 * @param {OrdersDeps} deps
 * @param {Record<string, any>} o
 * @param {'BUYER' | 'ADMIN'} audience
 */
export async function orderView(deps, o, audience) {
  const items = [];
  for (const it of o.items ?? []) items.push(await deps.handlers.get(it.type).view(it, audience));
  const view = {
    ref: o.ref,
    status: o.status,
    channel: o.channel,
    totalPaise: o.totalPaise,
    gstPaise: o.gstPaise,
    paymentMode: o.paymentMode,
    holdExpiresAt: o.holdExpiresAt ?? null,
    holdExtended: Boolean(o.holdExtended),
    payment: { txnId: o.payment?.txnId ?? null, windowEndsAt: o.payment?.windowEndsAt ?? null, verified: Boolean(o.payment?.verified) },
    contact: o.contact,
    items,
    failure: o.failure ? { code: o.failure.code } : null,
    createdAt: o.createdAt,
    confirmedAt: o.confirmedAt ?? null,
  };
  if (audience === 'BUYER') return view;
  return {
    ...view,
    id: String(o._id),
    buyer: orderInfo(o).buyer,
    createdBy: o.createdBy,
    ip: o.ip,
    history: o.history,
    payment: o.payment,
    failure: o.failure,
    journalPosted: o.journalPosted,
  };
}

/** @param {OrdersDeps} deps */
export function createOrderService(deps) {
  return {
    /** @param {Ctx} ctx @param {CreateInput} input */
    create: (ctx, input) => create(deps, ctx, input),
    /** @param {string} ref @param {Viewer} viewer */
    read: (ref, viewer) => readable(ref, viewer),
  };
}
