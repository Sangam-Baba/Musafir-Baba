// @ts-check
/**
 * Gradual launch (plan Stage 16 §2.9): `B2B_PILOT_ORGS` — a comma-separated list of client company ids. When it is
 * set, the B2B features that are switched on (client orders, wallet, plans / billing, API keys and webhooks) work only
 * for those companies; everyone else gets the same "not enabled" answer as when the switch is off. When it is not set
 * (the default) nothing changes. The website is never affected.
 */
import { ServiceUnavailableError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';

const ID = /^[a-f0-9]{24}$/;

/** The pilot companies, or null when there is no list. @param {NodeJS.ProcessEnv} env */
export function pilotOrgs(env) {
  const list = (env.B2B_PILOT_ORGS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => ID.test(s));
  return list.length ? new Set(list) : null;
}

/** Is this company in the launch (always true without a list)? @param {NodeJS.ProcessEnv} env @param {string | null | undefined} orgId */
export const inPilot = (env, orgId) => {
  const list = pilotOrgs(env);
  return !list || (typeof orgId === 'string' && list.has(orgId));
};

/**
 * Middleware: a client member of a company outside the pilot list → 503 `code`. Staff, hotels and visitors pass
 * (each route still checks its own permissions). No list → always passes.
 * @param {NodeJS.ProcessEnv} env @param {string} code @returns {import('express').RequestHandler}
 */
export const pilotGate = (env, code) => (_req, res, next) => {
  const { actor } = contextOf(res);
  if (actor.type === 'member' && actor.orgType === 'CLIENT' && !inPilot(env, actor.orgId)) return next(new ServiceUnavailableError(code));
  return next();
};
