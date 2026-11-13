// @ts-check
/**
 * Database access for business users (`id_users`). Passwords are hashed with the existing `bcrypt`
 * package (cost 12 in production). Login checks take the same time whether or not the account exists
 * (a dummy hash is compared), and failed attempts are counted with atomic updates.
 */
import bcrypt from 'bcrypt';

import { newEvent } from '../../core/db/events.js';
import { ConflictError, DomainError, NotFoundError } from '../../core/errors.js';
import { assertPasswordAllowed, isLocked, lockDurationMs, normaliseEmail, normalisePhone, parseLoginIdentifier } from './domain/user.js';
import { EVENTS } from './events.js';
import { UserRecord } from './models/user.model.js';

/**
 * @typedef {{ id: string, email: string | null, phone: string | null, name: string, status: string,
 *   emailVerified: boolean, phoneVerified: boolean, hasPassword: boolean, lastLoginAt: Date | null }} UserDto
 * @typedef {{ ok: true, user: UserDto } | { ok: false, reason: 'INVALID' | 'LOCKED' | 'DISABLED', lockedUntil?: Date }} LoginCheck
 */

/** @param {any} doc @returns {UserDto} */
const toDto = (doc) => ({
  id: String(doc._id),
  email: doc.email ?? null,
  phone: doc.phone ?? null,
  name: doc.name,
  status: doc.status,
  emailVerified: Boolean(doc.emailVerifiedAt),
  phoneVerified: Boolean(doc.phoneVerifiedAt),
  hasPassword: Boolean(doc.passwordHash),
  lastLoginAt: doc.lastLoginAt ?? null,
});

/** @param {unknown} error */
function mapDuplicate(error) {
  const e = /** @type {{ code?: number, keyPattern?: Record<string, unknown> }} */ (error);
  if (e.code !== 11000) return error;
  return new ConflictError(e.keyPattern && 'phone' in e.keyPattern ? 'PHONE_TAKEN' : 'EMAIL_TAKEN');
}

/**
 * Counts one failed login atomically and locks the account when a lockout step is reached.
 * @param {unknown} id
 * @param {import('../../core/clock.js').Clock} clock
 * @returns {Promise<Date | null>} lockedUntil, if now locked
 */
async function recordFailedLogin(id, clock) {
  const updated = await UserRecord.findOneAndUpdate(
    { _id: id },
    { $inc: { 'failedLogins.count': 1 } },
    { new: true, projection: { failedLogins: 1 } },
  ).lean();
  const count = updated?.failedLogins?.count ?? 0;
  const ms = lockDurationMs(count);
  if (ms === 0) return null;
  const lockedUntil = new Date(clock.now().getTime() + ms);
  const event = newEvent(EVENTS.userLocked, { userId: String(id), failedLogins: count, lockedUntil: lockedUntil.toISOString() }, { clock });
  await UserRecord.updateOne(
    { _id: id, 'failedLogins.count': count },
    { $set: { 'failedLogins.lockedUntil': lockedUntil, hasPendingEvents: true }, $push: { pendingEvents: event } },
  );
  return lockedUntil;
}

/**
 * @param {{ email?: string, phone?: string, name: string, password?: string, emailVerified?: boolean }} input
 * @param {number} cost
 * @param {Date} now
 * @returns {Promise<UserDto>}
 */
async function insertUser(input, cost, now) {
  const email = input.email === undefined ? undefined : normaliseEmail(input.email);
  const phone = input.phone === undefined ? undefined : normalisePhone(input.phone);
  if (!email && !phone) throw new DomainError('EMAIL_OR_PHONE_REQUIRED');
  if (input.password !== undefined) assertPasswordAllowed(input.password, { email });
  try {
    const doc = await UserRecord.create({
      email,
      phone,
      name: input.name.trim(),
      ...(input.password !== undefined ? { passwordHash: await bcrypt.hash(input.password, cost), passwordChangedAt: now } : {}),
      ...(input.emailVerified ? { emailVerifiedAt: now } : {}),
    });
    return toDto(doc);
  } catch (error) {
    throw mapDuplicate(error);
  }
}

