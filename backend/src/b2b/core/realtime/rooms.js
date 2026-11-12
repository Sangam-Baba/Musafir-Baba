// @ts-check
/**
 * Realtime rooms (docs/plan/11-notifications-and-realtime.md §5). The SERVER decides which
 * personal rooms a socket joins (from its signed token); the browser may only ask to join
 * public availability rooms. Messages carry ids and short titles only — never prices,
 * guest data or secrets.
 */

const ID = '[A-Za-z0-9-]{1,64}';
const PERSONAL = new RegExp(`^b2b:(user|customer|staff|org):${ID}$`);
const ADMIN = /^b2b:admin:[a-z-]{1,32}$/;
const AVAILABILITY = new RegExp(`^availability:property:${ID}$`);
export const CACHE_EVICT_ROOM = 'cache:evict';

/** @param {string} room */
export const isPublicRoom = (room) => AVAILABILITY.test(room);

/** @param {string} room */
export function isValidRoom(room) {
  return typeof room === 'string' && (PERSONAL.test(room) || ADMIN.test(room) || AVAILABILITY.test(room) || room === CACHE_EVICT_ROOM);
}

/**
 * Personal rooms for a signed-in actor.
 * @param {import('../context.js').Actor} actor
 * @returns {string[]}
 */
export function roomsForActor(actor) {
  switch (actor.type) {
    case 'customer': return [`b2b:customer:${actor.customerId}`];
    case 'member': return [`b2b:user:${actor.userId}`, `b2b:org:${actor.orgId}`];
    case 'staff': return [`b2b:staff:${actor.staffId}`, 'b2b:admin:general'];
    case 'anonymous':
    case 'system': return [];
    default: return assertNever(actor);
  }
}

/** @param {never} x @returns {never} */
function assertNever(x) {
  throw new Error(`unexpected actor ${JSON.stringify(x)}`);
}
