// @ts-check
/** PUBLIC interface of the identity module — other modules import only from here. */
export { EVENTS } from './events.js';
export { PERMISSION_CATALOGUE, PERMISSIONS } from './permissions.js';
export { USERS_COLLECTION, UserRecord } from './models/user.model.js';
export { SESSIONS_COLLECTION, SessionRecord } from './models/session.model.js';
export { createUserRepository } from './users.repository.js';
export { createSessionService, STEP_UP_TTL_MS } from './sessions.service.js';
export { verifyAccessToken, signAccessToken } from './access-token.js';
export { signAdminToken, verifyAdminToken, ADMIN_TOKEN_TTL_SECONDS } from './admin-token.js';
export { createLoginService, LOGIN_LIMITS, failureDelayMs } from './login.service.js';
export { loginRoutes } from './login-routes.js';
export { createOtpService, OTP_LIMITS } from './otp.service.js';
export { otpRoutes } from './otp-routes.js';
export { OTP_COLLECTION } from './models/otp.model.js';
export { MFA_COLLECTION } from './models/mfa.model.js';
export { createMfaService } from './mfa.service.js';
export { createSignIn, isMfaChallenge } from './sign-in.js';
export { mfaAuthRoutes, mfaMeRoutes } from './mfa-routes.js';
export { createBusinessAuthenticator } from './business-auth.js';
export { createViewAsService } from './view-as.service.js';
export { signEmailVerification, verifyEmailVerification, EMAIL_VERIFY_TTL_SECONDS } from './email-verification.js';
export { VIEW_AS_COLLECTION, VIEW_AS_TTL_MS, ViewAsRecord } from './models/view-as.model.js';
export { sessionRoutes, sendTokens, REFRESH_COOKIE, REFRESH_COOKIE_PATH } from './session-routes.js';
export { normaliseEmail, normalisePhone, parseLoginIdentifier, assertPasswordAllowed, isLocked, lockDurationMs } from './domain/user.js';
