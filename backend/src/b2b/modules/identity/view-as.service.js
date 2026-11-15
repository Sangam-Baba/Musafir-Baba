// @ts-check
/**
 * View-as sessions (plan Stage 01 §3.7). start() records the session with its event and returns a
 * 30-minute pass (HS256, B2B_AUTH_SECRET, audience `b2b-view-as`); find() checks a pass against its
 * record on every request (ended or expired → nothing); end() closes it with its event.
 */
import jwt from 'jsonwebtoken';

import { newEvent } from '../../core/db/events.js';
import { ServiceUnavailableError } from '../../core/errors.js';
import { EVENTS } from './events.js';
import { VIEW_AS_TTL_MS, ViewAsRecord } from './models/view-as.model.js';

/** @typedef {{ viewAsId: string, orgId: string, staffId: string, legacySessionId: string, mode: 'READ' | 'WRITE', expiresAt: Date, reason: string }} ViewAsSession */

/**
 * @param {{ clock: import('../../core/clock.js').Clock }} deps
 * @param {string} secret
 * @param {{ orgId: string, staffId: string, legacySessionId: string, reason: string, mode: 'READ' | 'WRITE' }} input
 * @returns {Promise<{ viewAsToken: string, viewAsId: string, expiresAt: Date }>}
 */
async function startViewAs(deps, secret, input) {
  const now = deps.clock.now();
  const expiresAt = new Date(now.getTime() + VIEW_AS_TTL_MS);
  const doc = new ViewAsRecord({ ...input, expiresAt });
  doc.set({
    pendingEvents: [
      newEvent(
        EVENTS.viewAsStarted,
        { orgId: input.orgId, viewAsId: String(doc._id), changedBy: `staff:${input.staffId}`, mode: input.mode, reason: input.reason },
        deps,
      ),
    ],
    hasPendingEvents: true,
  });
  await doc.save();
  const viewAsToken = jwt.sign(
    {
      sub: input.staffId,
      vid: String(doc._id),
      typ: 'b2b-view-as',
      iat: Math.floor(deps.clock.now().getTime() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
    },
    secret,
    {
      algorithm: 'HS256',
      audience: 'b2b-view-as',
      issuer: 'musafirbaba-b2b',
    },
  );
  return { viewAsToken, viewAsId: String(doc._id), expiresAt };
}

/**
 * @param {{ clock: import('../../core/clock.js').Clock }} deps
 * @param {string} secret
 * @param {string} token
 * @returns {Promise<ViewAsSession | null>}
 */
async function findViewAs(deps, secret, token) {
  let claims;
  try {
    claims = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      audience: 'b2b-view-as',
      issuer: 'musafirbaba-b2b',
      clockTimestamp: Math.floor(deps.clock.now().getTime() / 1000),
    });
  } catch {
    return null;
  }
  if (typeof claims !== 'object' || claims.typ !== 'b2b-view-as' || typeof claims.vid !== 'string' || !/^[a-f0-9]{24}$/.test(claims.vid))
    return null;
  const doc = await ViewAsRecord.findOne({ _id: claims.vid, staffId: claims.sub, endedAt: null, expiresAt: { $gt: deps.clock.now() } })
    .setOptions({ tenantScope: 'SYSTEM', tenantReason: 'identity: view-as pass lookup', tenantRoutine: true })
    .lean();
  if (!doc) return null;
  return {
    viewAsId: String(doc._id),
    orgId: doc.orgId,
    staffId: doc.staffId,
    legacySessionId: doc.legacySessionId,
    mode: doc.mode,
    expiresAt: doc.expiresAt,
    reason: doc.reason,
  };
}

/** @param {{ secret: string | undefined, clock: import('../../core/clock.js').Clock }} deps */
export function createViewAsService(deps) {
  const key = () => {
    if (!deps.secret || deps.secret.length < 32) throw new ServiceUnavailableError('BUSINESS_LOGIN_NOT_CONFIGURED');
    return deps.secret;
  };

  return {
    /** @param {Parameters<typeof startViewAs>[2]} input */
    start: (input) => startViewAs(deps, key(), input),
    /** @param {string} token */
    find: (token) => findViewAs(deps, key(), token),

    /** @param {string} viewAsId @param {string} orgId */
    async end(viewAsId, orgId) {
      const event = newEvent(EVENTS.viewAsEnded, { orgId, viewAsId }, deps);
      const done = await ViewAsRecord.updateOne(
        { _id: viewAsId, orgId, endedAt: null },
        { $set: { endedAt: deps.clock.now(), hasPendingEvents: true }, $push: { pendingEvents: event } },
      );
      return done.modifiedCount === 1;
    },
  };
}
