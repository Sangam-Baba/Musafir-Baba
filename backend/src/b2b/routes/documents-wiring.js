// @ts-check
/**
 * Stage 08 wiring for documents: what an order's documents are made from (the order, each booking's copies through the
 * item handler's admin view, the verified PayU payment, MusafirBaba's current GSTIN for the registration), the event
 * consumer that issues them when an order is confirmed, and the retry job (alerts after 5 minutes).
 */
import { brandOf, OrganizationRecord } from '../modules/organizations/index.js';
import { createDocuments } from '../modules/documents/index.js';
import { ORDERS, OrderRecord } from '../modules/orders/index.js';
import { IntentRecord } from '../modules/payments/index.js';
import { readSettings } from '../modules/pricing/index.js';

const DOCUMENT_STATUSES = ['CONFIRMED', 'CANCELLED', 'COMPLETED'];
export const DOCUMENTS_RETRY_EVERY_MS = 5 * 60_000;

/** @param {Record<string, any>} intent */
const paidAt = (intent) => intent?.history?.find((/** @type {any} */ h) => h.status === 'SUCCEEDED')?.at ?? intent?.lastVerifiedAt ?? null;

/** One booking's copies for the documents (from the item handler's admin view). @param {any} v */
const itemPart = (v) => ({
  bookingRef: v.ref,
  property: v.property,
  roomTypeName: v.roomTypeName,
  ratePlanName: v.ratePlanName,
  mealPlanKey: v.mealPlanKey,
  cancellation: v.cancellation.summary,
  stay: v.stay,
  rooms: v.rooms,
  specialRequests: v.specialRequests,
  breakdown: v.priceBreakdown,
});

/** The order and its verified payment. @param {any} o @param {any} intent */
const orderPart = (o, intent) => ({
  ref: o.ref,
  totalPaise: o.totalPaise,
  confirmedAt: o.confirmedAt,
  contact: o.contact,
  payment: {
    txnId: intent?.txnId ?? null,
    gatewayPaymentId: intent?.gatewayPaymentId ?? null,
    mode: intent?.mode ?? null,
    paidAt: paidAt(intent),
  },
});

/** @param {any} o */
async function verifiedIntent(o) {
  return o.payment?.verifiedIntentId ? /** @type {any} */ (await IntentRecord.findById(o.payment.verifiedIntentId).lean()) : null;
}

/** MusafirBaba's current GSTIN for the registration that issued the booking's GST. @param {any[]} views */
async function issuerOf(views) {
  const stateCode = views[0]?.priceBreakdown?.lines?.[0]?.gst?.issuerState ?? '07';
  const issuer = (await readSettings()).issuers.find((i) => i.stateCode === stateCode);
  return { stateCode, gstin: issuer?.gstin ?? null };
}

/**
 * @param {import('../modules/orders/payment.service.js').PayDeps} ordersDeps
 * @param {string} orderId
 * @returns {Promise<import('../modules/documents/documents.service.js').FactsFor | null>}
 */
async function factsFor(ordersDeps, orderId) {
  const o = /^[a-f0-9]{24}$/.test(orderId)
    ? /** @type {any} */ (await OrderRecord.findOne({ _id: orderId }).setOptions(ORDERS).lean())
    : null;
  if (!o || !DOCUMENT_STATUSES.includes(o.status)) return null;
  const views = [];
  for (const it of o.items) views.push(/** @type {any} */ (await ordersDeps.handlers.get(it.type).view(it, 'ADMIN')));
  return {
    orderRef: o.ref,
    confirmedAt: o.confirmedAt,
    owners: { customerId: o.customerId, guestKey: o.guestKey, clientOrgId: o.clientOrgId, hotelOrgId: o.hotelOrgIds?.[0] ?? null },
    issuer: await issuerOf(views),
    facts: { order: orderPart(o, await verifiedIntent(o)), items: views.map(itemPart) },
    brand: o.clientOrgId ? await clientBrand(o.clientOrgId) : null,
  };
}

/** A B2B client's name for its own voucher (Stage 12B). @param {string} orgId */
async function clientBrand(orgId) {
  const org = /** @type {any} */ (
    await OrganizationRecord.findOne({ _id: orgId }, { displayName: 1 })
      .setOptions({ tenantScope: 'SYSTEM', tenantReason: 'documents: client voucher' })
      .lean()
  );
  return org ? brandOf(orgId, String(org.displayName)) : null; // Stage 15: the client's saved brand, else its name
}

/**
 * What a cancelled booking's credit note is made from (the booking's admin view: its price breakdown and cancellation).
 * @param {import('../modules/orders/payment.service.js').PayDeps} ordersDeps
 * @param {string} orderId
 * @param {string} bookingId
 * @returns {Promise<import('../modules/documents/documents.service.js').CreditFactsFor | null>}
 */
