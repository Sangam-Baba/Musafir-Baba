// @ts-check
/**
 * Booking requests (D37). Client side: send (the price token is checked again — only an unchanged price is accepted),
 * list, read, cancel. MusafirBaba side: queue, take, confirm (with the hotel's confirmation number) or decline (with a
 * reason). Every change is one conditional update that also appends the history line and the event. No rooms are
 * taken and no money moves — the team arranges the stay offline. A request is tied to the token it came from, so
 * sending the same one twice returns the first request.
 */
import { createHash } from 'node:crypto';

import { newEvent } from '../../core/db/events.js';
import { systemScope } from '../../core/db/tenant-plugin.js';
import { AppError, ConflictError, DomainError, ForbiddenError, NotFoundError } from '../../core/errors.js';
import { EVENTS } from './events.js';
import { newRequestRef, requestTransition } from './domain/request.js';
import { BookingRequestRecord } from './models/booking-request.model.js';

const ADMIN = systemScope('hotel-booking: MusafirBaba handles booking requests');
const ID = /^[a-f0-9]{24}$/;

/**
 * @typedef {import('../hotel-search/domain/caller.js').SearchCaller} SearchCaller
 * @typedef {{ name: string, phone?: string | null, email?: string | null, reference?: string | null, guestNames?: string[] }} Customer
 * @typedef {{
 *   clock: import('../../core/clock.js').Clock,
 *   priceCheck: (caller: SearchCaller, token: string) => Promise<{ status: string, quotedTotalPaise: number, price?: Record<string, unknown>, priceToken?: string }>,
 *   readToken: (token: string, buyer: { channel: string, clientOrgId: string | null, customerId: string | null }) => Promise<{ propertyId: string, roomTypeId: string, ratePlanId: string, checkIn: string, checkOut: string, occupancies: { adults: number, children: number }[] }>,
 *   describeStay: (s: { propertyId: string, roomTypeId: string, ratePlanId: string }, caller: SearchCaller) => Promise<{ propertyRef: string, propertyName: string, city: string | null, roomTypeName: string, planName: string, mealPlanKey: string | null }>,
 * }} RequestDeps
 */

/**
 * The signed-in client member. Reading works during view-as (read-only); changes don't.
 * @param {import('../../core/context.js').RequestContext} ctx
 * @param {{ read?: boolean }} [opts]
 */
function memberOf(ctx, opts = {}) {
  const a = ctx.actor;
  if (a.type !== 'member' || a.orgType !== 'CLIENT') throw new ForbiddenError();
  if (a.viewAs && !opts.read) throw new ForbiddenError('NOT_DURING_VIEW_AS');
  return { orgId: a.orgId, userId: a.userId, ownOnly: a.ownOnly === true };
}

/** @param {Record<string, any>} d @param {{ withContact?: boolean }} [opts] */
export function requestDto(d, opts = {}) {
  return {
    id: String(d._id),
    ref: d.ref,
    status: d.status,
    stay: d.stay,
    quoted: d.quoted,
    customer: d.customer,
    notes: d.notes ?? null,
    hotelConfirmation: d.hotelConfirmation ?? null,
    decisionNote: d.decisionNote ?? null,
    createdBy: d.createdBy,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    version: d.version ?? 1,
    history: (d.history ?? []).map((/** @type {any} */ h) => ({
      at: h.at,
      action: h.action,
      status: h.status,
      note: h.note ?? null,
      ...(opts.withContact ? { by: h.by } : {}),
    })),
    ...(opts.withContact ? { clientOrgId: d.clientOrgId, handledBy: d.handledBy ?? null } : {}),
  };
}

/**
 * One status move: conditional on the status and version loaded, with the history line and the event.
 * @param {RequestDeps} deps
 * @param {Record<string, any>} doc
 * @param {{ action: import('./domain/request.js').RequestAction, by: string, note?: string | null, set?: Record<string, unknown>, scope?: object }} m
 */
