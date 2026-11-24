// @ts-check
/**
 * Stage 14 client routes (plan §5) — answer 503 `API_NOT_ENABLED` unless `B2B_API_ENABLED=true`:
 *   API keys          GET /api-keys (`api-access.key.read`) · POST /api-keys · PATCH /api-keys/:id · POST /api-keys/:id/rotate
 *                     · DELETE /api-keys/:id (`api-access.key.manage`; creating / rotating needs a second-factor check
 *                     in the last 10 minutes when the person has two-factor sign-in on; never with an API key)
 *   Webhook endpoints GET / POST /webhook-endpoints · PATCH / DELETE /webhook-endpoints/:id · POST …/:id/rotate-secret
 *                     · POST …/:id/test (`webhooks.endpoint.manage`)
 *   Deliveries        GET /webhook-deliveries?endpointId&status&before (`webhooks.delivery.read`)
 *                     · POST /webhook-deliveries/:id/replay (`webhooks.endpoint.manage`)
 */
import express from 'express';
import { z } from 'zod';

import { ForbiddenError, ServiceUnavailableError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { PERMISSIONS as API, SCOPES } from '../modules/api-access/index.js';
import { STEP_UP_TTL_MS } from '../modules/identity/index.js';
import { DELIVERY_STATUSES, PERMISSIONS as WHK, WEBHOOK_EVENTS } from '../modules/webhooks/index.js';
import { apiEnabled, apiKeysFor, forgetCachedKeys } from './api-keys-wiring.js';
import { handle } from './payout-finance-admin.js';
import { deliveriesFor } from './webhooks-wiring.js';
import { createEndpoints } from '../modules/webhooks/index.js';
import { publishedPlan, subscriptionOf } from '../modules/subscriptions/index.js';

const Id = z.string().regex(/^[a-f0-9]{24}$/);
const Name = z.string().trim().min(2).max(60);
const Ips = z.array(z.string().trim().max(50)).max(20);
const Url = z.string().trim().min(10).max(500);
const Events = z.array(z.enum(WEBHOOK_EVENTS)).min(1).max(WEBHOOK_EVENTS.length);
const Params = z.strictObject({ id: Id });

/**
 * @typedef {{ env: NodeJS.ProcessEnv, clock: import('../core/clock.js').Clock,
 *   mfa: { isEnabled: (userId: string) => Promise<boolean> },
 *   sessions: { findActive: (sessionId: string, userId: string) => Promise<{ stepUpAt: Date | null } | null> } }} DeveloperDeps
 */

/** The signed-in client member. @param {import('express').Response} res */
function clientOf(res) {
  const { actor } = contextOf(res);
  if (actor.type !== 'member' || actor.orgType !== 'CLIENT') throw new ForbiddenError();
  return actor;
}
/** @param {import('express').Response} res */
const input = (res) => /** @type {{ params: any, query: any, body: any }} */ (res.locals.input);

/** Creating or rotating a key: never with a key; a recent second-factor check when the person uses one. @param {DeveloperDeps} deps @param {import('express').Response} res */
async function assertStepUp(deps, res) {
  const m = clientOf(res);
  if (m.apiKeyId || !m.sessionId) throw new ForbiddenError('STEP_UP_REQUIRED');
  if (!(await deps.mfa.isEnabled(m.userId))) return;
  const s = await deps.sessions.findActive(m.sessionId, m.userId);
  const at = s?.stepUpAt ? new Date(s.stepUpAt).getTime() : 0;
  if (deps.clock.now().getTime() - at > STEP_UP_TTL_MS) throw new ForbiddenError('STEP_UP_REQUIRED');
}
/** @param {import('express').Response} res */
const managerOf = (res) => {
  const m = clientOf(res);
  return { orgId: m.orgId, userId: m.userId, permissions: m.permissions };
};

/** @param {import('express').Router} router @param {DeveloperDeps} deps */
function keyRoutes(router, deps) {
  const keys = apiKeysFor(deps.env, deps.clock);
  const manage = requirePermission(API.keyManage);
  router.get(
    '/api-keys',
    requirePermission(API.keyRead),
    handle(async (_q, res) => ({ data: await keys.list(clientOf(res).orgId) })),
  );
  router.post(
    '/api-keys',
    manage,
    validate({
      body: z.strictObject({ name: Name, scopes: z.array(z.enum(SCOPES)).min(1).max(SCOPES.length), ipAllowList: Ips.optional() }),
    }),
    handle(async (_q, res) => {
      await assertStepUp(deps, res);
      return keys.create(managerOf(res), input(res).body);
    }, 201),
  );
  router.patch(
    '/api-keys/:id',
    manage,
    validate({ params: Params, body: z.strictObject({ name: Name.optional(), ipAllowList: Ips.optional() }) }),
    handle(async (_q, res) => {
      const r = await keys.update(clientOf(res).orgId, input(res).params.id, input(res).body);
      forgetCachedKeys(); // a new allow-list applies at once here, within 5 s elsewhere
      return r;
    }),
  );
  router.post(
    '/api-keys/:id/rotate',
    manage,
    validate({ params: Params }),
    handle(async (_q, res) => {
      await assertStepUp(deps, res);
      return keys.rotate(managerOf(res), input(res).params.id);
    }, 201),
  );
  router.delete(
    '/api-keys/:id',
    manage,
    validate({ params: Params }),
    handle(async (_q, res) => {
      const m = clientOf(res);
      const r = await keys.revoke(m.orgId, `user:${m.userId}`, input(res).params.id);
      forgetCachedKeys();
      return r;
    }),
  );
}

/** May the company send webhooks on its plan? Only checked when plans are switched on. @param {NodeJS.ProcessEnv} env */
const planAllowsWebhooks = (env) => async (/** @type {string} */ orgId) => {
  if (env.B2B_BILLING_ENABLED !== 'true') return true;
  const sub = await subscriptionOf(orgId);
  const plan = sub ? await publishedPlan(sub.planKey) : null;
  return Boolean(plan?.features?.webhooks);
};

/** @param {import('express').Router} router @param {DeveloperDeps} deps */
function endpointRoutes(router, deps) {
  const eps = createEndpoints({
    clock: deps.clock,
    sealKey: deps.env.B2B_AUTH_SECRET ?? '',
    planAllowsWebhooks: planAllowsWebhooks(deps.env),
  });
  const deliveries = deliveriesFor(deps.clock, deps.env);
  const manage = requirePermission(WHK.endpointManage);
  const Description = z.string().trim().max(200).nullable();
  router.get(
    '/webhook-endpoints',
    manage,
    handle(async (_q, res) => ({ data: await eps.list(clientOf(res).orgId) })),
  );
  router.post(
    '/webhook-endpoints',
    manage,
    validate({ body: z.strictObject({ url: Url, events: Events, description: Description.optional() }) }),
    handle(async (_q, res) => eps.create(managerOf(res), input(res).body), 201),
  );
  router.patch(
    '/webhook-endpoints/:id',
    manage,
    validate({
      params: Params,
      body: z.strictObject({
        url: Url.optional(),
        events: Events.optional(),
        description: Description.optional(),
        enabled: z.boolean().optional(),
      }),
    }),
    handle(async (_q, res) => eps.update(clientOf(res).orgId, input(res).params.id, input(res).body)),
  );
  router.delete(
    '/webhook-endpoints/:id',
    manage,
    validate({ params: Params }),
    handle(async (_q, res) => eps.remove(clientOf(res).orgId, input(res).params.id)),
  );
  router.post(
    '/webhook-endpoints/:id/rotate-secret',
    manage,
    validate({ params: Params }),
    handle(async (_q, res) => eps.rotateSecret(clientOf(res).orgId, input(res).params.id)),
  );
  router.post(
    '/webhook-endpoints/:id/test',
    manage,
    validate({ params: Params }),
    handle(async (_q, res) => deliveries.test(clientOf(res).orgId, input(res).params.id), 202),
  );
}

/** @param {import('express').Router} router @param {DeveloperDeps} deps */
function deliveryRoutes(router, deps) {
  const deliveries = deliveriesFor(deps.clock, deps.env);
  const manage = requirePermission(WHK.endpointManage);
  router.get(
    '/webhook-deliveries',
    requirePermission(WHK.deliveryRead),
    validate({
      query: z.strictObject({
        endpointId: Id.optional(),
        status: z.enum(DELIVERY_STATUSES).optional(),
        before: z.coerce.date().optional(),
      }),
    }),
    handle(async (_q, res) => ({ data: await deliveries.list(clientOf(res).orgId, input(res).query) })),
  );
  router.post(
    '/webhook-deliveries/:id/replay',
    manage,
    validate({ params: Params }),
    handle(async (_q, res) => deliveries.replay(clientOf(res).orgId, input(res).params.id), 202),
  );
}

/**
 * Stage 14 routes.
 * @param {DeveloperDeps} deps
 */
export function stage14Routes(deps) {
  const router = express.Router();
  if (!apiEnabled(deps.env)) {
    router.use(['/api-keys', '/webhook-endpoints', '/webhook-deliveries'], (_req, _res, next) =>
      next(new ServiceUnavailableError('API_NOT_ENABLED')),
    );
    return router;
  }
  keyRoutes(router, deps);
  endpointRoutes(router, deps);
  deliveryRoutes(router, deps);
  return router;
}