async function creditFactsFor(ordersDeps, orderId, bookingId) {
  const o = /^[a-f0-9]{24}$/.test(orderId)
    ? /** @type {any} */ (await OrderRecord.findOne({ _id: orderId }).setOptions(ORDERS).lean())
    : null;
  const item = o?.items?.find((/** @type {any} */ i) => i.bookingId === bookingId);
  if (!o || !item) return null;
  const v = /** @type {any} */ (await ordersDeps.handlers.get(item.type).view(item, 'ADMIN'));
  if (v.status !== 'CANCELLED' || !v.cancelled) return null;
  return { ...creditOrderPart(o, item), issuer: await issuerOf([v]), ...creditBookingPart(v) };
}

/** @param {any} o @param {any} item */
const creditOrderPart = (o, item) => ({
  orderRef: o.ref,
  owners: { customerId: o.customerId, guestKey: o.guestKey, clientOrgId: o.clientOrgId, hotelOrgId: item.hotelOrgId ?? null },
  contact: o.contact,
});

/** @param {any} v the booking's admin view */
function creditBookingPart(v) {
  const gst = v.priceBreakdown?.lines?.[0]?.gst ?? {};
  return {
    cancelledAt: v.cancelled.requestedAt,
    bookingRef: v.ref,
    propertyName: v.property?.name ?? 'Hotel',
    refundPaise: v.cancelled.refundPaise,
    totals: v.priceBreakdown.totals,
    sac: gst.sac ?? '—',
    rateBps: gst.rateBps ?? 0,
    placeOfSupply: gst.placeOfSupply ?? '—',
  };
}

/** @param {import('../modules/orders/payment.service.js').PayDeps} ordersDeps */
export function documentsFor(ordersDeps) {
  return createDocuments({
    clock: ordersDeps.clock,
    logger: ordersDeps.logger,
    facts: (id) => factsFor(ordersDeps, id),
    creditFacts: (orderId, bookingId) => creditFactsFor(ordersDeps, orderId, bookingId),
  });
}

/** An order of bus tickets only (no hotel documents for it yet). @param {string} orderId */
async function busOnly(orderId) {
  const o = /^[a-f0-9]{24}$/.test(orderId) ? await OrderRecord.findOne({ _id: orderId }, { items: 1 }).setOptions(ORDERS).lean() : null;
  const items = o?.items ?? [];
  return items.length > 0 && items.every((/** @type {any} */ it) => it.type === 'BUS');
}

/**
 * Consumer: an order confirmed → its documents. Retry job: confirmed in the last 7 days and missing a voucher or
 * receipt (or the invoice, once the GSTIN is set) → issued; still missing 5 minutes after confirmation → alert.
 * @param {import('../modules/orders/payment.service.js').PayDeps} ordersDeps
 * @param {string} orderConfirmed the orders event name
 * @param {string} [bookingCancelled] the hotel-booking event name (credit notes)
 */
export function documentJobs(ordersDeps, orderConfirmed, bookingCancelled = 'hotel-booking.booking.cancelled') {
  const docs = documentsFor(ordersDeps);
  const consumer = {
    consumer: 'documents-order-confirmed',
    types: [orderConfirmed],
    handler: async (/** @type {{ payload: any }} */ event) => {
      if (await busOnly(String(event.payload.orderId))) return; // Stage 18: bus tickets are not hotel documents (DEF-046)
      await docs.ensureForOrder(String(event.payload.orderId));
    },
  };
  const creditNotes = {
    consumer: 'documents-credit-note',
    types: [bookingCancelled],
    handler: async (/** @type {{ payload: any }} */ event) => {
      await docs.issueCreditNote(String(event.payload.orderId), String(event.payload.bookingId));
    },
  };
  async function retryMissing() {
    const now = ordersDeps.clock.now().getTime();
    const recent = await OrderRecord.find(
      { status: { $in: DOCUMENT_STATUSES }, confirmedAt: { $gte: new Date(now - 7 * 86_400_000) }, 'items.type': { $ne: 'BUS' } },
      { _id: 1, ref: 1, confirmedAt: 1 },
    )
      .setOptions(ORDERS)
      .limit(500)
      .lean();
    let issued = 0;
    for (const o of recent) {
      const r = await docs
        .ensureForOrder(String(o._id))
        .catch((err) => (ordersDeps.logger.warn({ err, ref: o.ref }, 'documents: not issued yet'), null));
      issued += r?.created.length ?? 0;
      if (o.status === 'CANCELLED')
        for (const it of o.items ?? []) await docs.issueCreditNote(String(o._id), it.bookingId).catch(() => null);
      const late = now - new Date(o.confirmedAt).getTime() > 5 * 60_000;
      if (late && (!r || r.created.length > 0))
        ordersDeps.logger.error({ ref: o.ref }, 'documents: issued late or still missing 5 minutes after confirmation');
    }
    return { checked: recent.length, issued };
  }
  return { consumer, creditNotes, retryMissing, docs };
}
