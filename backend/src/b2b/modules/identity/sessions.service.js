// @ts-check
/**
 * Business-user sessions (plan Stage 01 §3.1, §8 "refresh token theft").
 * - create(): one `id_sessions` document per login → access token (15 min) + refresh token (30 days).
 * - refresh(): rotates the refresh token with ONE conditional update (P1). Presenting an older,
 *   genuine token = it was copied → the session is revoked and `identity.session.reused` is recorded
 *   in the same update. Two tabs refreshing at once is not theft: the loser within 10 s gets
 *   REFRESH_IN_PROGRESS and simply retries with the new cookie.
 * - revoke() / revokeAll(): logout and "log out everywhere".
 * Lookups by session id happen before anyone is known (no ctx yet), so they use a routine systemScope.
 */
import { ConflictError, ServiceUnavailableError, UnauthorizedError } from '../../core/errors.js';
import { newEvent } from '../../core/db/events.js';
import { systemScope } from '../../core/db/tenant-plugin.js';
import { signAccessToken } from './access-token.js';
import { buildRefreshToken, hashToken, parseRefreshToken } from './domain/tokens.js';
import { EVENTS } from './events.js';
import { SessionRecord } from './models/session.model.js';

export const REFRESH_TTL_MS = 30 * 24 * 60 * 60_000;
export const ROTATION_GRACE_MS = 10_000;
/** How long a step-up (re-entering a code or password) counts for sensitive actions. */
export const STEP_UP_TTL_MS = 10 * 60_000;
const BY_SESSION_ID = systemScope('identity: session lookup by refresh token', { routine: true });

/** @typedef {{ accessToken: string, expiresIn: number, refreshToken: string, refreshExpiresAt: Date, sessionId: string }} IssuedTokens */
/** @typedef {{ ip?: string | null, userAgent?: string | null }} ClientInfo */
/** @typedef {import('./models/session.model.js').LOGIN_METHODS[number]} LoginMethod */

/**
 * Revokes a session whose old refresh token was presented again; the event goes in the same update (P5).
 * @param {any} doc @param {Date} at @param {import('../../core/clock.js').Clock} clock
 */
async function revokeForReuse(doc, at, clock) {
  const event = newEvent(EVENTS.refreshReused, { userId: doc.userId, sessionId: String(doc._id) }, { clock });
  await SessionRecord.updateOne(
    { _id: doc._id, userId: doc.userId, revokedAt: null },
    { $set: { revokedAt: at, revokeReason: 'REFRESH_REUSED', hasPendingEvents: true }, $push: { pendingEvents: event } },
  );
}

/**
 * Logout, "log out everywhere", revoke-all and the open-session check.
 * @param {() => string} secret
 * @param {() => Date} now
 */
function createSessionEndings(secret, now) {
  return {
    /**
     * Ends the session the refresh token belongs to. Unknown or invalid tokens are ignored (logout always succeeds).
     * @param {unknown} token
     * @returns {Promise<{ userId: string, sessionId: string } | null>}
     */
    async logout(token) {
      const parsed = parseRefreshToken(token, secret());
      if (!parsed) return null;
      const doc = await SessionRecord.findOneAndUpdate(
        { _id: parsed.sessionId, refreshHash: hashToken(String(token)), revokedAt: null },
        { $set: { revokedAt: now(), revokeReason: 'LOGOUT' } },
      ).setOptions(BY_SESSION_ID);
      return doc ? { userId: doc.userId, sessionId: String(doc._id) } : null;
    },

    /**
     * "Log out everywhere", proven by the caller's current refresh token.
     * @param {unknown} token
     * @returns {Promise<number>} sessions ended (0 if the token is not current)
     */
    async logoutAll(token) {
      const parsed = parseRefreshToken(token, secret());
      if (!parsed) return 0;
      const doc = await SessionRecord.findOne({ _id: parsed.sessionId, refreshHash: hashToken(String(token)), revokedAt: null })
        .setOptions(BY_SESSION_ID)
        .lean();
      if (!doc) return 0;
      const result = await SessionRecord.updateMany(
        { userId: doc.userId, revokedAt: null },
        { $set: { revokedAt: now(), revokeReason: 'LOGOUT_ALL' } },
      );
      return result.modifiedCount;
    },

    /**
     * Ends every open session opened in an org (the org was suspended). Sessions of the same users in
     * other orgs are not touched.
     * @param {string} orgId
     * @param {string} reason
     * @returns {Promise<number>}
     */
    async revokeForOrg(orgId, reason) {
      const result = await SessionRecord.updateMany(
        { orgId, revokedAt: null },
        { $set: { revokedAt: now(), revokeReason: reason } },
      ).setOptions(systemScope('identity: end the sessions of a suspended org'));
      return result.modifiedCount;
    },

    /**
     * Ends every open session of a user ("log out everywhere", suspension, password reset).
     * @param {string} userId
     * @param {string} reason e.g. 'LOGOUT_ALL', 'PASSWORD_RESET', 'ORG_SUSPENDED'
     * @returns {Promise<number>} sessions ended
     */
    async revokeAll(userId, reason) {
      const result = await SessionRecord.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: now(), revokeReason: reason } });
      return result.modifiedCount;
    },

    /**
     * Opens another org on this session (the org switcher). The caller has checked the membership.
     * Returns a new access token; the refresh token stays the same.
     * @param {string} sessionId
     * @param {string} userId
     * @param {string} orgId
     * @param {(claims: import('./access-token.js').AccessClaims) => { accessToken: string, expiresIn: number }} sign
     */
    async switchOrg(sessionId, userId, orgId, sign) {
      const done = await SessionRecord.updateOne({ _id: sessionId, userId, revokedAt: null }, { $set: { orgId } });
      if (done.matchedCount !== 1) throw new UnauthorizedError('SESSION_REVOKED');
      return sign({ userId, sessionId, orgId });
    },

    /**
     * Records that the user just proved it is them again (step-up) on this session.
     * @param {string} sessionId @param {string} userId
     * @returns {Promise<Date>} step-up valid until
     */
    async markStepUp(sessionId, userId) {
      const at = now();
      const done = await SessionRecord.updateOne({ _id: sessionId, userId, revokedAt: null }, { $set: { stepUpAt: at } });
      if (done.modifiedCount !== 1) throw new UnauthorizedError('SESSION_REVOKED');
      return new Date(at.getTime() + STEP_UP_TTL_MS);
    },

    /**
     * The session behind an access token, if it is still open (checked on every request — S01-T12).
     * @param {string} sessionId
     * @param {string} userId
     */
    async findActive(sessionId, userId) {
      if (!/^[a-f0-9]{24}$/.test(sessionId)) return null;
      const doc = await SessionRecord.findOne({ _id: sessionId, userId, revokedAt: null, expiresAt: { $gt: now() } }).lean();
      return doc
        ? { sessionId: String(doc._id), userId: doc.userId, orgId: doc.orgId, methods: doc.methods, stepUpAt: doc.stepUpAt ?? null }
        : null;
    },
  };
}

