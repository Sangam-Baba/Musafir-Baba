// @ts-check
/**
 * API keys (plan Stage 14 §3.1):
 *   create  → scopes the creator may give (each scope's permission held) and the plan allows; at most 2 keys that
 *             don't expire per company; the full key returned once (only prefix + hash kept);
 *   rotate  → a new key with the same name, scopes and IPs; the old one keeps working for 24 h, then stops;
 *   revoke  → stops at once (callers' caches drop it within 5 s);
 *   allow-list / rename; list (never the secret);
 *   resolve → for the gateway: a well-formed key of this environment, active, not expired, secret matching (constant
 *             time); `touch` records the last use (at most once a minute) and says when an IP is new.
 */
import { randomBytes } from 'node:crypto';

import { newEvent } from '../../core/db/events.js';
import { systemScope } from '../../core/db/tenant-plugin.js';
import { ConflictError, DomainError, ForbiddenError, NotFoundError } from '../../core/errors.js';
import {
  formatKey,
  MAX_ACTIVE_KEYS,
  normaliseAllowList,
  parseKey,
  randomText,
  SCOPES,
  scopesAllowed,
  secretMatches,
  hashSecret,
} from './domain/keys.js';
import { EVENTS } from './events.js';
import { ApiKeyRecord } from './models/api-key.model.js';

const SCOPE = systemScope('api-access: key sign-in', { routine: true });
const ROTATE_GRACE_MS = 24 * 60 * 60_000;
const TOUCH_EVERY_MS = 60_000;

/**
 * @typedef {{ clock: import('../../core/clock.js').Clock, pepper: string, env: 'live' | 'test',
 *   planAllowsApi: (orgId: string) => Promise<boolean> }} KeyDeps
 * @typedef {{ orgId: string, userId: string, permissions: readonly string[] }} Creator
 */

/** @param {Record<string, any>} k */
export const keyDto = (k) => ({
  id: String(k._id),
  name: k.name,
  env: k.env,
  prefix: k.prefix,
  display: `mb_${k.env}_${k.prefix}_…`,
  scopes: k.scopes,
  ipAllowList: k.ipAllowList,
  status: k.status,
  expiresAt: k.expiresAt,
  createdBy: `user:${k.createdByUserId}`,
  createdAt: k.createdAt,
  revokedAt: k.revokedAt,
  lastUsedAt: k.lastUsedAt,
  lastUsedIp: k.lastUsedIp,
});

/** @param {string[]} ips */
function allowList(ips) {
  const r = normaliseAllowList(ips);
  if (r.tooLong) throw new DomainError('IP_LIST_TOO_LONG');
  if (r.bad.length) throw new DomainError('IP_ENTRY_INVALID', { entries: r.bad });
  return r.list;
}

/** @param {KeyDeps} deps @param {Creator} who @param {readonly string[]} scopes */
async function assertMayIssue(deps, who, scopes) {
  if (!who.permissions.includes('api-access.key.manage')) throw new ForbiddenError();
  if (scopes.length === 0 || !scopes.every((s) => /** @type {readonly string[]} */ (SCOPES).includes(s)))
    throw new DomainError('SCOPE_INVALID');
  if (!scopesAllowed(scopes, who.permissions)) throw new ForbiddenError('SCOPE_NOT_ALLOWED');
  if (!(await deps.planAllowsApi(who.orgId))) throw new ForbiddenError('PLAN_HAS_NO_API');
}

/** @param {KeyDeps} deps @param {Creator} who @param {{ name: string, scopes: string[], ipAllowList: string[] }} a */
async function insertKey(deps, who, a) {
  const prefix = randomText(randomBytes, 8);
  const secret = randomText(randomBytes, 40);
  const doc = await ApiKeyRecord.create({
    orgId: who.orgId,
    name: a.name.trim(),
    env: deps.env,
    prefix,
    secretHash: hashSecret(secret, deps.pepper),
    scopes: [...new Set(a.scopes)],
    ipAllowList: a.ipAllowList,
    createdByUserId: who.userId,
    hasPendingEvents: true,
    pendingEvents: [newEvent(EVENTS.keyCreated, { orgId: who.orgId, prefix, by: `user:${who.userId}` }, deps)],
  });
  const lasting = await ApiKeyRecord.countDocuments({ orgId: who.orgId, status: 'ACTIVE', expiresAt: null });
  if (lasting > MAX_ACTIVE_KEYS) {
    await ApiKeyRecord.deleteOne({ _id: doc._id, orgId: who.orgId }); // two created at once — the later one goes
    throw new ConflictError('API_KEY_LIMIT', { max: MAX_ACTIVE_KEYS });
  }
  return { ...keyDto(doc.toObject()), key: formatKey(deps.env, prefix, secret) };
}

/** @param {string} orgId @param {string} id */
async function ownKey(orgId, id) {
  const k = /^[a-f0-9]{24}$/.test(id) ? await ApiKeyRecord.findOne({ _id: id, orgId }).lean() : null;
  if (!k) throw new NotFoundError('API_KEY_NOT_FOUND');
  return /** @type {Record<string, any>} */ (k);
}

