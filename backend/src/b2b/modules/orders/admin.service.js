// @ts-check
/**
 * MusafirBaba's order explorer (plan Stage 08 §3.11): find orders (reference — order or booking —, customer name,
 * email or phone, status, hotel company, dates) and act on them with two people:
 * - RELEASE: an order still waiting for payment → expired now, its rooms given back (as the sweeper would);
 * - REFUND: a paid order that failed and whose money hasn't gone back (no refund asked, or PayU refused it) → refunded
 *   to the source (key `admin:<action id>`). Confirmed bookings are cancelled and refunded with Stage 09 (the ledger
 *   moves differ), so they can't be refunded here.
 * One person proposes with a reason; a different person approves (or rejects); it runs once.
 */
import { systemContext } from '../../core/context.js';
import { ConflictError, DomainError, ForbiddenError, NotFoundError } from '../../core/errors.js';
import { parseReference } from '../../core/ids.js';
import { RefundRecord } from '../payments/index.js';
import { AdminActionRecord } from './models/admin-action.model.js';
import { OrderRecord } from './models/order.model.js';
import { ORDERS, pushHistory } from './orders.service.js';
import { expireOrder } from './sweeper.js';

const WAITING = ['AWAITING_PAYMENT', 'PAYMENT_PENDING'];

/** @param {string} text */
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * @param {{ q?: string, status?: string, hotelOrgId?: string, from?: string, to?: string }} f
 */
function filterOf(f) {
  /** @type {Record<string, any>} */
  const filter = {};
  const q = f.q?.trim();
  if (q) {
    const ref = parseReference(q);
    if (ref?.startsWith('MBO-')) filter.ref = ref;
    else if (ref?.startsWith('MBH-')) filter['items.bookingRef'] = ref;
    else {
      const re = new RegExp(escapeRegex(q.slice(0, 60)), 'i');
      filter.$or = [{ 'contact.email': re }, { 'contact.name': re }, { 'contact.phone': re }, { 'payment.txnId': q }];
    }
  }
  if (f.status) filter.status = f.status;
  if (f.hotelOrgId) filter.hotelOrgIds = f.hotelOrgId;
  if (f.from || f.to)
    filter.createdAt = {
      ...(f.from ? { $gte: new Date(`${f.from}T00:00:00+05:30`) } : {}),
      ...(f.to ? { $lt: new Date(new Date(`${f.to}T00:00:00+05:30`).getTime() + 86_400_000) } : {}),
    };
  return filter;
}

/** @param {Record<string, any>} o */
const row = (o) => ({
  ref: o.ref,
  status: o.status,
  channel: o.channel,
  totalPaise: o.totalPaise,
  contact: o.contact,
  bookingRefs: (o.items ?? []).map((/** @type {any} */ i) => i.bookingRef),
  hotelOrgIds: o.hotelOrgIds,
  paid: Boolean(o.payment?.verified),
  failure: o.failure?.code ?? null,
  createdAt: o.createdAt,
  confirmedAt: o.confirmedAt ?? null,
});

/** @param {Record<string, any>} a */
const actionDto = (a) => ({
  id: String(a._id),
  orderRef: a.orderRef,
  action: a.action,
  reason: a.reason,
  status: a.status,
  proposedBy: a.proposedBy,
  decidedBy: a.decidedBy,
  decidedAt: a.decidedAt,
  decisionNote: a.decisionNote,
  result: a.result,
  createdAt: a.createdAt,
});

/** @param {string} ref */
async function byRef(ref) {
  const canonical = parseReference(ref);
  const o = canonical?.startsWith('MBO-') ? await OrderRecord.findOne({ ref: canonical }).setOptions(ORDERS).lean() : null;
  if (!o) throw new NotFoundError('ORDER_NOT_FOUND');
  return /** @type {Record<string, any>} */ (o);
}

/**
 * Can this action run on the order now? Returns the reason it can't, or null.
 * @param {Record<string, any>} o
 * @param {'RELEASE' | 'REFUND'} action
 */