/**
 * One `id_sessions` document per sign-in; the sign-in event goes into the same insert (P5).
 * @param {{ userId: string, orgId?: string | null, methods: LoginMethod[] } & ClientInfo} input
 * @param {string} secret
 * @param {import('../../core/clock.js').Clock} clock
 */
async function insertSession(input, secret, clock) {
  const at = clock.now();
  const id = new SessionRecord()._id;
  const refreshToken = buildRefreshToken(String(id), 1, secret);
  const event = newEvent(
    EVENTS.sessionCreated,
    { userId: input.userId, sessionId: String(id), orgId: input.orgId ?? null, methods: input.methods, ip: input.ip ?? null },
    { clock },
  );
  const doc = await SessionRecord.create({
    _id: id,
    userId: input.userId,
    orgId: input.orgId ?? null,
    methods: input.methods,
    generation: 1,
    refreshHash: hashToken(refreshToken),
    expiresAt: new Date(at.getTime() + REFRESH_TTL_MS),
    lastUsedAt: at,
    ip: input.ip ?? null,
    userAgent: input.userAgent?.slice(0, 300) ?? null,
    pendingEvents: [event],
    hasPendingEvents: true,
  });
  return { doc, refreshToken };
}

/** @param {{ secret: string | undefined, clock: import('../../core/clock.js').Clock }} options */
export function createSessionService(options) {
  const secret = () => {
    if (!options.secret || options.secret.length < 32) throw new ServiceUnavailableError('BUSINESS_LOGIN_NOT_CONFIGURED');
    return options.secret;
  };
  const now = () => options.clock.now();

  /** @param {{ _id: unknown, userId: string, orgId: string | null }} s @param {string} refreshToken @param {Date} expiresAt */
  const issue = (s, refreshToken, expiresAt) => ({
    ...signAccessToken({ userId: s.userId, sessionId: String(s._id), orgId: s.orgId }, { secret: secret(), clock: options.clock }),
    refreshToken,
    refreshExpiresAt: expiresAt,
    sessionId: String(s._id),
  });

  return {
    /**
     * @param {{ userId: string, orgId?: string | null, methods: LoginMethod[] } & ClientInfo} input
     * @returns {Promise<IssuedTokens>}
     */
    async create(input) {
      const { doc, refreshToken } = await insertSession(input, secret(), options.clock);
      return issue(doc, refreshToken, doc.expiresAt);
    },

    /**
     * @param {unknown} token the refresh token from the cookie
     * @returns {Promise<IssuedTokens>}
     */
    async refresh(token) {
      const parsed = parseRefreshToken(token, secret());
      if (!parsed) throw new UnauthorizedError('REFRESH_INVALID');
      const doc = await SessionRecord.findOne({ _id: parsed.sessionId }).setOptions(BY_SESSION_ID).lean();
      const at = now();
      if (!doc) throw new UnauthorizedError('REFRESH_INVALID');
      if (doc.revokedAt) throw new UnauthorizedError('SESSION_REVOKED');
      if (doc.expiresAt.getTime() <= at.getTime()) throw new UnauthorizedError('SESSION_EXPIRED');
      const presented = hashToken(String(token));
      if (presented !== doc.refreshHash) {
        const justRotated = presented === doc.previousHash && doc.rotatedAt && at.getTime() - doc.rotatedAt.getTime() < ROTATION_GRACE_MS;
        if (justRotated) throw new ConflictError('REFRESH_IN_PROGRESS');
        if (parsed.generation < doc.generation) await revokeForReuse(doc, at, options.clock);
        throw new UnauthorizedError(parsed.generation < doc.generation ? 'REFRESH_REUSED' : 'REFRESH_INVALID');
      }
      const next = buildRefreshToken(String(doc._id), doc.generation + 1, secret());
      const result = await SessionRecord.updateOne(
        { _id: doc._id, userId: doc.userId, refreshHash: presented, revokedAt: null },
        { $set: { refreshHash: hashToken(next), previousHash: presented, rotatedAt: at, lastUsedAt: at, generation: doc.generation + 1 } },
      );
      if (result.modifiedCount !== 1) throw new ConflictError('REFRESH_IN_PROGRESS'); // another tab won the race
      return issue(doc, next, doc.expiresAt);
    },

    ...createSessionEndings(secret, now),
  };
}
