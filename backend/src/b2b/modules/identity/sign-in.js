// @ts-check
/**
 * The last step of every sign-in (password, email code): open a session — or, when the user has
 * two-step login on, hand out a 5-minute challenge instead and open the session only after the app
 * code (or a recovery code) at POST /auth/mfa/verify.
 */
import { ServiceUnavailableError } from '../../core/errors.js';
import { MFA_CHALLENGE_TTL_SECONDS, signMfaChallenge } from './mfa-challenge.js';

/** @typedef {{ mfaRequired: true, mfaToken: string, expiresIn: number }} MfaChallenge */
/** @typedef {import('./sessions.service.js').IssuedTokens | MfaChallenge} SignInResult */

/**
 * @param {{ sessions: ReturnType<typeof import('./sessions.service.js').createSessionService>,
 *   mfa: ReturnType<typeof import('./mfa.service.js').createMfaService>, secret: string | undefined,
 *   clock: import('../../core/clock.js').Clock, defaultOrgFor?: (userId: string) => Promise<string | null> }} deps
 */
export function createSignIn(deps) {
  return {
    /**
     * @param {string} userId
     * @param {import('./sessions.service.js').LoginMethod[]} methods
     * @param {import('./sessions.service.js').ClientInfo} client
     * @returns {Promise<SignInResult>}
     */
    async finish(userId, methods, client) {
      if (!(await deps.mfa.isEnabled(userId)))
        return deps.sessions.create({ userId, methods, orgId: (await deps.defaultOrgFor?.(userId)) ?? null, ...client });
      if (!deps.secret) throw new ServiceUnavailableError('BUSINESS_LOGIN_NOT_CONFIGURED');
      return {
        mfaRequired: true,
        mfaToken: signMfaChallenge({ userId, methods }, { secret: deps.secret, clock: deps.clock }),
        expiresIn: MFA_CHALLENGE_TTL_SECONDS,
      };
    },
  };
}

/** @param {SignInResult} result @returns {result is MfaChallenge} */
export const isMfaChallenge = (result) => 'mfaRequired' in result;
