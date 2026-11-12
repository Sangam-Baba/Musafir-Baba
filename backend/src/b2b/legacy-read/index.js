// @ts-check
/**
 * READ-ONLY access to the existing app's data (docs/plan/12-… rule D2).
 *
 * - Only three existing collections are readable: `users`, `staffs`, `sessions`.
 * - Only `findOne` with a fixed projection is used — no write method exists here,
 *   and the returned objects are plain copies (never live documents).
 * - Uses the native driver on the B2B connection, so no Mongoose model is registered
 *   for an existing collection (and no index or plugin can ever touch it).
 * - Never returns passwords or other secrets.
 */
import { b2bMongoose } from '../core/db/connection.js';

export const LEGACY_READ_COLLECTIONS = /** @type {const} */ (['users', 'staffs', 'sessions']);

/** @typedef {typeof LEGACY_READ_COLLECTIONS[number]} LegacyCollection */

/**
 * @typedef {{ id: string, name: string | null, email: string | null, phone: string | null,
 *   role: string | null, isActive: boolean, isVerified: boolean }} LegacyCustomer
 * @typedef {{ id: string, name: string | null, email: string | null, role: string | null,
 *   permissions: string[], isActive: boolean }} LegacyStaff
 * @typedef {{ sessionId: string, userId: string | null, status: string | null, revoked: boolean }} LegacySession
 */

const OBJECT_ID = /^[a-f0-9]{24}$/i;

/**
 * @param {LegacyCollection} name
 * @param {Record<string, unknown>} filter
 * @param {Record<string, 1>} projection
 * @returns {Promise<Record<string, any> | null>}
 */
async function readOne(name, filter, projection) {
  const db = b2bMongoose.connection.db;
  if (!db) throw new Error('[b2b] legacy-read: database not connected');
  return db.collection(name).findOne(filter, { projection, maxTimeMS: 2000 });
}

/** @param {string} id */
function toObjectId(id) {
  return OBJECT_ID.test(id) ? new b2bMongoose.Types.ObjectId(id) : null;
}

/** @param {unknown} v */
const str = (v) => (typeof v === 'string' ? v : null);

/**
 * @param {string} id
 * @returns {Promise<LegacyCustomer | null>}
 */
export async function findCustomerById(id) {
  const _id = toObjectId(id);
  if (!_id) return null;
  const doc = await readOne('users', { _id }, { name: 1, email: 1, phone: 1, role: 1, isActive: 1, isVerified: 1 });
  if (!doc) return null;
  return {
    id: String(doc._id), name: str(doc.name), email: str(doc.email), phone: str(doc.phone),
    role: str(doc.role), isActive: doc.isActive !== false, isVerified: doc.isVerified === true,
  };
}

/**
 * @param {string} id
 * @returns {Promise<LegacyStaff | null>}
 */
export async function findStaffById(id) {
  const _id = toObjectId(id);
  if (!_id) return null;
  const doc = await readOne('staffs', { _id }, { name: 1, email: 1, role: 1, permissions: 1, isActive: 1 });
  if (!doc) return null;
  const permissions = Array.isArray(doc.permissions) ? doc.permissions.filter((p) => typeof p === 'string') : [];
  return {
    id: String(doc._id), name: str(doc.name), email: str(doc.email), role: str(doc.role),
    permissions, isActive: doc.isActive !== false,
  };
}

/**
 * @param {string} sessionId
 * @returns {Promise<LegacySession | null>}
 */
export async function findSessionById(sessionId) {
  if (typeof sessionId !== 'string' || sessionId.length === 0 || sessionId.length > 200) return null;
  const doc = await readOne('sessions', { sessionId }, { sessionId: 1, userId: 1, status: 1, revoked: 1 });
  if (!doc) return null;
  return {
    sessionId: String(doc.sessionId), userId: doc.userId ? String(doc.userId) : null,
    status: str(doc.status), revoked: doc.revoked === true,
  };
}
