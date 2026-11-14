// @ts-check
/**
 * Two-step login with an authenticator app (plan Stage 01 §3.1 "optional TOTP + recovery codes").
 * setup → (scan QR) → enable(code) returns 10 recovery codes once → verify(code | recovery code) at login
 * and for step-up. A code is accepted once (last used step stored with a conditional update); a recovery
 * code once (array element marked used in one update). The secret is stored sealed.
 */
import { createHmac, randomBytes } from 'node:crypto';

import { seal, unseal } from '../../core/crypto.js';
import { ConflictError, ServiceUnavailableError, UnauthorizedError } from '../../core/errors.js';
import { matchTotp, newTotpSecret, otpauthUrl } from './domain/totp.js';
import { MfaRecord } from './models/mfa.model.js';

export const RECOVERY_CODE_COUNT = 10;
const SEAL_PURPOSE = 'totp-secret';
const RECOVERY_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // no look-alikes (0/o, 1/l/i)

/** @typedef {{ code?: string | undefined, recoveryCode?: string | undefined }} MfaProof */

/** @returns {string} e.g. 'k7mqp-3xw9d' */
function newRecoveryCode() {
  const bytes = randomBytes(10);
  const chars = [...bytes].map((b) => RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length]).join('');
  return `${chars.slice(0, 5)}-${chars.slice(5)}`;
}

/** @param {string} input */
const normaliseRecovery = (input) => input.toLowerCase().replace(/[\s-]/g, '');

/** @param {string} key @param {string} userId @param {string} code */
const recoveryHash = (key, userId, code) =>
  createHmac('sha256', key)
    .update(`recovery:${userId}:${normaliseRecovery(code)}`)
    .digest('base64url');

/** @param {string} key @param {string} userId */
function freshRecoveryCodes(key, userId) {
  const plain = Array.from({ length: RECOVERY_CODE_COUNT }, newRecoveryCode);
  return { plain, stored: plain.map((c) => ({ hash: recoveryHash(key, userId, c), usedAt: null })) };
}

/**
 * Accepts an app code once (last used step, conditional update) or a recovery code once (array element).
 * @param {string} key @param {string} userId @param {MfaProof} proof @param {Date} now
 * @returns {Promise<'totp' | 'recovery-code'>}
 */
async function verifyProof(key, userId, proof, now) {
  const doc = await MfaRecord.findOne({ userId, status: 'ACTIVE' }).lean();
  if (!doc) throw new UnauthorizedError('MFA_NOT_ENABLED');
  if (proof.code) {
    const step = matchTotp(String(unseal(doc.secretSealed, { secret: key, purpose: SEAL_PURPOSE })), proof.code, now);
    if (step === null) throw new UnauthorizedError('MFA_CODE_INVALID');
    const fresh = await MfaRecord.updateOne(
      { userId, status: 'ACTIVE', $or: [{ lastUsedStep: null }, { lastUsedStep: { $lt: step } }] },
      { $set: { lastUsedStep: step } },
    );
    if (fresh.modifiedCount !== 1) throw new UnauthorizedError('MFA_CODE_INVALID'); // already used
    return 'totp';
  }
  if (proof.recoveryCode) {
    const hash = recoveryHash(key, userId, proof.recoveryCode);
    const used = await MfaRecord.updateOne(
      { userId, status: 'ACTIVE', recoveryCodes: { $elemMatch: { hash, usedAt: null } } },
      { $set: { 'recoveryCodes.$.usedAt': now } },
    );
    if (used.modifiedCount !== 1) throw new UnauthorizedError('MFA_CODE_INVALID');
    return 'recovery-code';
  }
  throw new UnauthorizedError('MFA_CODE_INVALID');
}

/**
 * Starts (or restarts) setup with a new sealed secret. Refused while two-step login is on (unique userId).
 * @param {string} key @param {string} userId @param {string} account
 */
async function startSetup(key, userId, account) {
  const secret = newTotpSecret();
  const set = {
    status: 'PENDING',
    secretSealed: seal(secret, { secret: key, purpose: SEAL_PURPOSE }),
    lastUsedStep: null,
    recoveryCodes: [],
    enabledAt: null,
  };
  try {
    await MfaRecord.findOneAndUpdate({ userId, status: { $ne: 'ACTIVE' } }, { $set: set }, { upsert: true });
  } catch (error) {
    if (/** @type {{ code?: number }} */ (error).code === 11000) throw new ConflictError('MFA_ALREADY_ON');
    throw error;
  }
  return { secret, otpauthUrl: otpauthUrl({ secret, account }) };
}

/** @param {{ secret: string | undefined, clock: import('../../core/clock.js').Clock }} deps */
export function createMfaService(deps) {
  const key = () => {
    if (!deps.secret || deps.secret.length < 32) throw new ServiceUnavailableError('BUSINESS_LOGIN_NOT_CONFIGURED');
    return deps.secret;
  };
  /** @param {string} userId @param {MfaProof} proof */
  const verify = (userId, proof) => verifyProof(key(), userId, proof, deps.clock.now());

  return {
    verify,

    /** @param {string} userId */
    async isEnabled(userId) {
      return (await MfaRecord.countDocuments({ userId, status: 'ACTIVE' })) === 1;
    },

    /** @param {string} userId @returns {Promise<{ totp: 'off' | 'pending' | 'on', recoveryCodesLeft: number }>} */
    async status(userId) {
      const doc = await MfaRecord.findOne({ userId }).lean();
      if (!doc) return { totp: 'off', recoveryCodesLeft: 0 };
      return { totp: doc.status === 'ACTIVE' ? 'on' : 'pending', recoveryCodesLeft: doc.recoveryCodes.filter((c) => !c.usedAt).length };
    },

    /**
     * Starts (or restarts) setup. Not allowed while two-step login is on.
     * @param {string} userId @param {string} account shown in the authenticator app (email)
     */
    setup: (userId, account) => startSetup(key(), userId, account),

    /** @param {string} userId @param {string} code @returns {Promise<{ recoveryCodes: string[] }>} shown once */
    async enable(userId, code) {
      const doc = await MfaRecord.findOne({ userId, status: 'PENDING' }).lean();
      if (!doc) throw new ConflictError('MFA_SETUP_NOT_STARTED');
      const step = matchTotp(String(unseal(doc.secretSealed, { secret: key(), purpose: SEAL_PURPOSE })), code, deps.clock.now());
      if (step === null) throw new UnauthorizedError('MFA_CODE_INVALID');
      const codes = freshRecoveryCodes(key(), userId);
      const done = await MfaRecord.updateOne(
        { userId, status: 'PENDING', secretSealed: doc.secretSealed },
        { $set: { status: 'ACTIVE', lastUsedStep: step, recoveryCodes: codes.stored, enabledAt: deps.clock.now() } },
      );
      if (done.modifiedCount !== 1) throw new ConflictError('MFA_SETUP_CHANGED');
      return { recoveryCodes: codes.plain };
    },

    /** @param {string} userId @param {MfaProof} proof */
    async disable(userId, proof) {
      await verify(userId, proof);
      await MfaRecord.deleteOne({ userId });
    },

    /** @param {string} userId @param {MfaProof} proof @returns {Promise<{ recoveryCodes: string[] }>} */
    async regenerateRecoveryCodes(userId, proof) {
      await verify(userId, proof);
      const codes = freshRecoveryCodes(key(), userId);
      await MfaRecord.updateOne({ userId, status: 'ACTIVE' }, { $set: { recoveryCodes: codes.stored } });
      return { recoveryCodes: codes.plain };
    },
  };
}
