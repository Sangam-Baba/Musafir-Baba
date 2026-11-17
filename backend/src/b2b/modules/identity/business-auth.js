// @ts-check
/**
 * Who is calling /api/v1 with a business-user token (`Authorization: Bearer <access token>`).
 * The token must be ours (B2B_AUTH_SECRET, audience b2b-api) AND its session still open, so logout,
 * "log out everywhere", password reset and stolen-token detection take effect immediately.
 * Anything else → not signed in (protected routes answer 401). Existing customer/staff tokens are
 * handled in S01-T12 (read-only check against the existing app's data).
 * With an org selected on the session and an active membership → a `member` actor with that org's
 * permissions and limits (resolved by `resolveMember`, wired in routes/identity.js); otherwise `user`.
 */
import { verifyAccessToken } from './access-token.js';

/**
 * @param {{ secret: string | undefined, clock: import('../../core/clock.js').Clock,
 *   sessions: ReturnType<typeof import('./sessions.service.js').createSessionService>,
 *   resolveMember?: (orgId: string, userId: string) => Promise<Omit<Extract<import('../../core/context.js').Actor, { type: 'member' }>, 'type' | 'userId' | 'sessionId'> | null> }} deps
 * @returns {import('../../core/http/context-middleware.js').Authenticator}
 */
export function createBusinessAuthenticator(deps) {
  return async (req) => {
    const header = req.get('authorization');
    if (!deps.secret || !header || !header.startsWith('Bearer ') || header.length > 4096) return null;
    const claims = verifyAccessToken(header.slice(7).trim(), { secret: deps.secret, clock: deps.clock });
    if (!claims) return null;
    const session = await deps.sessions.findActive(claims.sessionId, claims.userId);
    if (!session) return null;
    const member = session.orgId && deps.resolveMember ? await deps.resolveMember(session.orgId, session.userId) : null;
    if (member) return { type: 'member', ...member, userId: session.userId, sessionId: session.sessionId };
    return { type: 'user', userId: session.userId, sessionId: session.sessionId };
  };
}
