// @ts-check
/**
 * Webhook endpoints (plan Stage 14 §3.4): a client company's HTTPS addresses for booking updates.
 *   create → URL checked (HTTPS, not a private address), events from the published list, at most 5 per company,
 *            plan allows webhooks; a signing secret `whsec_…` returned once and stored sealed;
 *   update → URL / events / description; switching back on clears the failure clock;
 *   rotate → a new secret returned once; the old one keeps signing for 24 h; remove → DELETED (kept for the log).
 * `secretsOf` gives the sender the secrets to sign with now (current first).
 */
import { randomBytes } from 'node:crypto';

import { seal, unseal } from '../../core/crypto.js';
import { ConflictError, DomainError, ForbiddenError, NotFoundError } from '../../core/errors.js';
import { checkEndpointUrl } from './domain/addresses.js';
import { WEBHOOK_EVENTS } from './domain/events.js';
import { EndpointRecord } from './models/endpoint.model.js';

export const MAX_ENDPOINTS = 5;
const ROTATE_GRACE_MS = 24 * 60 * 60_000;

/**
 * @typedef {{ clock: import('../../core/clock.js').Clock, sealKey: string, planAllowsWebhooks: (orgId: string) => Promise<boolean> }} EndpointDeps
 * @typedef {{ orgId: string, userId: string, permissions: readonly string[] }} Manager
 */

/** @param {Record<string, any>} e */
export const endpointDto = (e) => ({
  id: String(e._id),
  url: e.url,
  description: e.description,
  events: e.events,
  status: e.status,
  disabledReason: e.disabledReason,
  failingSince: e.failingSince,
  secretRotatingUntil: e.previousValidUntil,
  version: e.version,
  createdAt: e.createdAt,
});

/** @param {EndpointDeps} deps @param {string} orgId @param {string} secret */
const sealSecret = (deps, orgId, secret) => {
  if (!deps.sealKey || deps.sealKey.length < 16) throw new Error('[b2b] webhook seal key missing (B2B_AUTH_SECRET)');
  return seal(secret, { secret: deps.sealKey, purpose: `webhook:${orgId}` });
};
const newSecret = () => `whsec_${randomBytes(24).toString('base64url')}`;

/** @param {string} url */
function checkedUrl(url) {
  const c = checkEndpointUrl(url);
  if (!c.ok) throw new DomainError(c.reason);
  return c.url.toString();
}
/** @param {string[]} events */
function checkedEvents(events) {
  const list = [...new Set(events)];
  if (list.length === 0 || !list.every((e) => /** @type {readonly string[]} */ (WEBHOOK_EVENTS).includes(e)))
    throw new DomainError('EVENTS_INVALID');
  return list;
}
/** @param {string} orgId @param {string} id */
async function own(orgId, id) {
  const e = /^[a-f0-9]{24}$/.test(id) ? await EndpointRecord.findOne({ _id: id, orgId, status: { $ne: 'DELETED' } }).lean() : null;
  if (!e) throw new NotFoundError('WEBHOOK_ENDPOINT_NOT_FOUND');
  return /** @type {Record<string, any>} */ (e);
}

/** @param {EndpointDeps} deps */
export function createEndpoints(deps) {
  return {
    /** @param {Manager} who @param {{ url: string, events: string[], description?: string | null }} a */
    async create(who, a) {
      if (!who.permissions.includes('webhooks.endpoint.manage')) throw new ForbiddenError();
      const url = checkedUrl(a.url);
      const events = checkedEvents(a.events);
      if (!(await deps.planAllowsWebhooks(who.orgId))) throw new ForbiddenError('PLAN_HAS_NO_WEBHOOKS');
      if ((await EndpointRecord.countDocuments({ orgId: who.orgId, status: { $ne: 'DELETED' } })) >= MAX_ENDPOINTS)
        throw new ConflictError('WEBHOOK_ENDPOINT_LIMIT', { max: MAX_ENDPOINTS });
      const secret = newSecret();
      const e = await EndpointRecord.create({
        orgId: who.orgId,
        url,
        events,
        description: a.description ?? null,
        secretEnc: sealSecret(deps, who.orgId, secret),
        createdBy: `user:${who.userId}`,
      });
      return { ...endpointDto(e.toObject()), secret };
    },
    /** @param {string} orgId */
    list: async (orgId) =>
      (
        await EndpointRecord.find({ orgId, status: { $ne: 'DELETED' } })
          .sort({ createdAt: 1 })
          .lean()
      ).map(endpointDto),
    /** @param {string} orgId @param {string} id */
    get: async (orgId, id) => endpointDto(await own(orgId, id)),
    /** @param {string} orgId @param {string} id @param {{ url?: string, events?: string[], description?: string | null, enabled?: boolean }} a */
    update: (orgId, id, a) => updateEndpoint(orgId, id, a),
    /** @param {string} orgId @param {string} id */
    async remove(orgId, id) {
      const e = await own(orgId, id);
      await EndpointRecord.updateOne({ _id: e._id, orgId }, { $set: { status: 'DELETED' }, $inc: { version: 1 } });
      return { id, status: 'DELETED' };
    },
    /** @param {string} orgId @param {string} id */
    async rotateSecret(orgId, id) {
      const e = await own(orgId, id);
      const secret = newSecret();
      await EndpointRecord.updateOne(
        { _id: e._id, orgId, version: e.version },
        {
          $set: {
            secretEnc: sealSecret(deps, orgId, secret),
            previousSecretEnc: e.secretEnc,
            previousValidUntil: new Date(deps.clock.now().getTime() + ROTATE_GRACE_MS),
          },
          $inc: { version: 1 },
        },
      );
      return { ...endpointDto(await own(orgId, id)), secret };
    },
    secretsOf: (/** @type {Record<string, any>} */ e) => secretsOf(deps, e),
  };
}

/** The secrets to sign with now: current, and the previous one while it is still valid. @param {{ clock: import('../../core/clock.js').Clock, sealKey: string }} deps @param {Record<string, any>} e */
export function secretsOf(deps, e) {
  const open = (/** @type {string} */ s) => String(unseal(s, { secret: deps.sealKey, purpose: `webhook:${e.orgId}` }));
  const out = [open(e.secretEnc)];
  if (e.previousSecretEnc && e.previousValidUntil && new Date(e.previousValidUntil).getTime() > deps.clock.now().getTime())
    out.push(open(e.previousSecretEnc));
  return out;
}

/** @param {string} orgId @param {string} id @param {{ url?: string, events?: string[], description?: string | null, enabled?: boolean }} a */
async function updateEndpoint(orgId, id, a) {
  const e = await own(orgId, id);
  /** @type {Record<string, unknown>} */
  const set = {};
  if (a.url !== undefined) set.url = checkedUrl(a.url);
  if (a.events !== undefined) set.events = checkedEvents(a.events);
  if (a.description !== undefined) set.description = a.description;
  if (a.enabled === true) Object.assign(set, { status: 'ACTIVE', disabledReason: null, failingSince: null });
  if (a.enabled === false) Object.assign(set, { status: 'DISABLED', disabledReason: 'BY_CLIENT' });
  await EndpointRecord.updateOne({ _id: e._id, orgId }, { $set: set, $inc: { version: 1 } });
  return endpointDto(await own(orgId, id));
}