async function move(deps, doc, m) {
  const to = requestTransition(doc.status, m.action);
  const at = deps.clock.now();
  const type = { take: null, confirm: EVENTS.requestConfirmed, decline: EVENTS.requestDeclined, cancel: EVENTS.requestCancelled }[m.action];
  /** @type {Record<string, any>} */
  const update = {
    $set: { ...m.set, status: to },
    $inc: { version: 1 },
    $push: { history: { at, action: m.action, by: m.by, status: to, note: m.note ?? null } },
  };
  if (type) {
    // `name` / `reason` are what the notification templates read
    const payload = {
      orgId: doc.clientOrgId,
      requestId: String(doc._id),
      ref: doc.ref,
      name: doc.stay.propertyName,
      ...(m.action === 'decline' ? { reason: m.note ?? null } : {}),
    };
    update.$push.pendingEvents = newEvent(type, payload, deps);
    update.$set.hasPendingEvents = true;
  }
  const q = BookingRequestRecord.updateOne(
    { _id: doc._id, clientOrgId: doc.clientOrgId, status: doc.status, version: doc.version ?? 1 },
    update,
  );
  const res = await (m.scope ? q.setOptions(m.scope) : q);
  if (res.modifiedCount !== 1) throw new AppError('VERSION_CONFLICT', 412, 'The request was changed meanwhile — reload and try again');
}

/**
 * Send a booking request: the price token is checked again (only an unchanged price is accepted).
 * @param {RequestDeps} deps
 * @param {import('../../core/context.js').RequestContext} ctx
 * @param {SearchCaller} caller
 * @param {{ priceToken: string, customer: Customer, notes?: string | null }} input
 */
async function createRequest(deps, ctx, caller, input) {
  const { orgId, userId } = memberOf(ctx);
  if (caller.clientOrgId !== orgId) throw new ForbiddenError();
  const tokenHash = createHash('sha256').update(input.priceToken).digest('base64url');
  const existing = await BookingRequestRecord.findOne({ clientOrgId: orgId, tokenHash }).lean();
  if (existing) return requestDto(existing);
  const check = await deps.priceCheck(caller, input.priceToken);
  if (check.status === 'SOLD_OUT') throw new DomainError('SOLD_OUT');
  if (check.status !== 'OK')
    throw new ConflictError('PRICE_CHANGED', {
      quotedTotalPaise: check.quotedTotalPaise,
      price: check.price ?? null,
      priceToken: check.priceToken ?? null,
    });
  const payload = await deps.readToken(input.priceToken, {
    channel: caller.channel,
    clientOrgId: caller.clientOrgId,
    customerId: null,
  });
  const names = await deps.describeStay(payload, caller);
  const at = deps.clock.now();
  const doc = {
    clientOrgId: orgId,
    ref: newRequestRef(),
    tokenHash,
    createdBy: `user:${userId}`,
    status: 'SUBMITTED',
    stay: {
      propertyId: payload.propertyId,
      roomTypeId: payload.roomTypeId,
      ratePlanId: payload.ratePlanId,
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
      occupancies: payload.occupancies,
      ...names,
    },
    quoted: check.price ?? { totalPaise: check.quotedTotalPaise },
    customer: {
      name: input.customer.name,
      phone: input.customer.phone ?? null,
      email: input.customer.email ?? null,
      reference: input.customer.reference ?? null,
      guestNames: input.customer.guestNames ?? [],
    },
    notes: input.notes ?? null,
    history: [{ at, action: 'submit', by: `user:${userId}`, status: 'SUBMITTED', note: null }],
  };
  const created = new BookingRequestRecord(doc);
  created.set({
    hasPendingEvents: true,
    pendingEvents: [
      newEvent(EVENTS.requestSubmitted, { orgId, requestId: String(created._id), ref: doc.ref, name: names.propertyName }, deps),
    ],
  });
  await created.save();
  return requestDto(created.toObject());
}

