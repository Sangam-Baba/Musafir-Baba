// @ts-check
/**
 * Bus reviews (plan Stage 18 B8): the buyer reviews a completed trip once; the company replies; staff hide / show;
 * ratings per company (published reviews only) for search.
 */
import { systemScope } from '../../core/db/tenant-plugin.js';
import { ConflictError, DomainError, NotFoundError } from '../../core/errors.js';
import { BusReviewRecord } from './models/review.model.js';

const OPS = systemScope('bus-booking: reviews (public ratings, moderation)', { routine: true });

/** @param {Record<string, any>} r @param {boolean} [staff] */
export const reviewDto = (r, staff = false) => ({
  id: String(r._id),
  bookingRef: r.bookingRef,
  routeName: r.routeName,
  tripDate: r.tripDate,
  rating: r.rating,
  text: r.text,
  authorName: r.authorName,
  status: r.status,
  reply: r.reply ? { text: r.reply.text, at: r.reply.at } : null,
  createdAt: r.createdAt,
  ...(staff ? { operatorOrgId: r.operatorOrgId, moderation: r.moderation } : {}),
});

/** The review document of a booking (first name of the first passenger as the author). @param {Record<string, any>} b @param {string} by @param {{ rating: number, text?: string | null }} a */
function reviewDoc(b, by, a) {
  const passenger = String(b.seats?.[0]?.passenger?.name ?? b.contact?.name ?? 'Traveller');
  return {
    bookingId: String(b._id),
    bookingRef: b.ref,
    operatorOrgId: b.operatorOrgId,
    tripId: b.tripId,
    routeName: `${b.from?.name ?? ''} → ${b.to?.name ?? ''}`,
    tripDate: b.date,
    rating: a.rating,
    text: a.text?.trim() || null,
    authorName: passenger.split(/\s+/)[0]?.slice(0, 60) || 'Traveller',
    by,
  };
}

/** One review per completed booking. @param {Record<string, any>} b @param {string} by @param {{ rating: number, text?: string | null }} a */
async function submit(b, by, a) {
  if (b.status !== 'COMPLETED') throw new ConflictError('REVIEW_AFTER_TRIP', { bookingStatus: b.status });
  if (!Number.isInteger(a.rating) || a.rating < 1 || a.rating > 5) throw new DomainError('RATING_INVALID');
  try {
    return reviewDto((await BusReviewRecord.create(reviewDoc(b, by, a))).toObject());
  } catch (e) {
    if (/** @type {any} */ (e)?.code === 11000) throw new ConflictError('ALREADY_REVIEWED');
    throw e;
  }
}

/** @param {{ clock: import('../../core/clock.js').Clock }} deps */
export function createBusReviews(deps) {
  return {
    /** The buyer's review of a booking (null when none yet). @param {Record<string, any>} b */
    mine: async (b) => {
      const r = await BusReviewRecord.findOne({ bookingId: String(b._id) })
        .setOptions(OPS)
        .lean();
      return r ? reviewDto(r) : null;
    },
    /** @param {Record<string, any>} b the buyer's booking @param {string} by @param {{ rating: number, text?: string | null }} a */
    submit: (b, by, a) => submit(b, by, a),
    /** @param {string} orgId */
    forOperator: async (orgId) =>
      (await BusReviewRecord.find({ operatorOrgId: orgId }).sort({ createdAt: -1 }).limit(500).lean()).map((r) => reviewDto(r)),
    /** @param {{ orgId: string, userId: string }} who @param {string} id @param {string} text */
    async reply(who, id, text) {
      const res = /^[a-f0-9]{24}$/.test(id)
        ? await BusReviewRecord.updateOne(
            { _id: id, operatorOrgId: who.orgId },
            { $set: { reply: { text: text.trim(), by: `user:${who.userId}`, at: deps.clock.now() } } },
          )
        : { matchedCount: 0 };
      if (res.matchedCount !== 1) throw new NotFoundError('REVIEW_NOT_FOUND');
      return reviewDto(/** @type {any} */ (await BusReviewRecord.findOne({ _id: id, operatorOrgId: who.orgId }).lean()));
    },
    /** @param {{ status?: 'PUBLISHED' | 'HIDDEN' }} q */
    queue: async (q) =>
      (
        await BusReviewRecord.find(q.status ? { status: q.status } : {})
          .setOptions(OPS)
          .sort({ createdAt: -1 })
          .limit(300)
          .lean()
      ).map((r) => reviewDto(r, true)),
    /** @param {string} by @param {string} id @param {{ visible: boolean, note?: string | null }} a */
    async moderate(by, id, a) {
      const res = /^[a-f0-9]{24}$/.test(id)
        ? await BusReviewRecord.updateOne(
            { _id: id },
            { $set: { status: a.visible ? 'PUBLISHED' : 'HIDDEN', moderation: { by, at: deps.clock.now(), note: a.note ?? null } } },
          ).setOptions(OPS)
        : { matchedCount: 0 };
      if (res.matchedCount !== 1) throw new NotFoundError('REVIEW_NOT_FOUND');
      return reviewDto(/** @type {any} */ (await BusReviewRecord.findById(id).setOptions(OPS).lean()), true);
    },
  };
}

/** Average rating and count of published reviews per company (search). @param {string[]} orgIds */
export async function ratingsOf(orgIds) {
  const rows = await BusReviewRecord.aggregate([
    { $match: { operatorOrgId: { $in: orgIds }, status: 'PUBLISHED' } },
    { $group: { _id: '$operatorOrgId', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]).option({ tenantScope: 'SYSTEM', tenantReason: 'bus ratings' });
  return new Map(rows.map((r) => [String(r._id), { average: Math.round(r.avg * 10) / 10, count: r.count }]));
}