/** @param {KeyDeps} deps */
export function createApiKeys(deps) {
  if (!deps.pepper || deps.pepper.length < 16) throw new Error('[b2b] API key pepper missing (B2B_API_KEY_PEPPER or B2B_AUTH_SECRET)');
  return {
    /** @param {Creator} who @param {{ name: string, scopes: string[], ipAllowList?: string[] }} a */
    async create(who, a) {
      await assertMayIssue(deps, who, a.scopes);
      if ((await ApiKeyRecord.countDocuments({ orgId: who.orgId, status: 'ACTIVE', expiresAt: null })) >= MAX_ACTIVE_KEYS)
        throw new ConflictError('API_KEY_LIMIT', { max: MAX_ACTIVE_KEYS });
      return insertKey(deps, who, { name: a.name, scopes: a.scopes, ipAllowList: allowList(a.ipAllowList ?? []) });
    },
    /** A new key like the old one; the old one stops in 24 h. @param {Creator} who @param {string} id */
    async rotate(who, id) {
      const old = await ownKey(who.orgId, id);
      if (old.status !== 'ACTIVE' || old.expiresAt) throw new ConflictError('API_KEY_NOT_ROTATABLE');
      await assertMayIssue(deps, who, old.scopes);
      const res = await ApiKeyRecord.updateOne(
        { _id: old._id, orgId: who.orgId, status: 'ACTIVE', expiresAt: null },
        { $set: { expiresAt: new Date(deps.clock.now().getTime() + ROTATE_GRACE_MS) } },
      );
      if (res.modifiedCount !== 1) throw new ConflictError('API_KEY_NOT_ROTATABLE');
      return insertKey(deps, who, { name: old.name, scopes: old.scopes, ipAllowList: old.ipAllowList });
    },
    /** @param {string} orgId @param {string} by @param {string} id */
    async revoke(orgId, by, id) {
      const k = await ownKey(orgId, id);
      if (k.status === 'REVOKED') return keyDto(k);
      const event = newEvent(EVENTS.keyRevoked, { orgId, prefix: k.prefix, by }, deps);
      await ApiKeyRecord.updateOne(
        { _id: k._id, orgId, status: 'ACTIVE' },
        {
          $set: { status: 'REVOKED', revokedAt: deps.clock.now(), revokedBy: by, hasPendingEvents: true },
          $push: { pendingEvents: event },
        },
      );
      return keyDto(await ownKey(orgId, id));
    },
    /** @param {string} orgId @param {string} id @param {{ name?: string, ipAllowList?: string[] }} a */
    async update(orgId, id, a) {
      const k = await ownKey(orgId, id);
      if (k.status !== 'ACTIVE') throw new ConflictError('API_KEY_REVOKED');
      /** @type {Record<string, unknown>} */
      const set = {};
      if (a.name !== undefined) set.name = a.name.trim();
      if (a.ipAllowList !== undefined) set.ipAllowList = allowList(a.ipAllowList);
      await ApiKeyRecord.updateOne({ _id: k._id, orgId }, { $set: set });
      return keyDto(await ownKey(orgId, id));
    },
    /** @param {string} orgId */
    list: async (orgId) => (await ApiKeyRecord.find({ orgId }).sort({ createdAt: -1 }).limit(50).lean()).map(keyDto),
    /** The key behind a bearer token, or null. @param {string} token */
    resolve: (token) => resolveKey(deps, token),
    /** Record a use; true when the IP is new for this key. @param {Record<string, any>} k @param {string} ip */
    touch: (k, ip) => touchKey(deps, k, ip),
  };
}

/** @param {KeyDeps} deps @param {string} token */
async function resolveKey(deps, token) {
  const p = parseKey(token);
  if (!p || p.env !== deps.env) return null;
  const k = /** @type {Record<string, any> | null} */ (await ApiKeyRecord.findOne({ prefix: p.prefix }).setOptions(SCOPE).lean());
  if (!k || k.status !== 'ACTIVE' || !secretMatches(p.secret, deps.pepper, k.secretHash)) return null;
  if (k.expiresAt && new Date(k.expiresAt).getTime() <= deps.clock.now().getTime()) return null;
  return k;
}

/** @param {KeyDeps} deps @param {Record<string, any>} k @param {string} ip */
async function touchKey(deps, k, ip) {
  const now = deps.clock.now();
  const isNew = !(k.knownIps ?? []).includes(ip);
  if (!isNew && k.lastUsedAt && now.getTime() - new Date(k.lastUsedAt).getTime() < TOUCH_EVERY_MS) return false;
  /** @type {Record<string, any>} */
  const update = { $set: { lastUsedAt: now, lastUsedIp: ip } };
  if (isNew) {
    update.$push = {
      knownIps: { $each: [ip], $slice: -50 },
      pendingEvents: newEvent(EVENTS.keyNewIp, { orgId: k.orgId, prefix: k.prefix, ip }, deps),
    };
    update.$set.hasPendingEvents = true;
  }
  await ApiKeyRecord.updateOne({ _id: k._id, orgId: k.orgId }, update);
  return isNew;
}
