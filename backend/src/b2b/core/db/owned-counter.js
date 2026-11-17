// @ts-check
/**
 * Counters whose owners are recorded in the SAME document (pattern P2,
 * docs/plan/01-architecture.md §8, 05-inventory-and-no-double-booking.md §3, §5).
 *
 * Example (inventory night): { total: 10, held: 2, holds: [{ ownerId: 'h1', qty: 2 }], booked, bookings }.
 * - apply:    adds qty to `held` and records { ownerId, qty } — only if the owner isn't there yet
 *             and the capacity condition holds. Repeating it changes nothing.
 * - undo:     removes the owner's entries and subtracts exactly their qty. Repeating changes nothing.
 * - transfer: moves an owner's qty from one counter/list to another (hold → booked) in one step.
 * Each is ONE single-document update — atomic on a standalone server, no transactions.
 * The caller adds the document filter (incl. tenant scope) and checks `modifiedCount`.
 */

/** @typedef {{ counter: string, list: string }} OwnedField */

/**
 * @param {OwnedField} field
 * @param {string} ownerId
 * @param {number} qty
 * @param {{ capacity?: { total: string, others: readonly string[] }, extra?: Record<string, unknown> }} [options]
 *   capacity: only apply if counter + others + qty <= total (e.g. held + booked + qty <= total)
 * @returns {{ filter: Record<string, unknown>, update: Record<string, unknown> }}
 */
export function applyOwned(field, ownerId, qty, options = {}) {
  assertQty(qty);
  /** @type {Record<string, unknown>} */
  const filter = { [`${field.list}.ownerId`]: { $ne: ownerId } };
  if (options.capacity) {
    const used = [field.counter, ...options.capacity.others].map((f) => `$${f}`);
    filter.$expr = { $lte: [{ $add: [...used, qty] }, `$${options.capacity.total}`] };
  }
  const update = {
    $inc: { [field.counter]: qty, version: 1 },
    $push: { [field.list]: { ownerId, qty, ...(options.extra ?? {}) } },
  };
  return { filter, update };
}

/**
 * @param {OwnedField} field
 * @param {string} ownerId
 * @returns {{ filter: Record<string, unknown>, update: Record<string, unknown>[] }}
 */
export function undoOwned(field, ownerId) {
  const mine = ownedQty(field.list, ownerId);
  return {
    filter: { [`${field.list}.ownerId`]: ownerId },
    update: [
      {
        $set: {
          [field.counter]: { $subtract: [`$${field.counter}`, mine] },
          [field.list]: withoutOwner(field.list, ownerId),
          version: { $add: [{ $ifNull: ['$version', 0] }, 1] },
        },
      },
    ],
  };
}

/**
 * @param {OwnedField} from
 * @param {OwnedField} to
 * @param {string} fromOwnerId  e.g. the hold id
 * @param {string} toOwnerId    e.g. the booking id
 * @returns {{ filter: Record<string, unknown>, update: Record<string, unknown>[] }}
 */
export function transferOwned(from, to, fromOwnerId, toOwnerId) {
  const qty = ownedQty(from.list, fromOwnerId);
  return {
    filter: { [`${from.list}.ownerId`]: fromOwnerId, [`${to.list}.ownerId`]: { $ne: toOwnerId } },
    update: [
      {
        $set: {
          [from.counter]: { $subtract: [`$${from.counter}`, qty] },
          [to.counter]: { $add: [`$${to.counter}`, qty] },
          [to.list]: { $concatArrays: [{ $ifNull: [`$${to.list}`, []] }, [{ ownerId: toOwnerId, qty }]] },
          [from.list]: withoutOwner(from.list, fromOwnerId),
          version: { $add: [{ $ifNull: ['$version', 0] }, 1] },
        },
      },
    ],
  };
}

/** @param {string} list @param {string} ownerId */
function ownedQty(list, ownerId) {
  return { $sum: { $map: { input: { $filter: { input: `$${list}`, cond: { $eq: ['$$this.ownerId', ownerId] } } }, in: '$$this.qty' } } };
}

/** @param {string} list @param {string} ownerId */
function withoutOwner(list, ownerId) {
  return { $filter: { input: `$${list}`, cond: { $ne: ['$$this.ownerId', ownerId] } } };
}

/** @param {number} qty */
function assertQty(qty) {
  if (!Number.isSafeInteger(qty) || qty < 1) throw new Error(`[b2b] owned counter qty must be a positive integer, got ${qty}`);
}
