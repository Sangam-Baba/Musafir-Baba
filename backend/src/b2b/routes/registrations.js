// @ts-check
/**
 * Hotel self-registration (plan Stage 02 §3.1, D31) — identity + organizations + kyc, so it lives in
 * the routes layer.
 * POST /registrations/hotel (header `X-B2B-Auth: 1`, 10 per hour per IP):
 *   details are checked (GSTIN/PAN/PIN rules) → the owner account (or the signed-in user) → the hotel org
 *   (ONBOARDING) → the draft KYC application with risk flags → email verification link → signed in.
 *   Several steps without a transaction: each is repeat-safe; an onboarding hotel without an application
 *   gets an empty draft the next time it opens GET /kyc (routes/kyc.js), and an account created without
 *   its hotel signs in and registers again (the signed-in path).
 * POST /registrations/verify-email {token} — marks the email verified.
 * POST /registrations/resend-verification — a new link for the signed-in user (3 per hour).
 */
import express from 'express';
import { z } from 'zod';

import { queueEmail } from '../core/email.js';
import { ConflictError, ForbiddenError, NotFoundError, RateLimitError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { publicRoute, requireBusinessUser } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { clientIp, createRateLimiter } from '../core/rate-limit.js';
import { assertPasswordAllowed, signEmailVerification, verifyEmailVerification } from '../modules/identity/index.js';
import { requireAuthHeader, sendTokens } from '../modules/identity/session-routes.js';
import { validateHotelDetails } from '../modules/kyc/index.js';

const text = (max = 200) => z.string().trim().min(1).max(max);
export const HotelDetailsBody = z.strictObject({
  legalName: text(200),
  contactName: text(120),
  mobile: text(20),
  email: text(254),
  gstRegistered: z.boolean(),
  gstin: z.string().trim().max(20).optional(),
  pan: text(12),
  address: z.strictObject({
    line1: text(200),
    line2: z.string().trim().max(200).optional(),
    city: text(80),
    stateCode: z.string().regex(/^\d{2}$/),
    pin: z.string().trim().max(10),
  }),
  propertyCount: z.number().int().min(1).max(500),
  // optional business details (UI-3): checked in validateHotelDetails
  tradeName: z.string().trim().max(120).optional(),
  entityType: z
    .enum(['PROPRIETORSHIP', 'PARTNERSHIP', 'LLP', 'PRIVATE_LIMITED', 'PUBLIC_LIMITED', 'HUF', 'TRUST_SOCIETY', 'OTHER'])
    .optional(),
  yearEstablished: z.number().int().min(1800).max(2100).optional(),
  contactDesignation: z.string().trim().max(80).optional(),
  alternateMobile: z.string().trim().max(20).optional(),
  termsAccepted: z.boolean(),
  termsVersion: text(20),
});
export const HotelRegistrationBody = z.strictObject({
  details: HotelDetailsBody,
  owner: z.strictObject({ name: text(120), password: z.string().min(1).max(200) }).optional(),
});

/**
 * @typedef {{
 *   users: ReturnType<typeof import('../modules/identity/index.js').createUserRepository>,
 *   sessions: ReturnType<typeof import('../modules/identity/index.js').createSessionService>,
 *   orgs: ReturnType<typeof import('../modules/organizations/index.js').createOrganizationsService>,
 *   kyc: ReturnType<typeof import('../modules/kyc/index.js').createKycService>,
 *   secret: string | undefined, publicUrl: string, secureCookies: boolean, clock: import('../core/clock.js').Clock,
 * }} RegistrationDeps
 */

/** @param {RegistrationDeps} deps */
export function registrationRoutes(deps) {
  const router = express.Router();
  const limiter = createRateLimiter({ name: 'registration-ip', points: 10, windowMs: 60 * 60_000, clock: deps.clock });
  const resendLimiter = createRateLimiter({ name: 'verification-resend', points: 3, windowMs: 60 * 60_000, clock: deps.clock });

  router.post('/registrations/hotel', publicRoute(), requireAuthHeader, validate({ body: HotelRegistrationBody }), (req, res, next) => {
    (async () => {
      const limit = await limiter.consume(clientIp(req));
      if (!limit.allowed) throw new RateLimitError(limit.retryAfterSeconds);
      const body = /** @type {z.infer<typeof HotelRegistrationBody>} */ (res.locals.input.body);
      const details = validateHotelDetails(body.details);
      const owner = await ownerFor(deps, res, details, body.owner);
      const org = await deps.orgs.createOrganization({
        type: 'HOTEL',
        legalName: details.legalName,
        ownerUserId: owner.id,
        createdBy: `user:${owner.id}`,
      });
      await deps.kyc.ensureApplication({ orgId: org.id, orgType: 'HOTEL', createdBy: owner.id, details });
      if (owner.created) await sendVerification(deps, owner.id, details.email);
      const tokens = await deps.sessions.create({
        userId: owner.id,
        orgId: org.id,
        methods: ['registration'],
        ip: clientIp(req),
        userAgent: req.get('user-agent') ?? null,
      });
      res.status(201);
      sendTokens(res, tokens, deps.secureCookies);
    })().catch(next);
  });

  router.post(
    '/registrations/verify-email',
    publicRoute(),
    validate({ body: z.strictObject({ token: z.string().min(20).max(2000) }) }),
    (_req, res, next) => {
      (async () => {
        const claims = deps.secret
          ? verifyEmailVerification(res.locals.input.body.token, { secret: deps.secret, clock: deps.clock })
          : null;
        const user = claims ? await deps.users.findById(claims.userId) : null;
        if (!claims || !user || user.email !== claims.email) throw new NotFoundError('VERIFICATION_LINK_INVALID');
        await deps.users.markEmailVerified(user.id);
        res.json({ emailVerified: true });
      })().catch(next);
    },
  );

  router.post('/registrations/resend-verification', requireBusinessUser(), (_req, res, next) => {
    (async () => {
      const { actor } = contextOf(res);
      const userId = actor.type === 'user' || actor.type === 'member' ? actor.userId : '';
      const limit = await resendLimiter.consume(userId);
      if (!limit.allowed) throw new RateLimitError(limit.retryAfterSeconds);
      const user = await deps.users.findById(userId);
      if (user?.email && !user.emailVerified) await sendVerification(deps, user.id, user.email);
      res.status(204).end();
    })().catch(next);
  });
  return router;
}

/**
 * The hotel's owner: the signed-in business user, or a new account for the contact email.
 * @param {RegistrationDeps} deps
 * @param {import('express').Response} res
 * @param {import('../modules/kyc/domain/hotel-details.js').HotelDetails} details
 * @param {{ name: string, password: string } | undefined} owner
 * @returns {Promise<{ id: string, created: boolean }>}
 */
async function ownerFor(deps, res, details, owner) {
  const { actor } = contextOf(res);
  if (actor.type === 'member' && actor.viewAs) throw new ForbiddenError('NOT_DURING_VIEW_AS'); // an admin must never become a hotel's owner
  if (actor.type === 'user' || actor.type === 'member') return { id: actor.userId, created: false };
  if (await deps.users.findByLogin(details.email)) throw new ConflictError('ACCOUNT_EXISTS_SIGN_IN');
  if (!owner) throw new ConflictError('NAME_AND_PASSWORD_REQUIRED');
  assertPasswordAllowed(owner.password, { email: details.email });
  // no phone on the login account: a shared front-desk number must not block another sign-up (it stays in the KYC details)
  const user = await deps.users.create({ email: details.email, name: owner.name, password: owner.password });
  return { id: user.id, created: true };
}

/** @param {RegistrationDeps} deps @param {string} userId @param {string} email */
async function sendVerification(deps, userId, email) {
  if (!deps.secret) return;
  const token = signEmailVerification({ userId, email }, { secret: deps.secret, clock: deps.clock });
  const link = `${deps.publicUrl.replace(/\/$/, '')}/business/verify-email#token=${encodeURIComponent(token)}`;
  await queueEmail(
    {
      to: email,
      subject: 'Confirm your email for MusafirBaba Business',
      text: `Welcome to MusafirBaba Business.\n\nPlease confirm this is your email: ${link}\n\nThe link works for 48 hours. Next, upload your documents so we can verify your hotel.`,
    },
    { secret: deps.secret, clock: deps.clock },
  );
}