/**
 * Applies the password policy, stores a new hash and clears any lock.
 * @param {string} id @param {string} password @param {number} cost @param {Date} now
 */
async function updatePassword(id, password, cost, now) {
  const doc = await UserRecord.findById(id, { email: 1 }).lean();
  if (!doc) throw new NotFoundError('USER_NOT_FOUND');
  assertPasswordAllowed(password, { email: doc.email ?? undefined });
  await UserRecord.updateOne(
    { _id: id },
    {
      $set: {
        passwordHash: await bcrypt.hash(password, cost),
        passwordChangedAt: now,
        'failedLogins.count': 0,
        'failedLogins.lockedUntil': null,
      },
    },
  );
}

/** @param {{ bcryptCost?: number, clock: import('../../core/clock.js').Clock }} options */
export function createUserRepository(options) {
  const cost = options.bcryptCost ?? 12;
  /** @type {Promise<string> | null} */
  let dummyHash = null;
  const dummy = () => (dummyHash ??= bcrypt.hash('not-a-real-password-used-for-timing', cost));

  return {
    /**
     * @param {{ email?: string, phone?: string, name: string, password?: string, emailVerified?: boolean }} input
     * @returns {Promise<UserDto>}
     */
    create: (input) => insertUser(input, cost, options.clock.now()),

    /** @param {string} id @returns {Promise<UserDto | null>} */
    async findById(id) {
      if (!/^[a-f0-9]{24}$/.test(id)) return null;
      const doc = await UserRecord.findById(id).lean();
      return doc ? toDto(doc) : null;
    },

    /** @param {string} identifier email or phone @returns {Promise<UserDto | null>} */
    async findByLogin(identifier) {
      const { field, value } = parseLoginIdentifier(identifier);
      const doc = await UserRecord.findOne({ [field]: value }).lean();
      return doc ? toDto(doc) : null;
    },

    /**
     * Checks email/phone + password. Same work whether or not the account exists.
     * @param {string} identifier
     * @param {string} password
     * @returns {Promise<LoginCheck>}
     */
    async checkPassword(identifier, password) {
      const { field, value } = parseLoginIdentifier(identifier);
      const doc = await UserRecord.findOne({ [field]: value }).lean();
      const now = options.clock.now();
      if (!doc || !doc.passwordHash) {
        await bcrypt.compare(password, await dummy());
        return { ok: false, reason: 'INVALID' };
      }
      if (isLocked(doc.failedLogins, now))
        return { ok: false, reason: 'LOCKED', lockedUntil: /** @type {Date} */ (doc.failedLogins?.lockedUntil) };
      if (!(await bcrypt.compare(password, doc.passwordHash))) {
        const lockedUntil = await recordFailedLogin(doc._id, options.clock);
        return lockedUntil ? { ok: false, reason: 'LOCKED', lockedUntil } : { ok: false, reason: 'INVALID' };
      }
      if (doc.status !== 'ACTIVE') return { ok: false, reason: 'DISABLED' };
      const updated = await UserRecord.findOneAndUpdate(
        { _id: doc._id },
        { $set: { 'failedLogins.count': 0, 'failedLogins.lockedUntil': null, lastLoginAt: now } },
        { new: true },
      ).lean();
      return { ok: true, user: toDto(updated ?? doc) };
    },

    /**
     * Minimal record for one-time codes (status and lock only).
     * @param {string} email normalised
     * @returns {Promise<{ id: string, status: string, lockedUntil: Date | null } | null>}
     */
    async findForCode(email) {
      const doc = await UserRecord.findOne({ email }, { status: 1, failedLogins: 1 }).lean();
      return doc ? { id: String(doc._id), status: doc.status, lockedUntil: doc.failedLogins?.lockedUntil ?? null } : null;
    },

    /** @param {string} id */
    async markEmailVerified(id) {
      await UserRecord.updateOne({ _id: id, emailVerifiedAt: { $exists: false } }, { $set: { emailVerifiedAt: options.clock.now() } });
    },

    /** @param {string} id @param {string} password */
    setPassword: (id, password) => updatePassword(id, password, cost, options.clock.now()),
  };
}