async function blocker(o, action) {
  if (action === 'RELEASE') return WAITING.includes(o.status) ? null : 'ONLY_UNPAID_ORDERS_CAN_BE_RELEASED';
  if (o.status !== 'FAILED' && o.status !== 'EXPIRED') return 'CONFIRMED_BOOKINGS_ARE_REFUNDED_BY_CANCELLING';
  if (!o.payment?.verifiedIntentId) return 'NOTHING_WAS_PAID';
  const going = await RefundRecord.exists({ intentId: o.payment.verifiedIntentId, status: { $in: ['REQUESTED', 'PENDING', 'SUCCEEDED'] } });
  return going ? 'REFUND_ALREADY_UNDER_WAY' : null;
}

/**
 * @param {import('./payment.service.js').PayDeps} deps
 * @param {Record<string, any>} a the approved action
 */
async function run(deps, a) {
  const o = /** @type {Record<string, any>} */ (await OrderRecord.findOne({ _id: a.orderId }).setOptions(ORDERS).lean());
  const why = await blocker(o, a.action);
  if (why) return { status: 'FAILED', result: why };
  if (a.action === 'RELEASE') {
    const done = await expireOrder(deps, o);
    return done ? { status: 'DONE', result: 'rooms released; order expired' } : { status: 'FAILED', result: 'the order changed meanwhile' };
  }
  const ctx = systemContext('orders: admin refund (approved by a second person)', `admin-${String(a._id)}`, deps.logger, deps.clock);
  await deps.modes
    .get(o.paymentMode)
    .refund(ctx, o, { intentId: o.payment.verifiedIntentId, key: `admin:${String(a._id)}`, reason: a.reason });
  return { status: 'DONE', result: 'refund sent to PayU' };
}

/** @param {import('./payment.service.js').PayDeps} deps */
export function createOrderAdmin(deps) {
  return {
    /** @param {{ q?: string, status?: string, hotelOrgId?: string, from?: string, to?: string }} f */
    async search(f) {
      return (await OrderRecord.find(filterOf(f)).setOptions(ORDERS).sort({ createdAt: -1 }).limit(100).lean()).map(row);
    },
    byRef,
    /** @param {string} orderId */
    actions: async (orderId) => (await AdminActionRecord.find({ orderId }).sort({ createdAt: -1 }).lean()).map(actionDto),
    /** @param {string} by @param {string} ref @param {{ action: 'RELEASE' | 'REFUND', reason: string }} a */
    async propose(by, ref, a) {
      const o = await byRef(ref);
      const why = await blocker(o, a.action);
      if (why) throw new DomainError(why);
      if (await AdminActionRecord.exists({ orderId: String(o._id), action: a.action, status: 'PROPOSED' }))
        throw new ConflictError('ACTION_ALREADY_PROPOSED');
      const doc = await AdminActionRecord.create({
        orderId: String(o._id),
        orderRef: o.ref,
        action: a.action,
        reason: a.reason,
        status: 'PROPOSED',
        proposedBy: by,
      });
      await pushHistory(deps, o._id, { status: o.status, by, note: `${a.action} proposed: ${a.reason}`.slice(0, 500) });
      return actionDto(doc.toObject());
    },
    /** @param {string} by @param {string} id @param {{ approve: boolean, note?: string | null }} d */
    async decide(by, id, d) {
      const a = /^[a-f0-9]{24}$/.test(id) ? await AdminActionRecord.findById(id).lean() : null;
      if (!a) throw new NotFoundError('ACTION_NOT_FOUND');
      if (a.proposedBy === by) throw new ForbiddenError('SECOND_PERSON_REQUIRED');
      const to = d.approve ? 'APPROVED' : 'REJECTED';
      const claimed = await AdminActionRecord.updateOne(
        { _id: a._id, status: 'PROPOSED' },
        { $set: { status: to, decidedBy: by, decidedAt: deps.clock.now(), decisionNote: d.note ?? null } },
      );
      if (claimed.modifiedCount !== 1) throw new ConflictError('ACTION_ALREADY_DECIDED', { actionStatus: a.status });
      if (d.approve) {
        const r = await run(deps, a);
        await AdminActionRecord.updateOne({ _id: a._id, status: 'APPROVED' }, { $set: r });
        await pushHistory(deps, a.orderId, { status: (await byRef(a.orderRef)).status, by, note: `${a.action} approved — ${r.result}` });
      }
      return actionDto(/** @type {any} */ (await AdminActionRecord.findById(a._id).lean()));
    },
  };
}