/** @param {RequestDeps} deps */
function clientFunctions(deps) {
  return {
    /**
     * @param {import('../../core/context.js').RequestContext} ctx
     * @param {SearchCaller} caller
     * @param {{ priceToken: string, customer: Customer, notes?: string | null }} input
     */
    create: (ctx, caller, input) => createRequest(deps, ctx, caller, input),

    /** Agents limited to their own work see only their own requests. @param {import('../../core/context.js').RequestContext} ctx @param {{ status?: string }} f */
    async list(ctx, f) {
      const { orgId, userId, ownOnly } = memberOf(ctx, { read: true });
      const filter = { clientOrgId: orgId, ...(f.status ? { status: f.status } : {}), ...(ownOnly ? { createdBy: `user:${userId}` } : {}) };
      const docs = await BookingRequestRecord.find(filter, { pendingEvents: 0, tokenHash: 0 }).sort({ createdAt: -1 }).limit(200).lean();
      return docs.map((d) => requestDto(d));
    },

    /** @param {import('../../core/context.js').RequestContext} ctx @param {string} id */
    async get(ctx, id) {
      const { orgId, userId, ownOnly } = memberOf(ctx, { read: true });
      const d = ID.test(id) ? await BookingRequestRecord.findOne({ _id: id, clientOrgId: orgId }).lean() : null;
      if (!d || (ownOnly && d.createdBy !== `user:${userId}`)) throw new NotFoundError('REQUEST_NOT_FOUND');
      return requestDto(d);
    },

    /** @param {import('../../core/context.js').RequestContext} ctx @param {string} id @param {number} version */
    async cancel(ctx, id, version) {
      const { orgId, userId, ownOnly } = memberOf(ctx);
      const d = ID.test(id) ? await BookingRequestRecord.findOne({ _id: id, clientOrgId: orgId }).lean() : null;
      if (!d || (ownOnly && d.createdBy !== `user:${userId}`)) throw new NotFoundError('REQUEST_NOT_FOUND');
      if ((d.version ?? 1) !== version)
        throw new AppError('VERSION_CONFLICT', 412, 'The request was changed meanwhile — reload and try again');
      await move(deps, d, { action: 'cancel', by: `user:${userId}` });
      return requestDto(/** @type {any} */ (await BookingRequestRecord.findOne({ _id: id, clientOrgId: orgId }).lean()));
    },
  };
}

/** @param {RequestDeps} deps */
function adminFunctions(deps) {
  /** @param {string} id */
  const load = async (id) => {
    const d = ID.test(id) ? await BookingRequestRecord.findOne({ _id: id }).setOptions(ADMIN).lean() : null;
    if (!d) throw new NotFoundError('REQUEST_NOT_FOUND');
    return d;
  };
  return {
    /** @param {{ status?: string }} f */
    async adminList(f) {
      const docs = await BookingRequestRecord.find(f.status ? { status: f.status } : { status: { $in: ['SUBMITTED', 'IN_PROGRESS'] } }, {
        pendingEvents: 0,
        tokenHash: 0,
      })
        .sort({ createdAt: 1 })
        .limit(500)
        .setOptions(ADMIN)
        .lean();
      return docs.map((d) => requestDto(d, { withContact: true }));
    },
    /** @param {string} id */
    async adminGet(id) {
      return requestDto(await load(id), { withContact: true });
    },
    /**
     * @param {{ staffId: string }} who
     * @param {string} id
     * @param {{ action: 'take' | 'confirm' | 'decline', version: number, note?: string | null, hotelConfirmation?: string | null }} a
     */
    async adminAct(who, id, a) {
      const d = await load(id);
      if ((d.version ?? 1) !== a.version)
        throw new AppError('VERSION_CONFLICT', 412, 'The request was changed meanwhile — reload and try again');
      const by = `staff:${who.staffId}`;
      if (a.action === 'decline' && !(a.note && a.note.trim().length >= 5)) throw new DomainError('REASON_REQUIRED');
      /** @type {Record<string, unknown>} */
      const set =
        a.action === 'take'
          ? { handledBy: by }
          : a.action === 'confirm'
            ? { hotelConfirmation: a.hotelConfirmation ?? null, decisionNote: a.note ?? null }
            : { decisionNote: a.note ?? null };
      await move(deps, d, { action: a.action, by, note: a.note ?? null, set, scope: ADMIN });
      return requestDto(await load(id), { withContact: true });
    },
  };
}

/** @param {RequestDeps} deps */
export function createBookingRequestService(deps) {
  return { ...clientFunctions(deps), ...adminFunctions(deps) };
}
