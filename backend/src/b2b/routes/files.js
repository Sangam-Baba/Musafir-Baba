// @ts-check
/**
 * POST /api/v1/files?purpose=kyc-document — upload one document for the selected org.
 * The body is the raw file (≤ 10 MB); the name comes in the `X-File-Name` header. The type is decided
 * from the content, the file is stored encrypted (D29, D30). Uploading needs `kyc.application.submit`
 * (KYC is the only purpose so far); reading documents back is S02-T03.
 */
import express from 'express';
import { z } from 'zod';

import { DomainError, ForbiddenError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { createFilesService, fileStoreFromConfig, MAX_FILE_BYTES } from '../modules/files/index.js';
import { PERMISSIONS as KYC } from '../modules/kyc/index.js';

export const FILE_PURPOSES = /** @type {const} */ (['kyc-document']);

/**
 * @param {NodeJS.ProcessEnv} env
 * @param {import('../core/clock.js').Clock} clock
 */
export function createFiles(env, clock) {
  const store = fileStoreFromConfig({
    B2B_FILE_STORAGE: env.B2B_FILE_STORAGE === 'r2' ? 'r2' : 'local',
    B2B_FILE_DIR: env.B2B_FILE_DIR,
    R2_ENDPOINT: env.R2_ENDPOINT,
    R2_ACCESS_KEY: env.R2_ACCESS_KEY,
    R2_SECRET_KEY: env.R2_SECRET_KEY,
    R2_BUCKET: env.R2_BUCKET,
  });
  return createFilesService({ store, masterKey: env.B2B_FILE_KEY ?? env.B2B_AUTH_SECRET, clock });
}

/** @param {ReturnType<typeof createFilesService>} files */
export function fileRoutes(files) {
  const router = express.Router();
  router.post(
    '/files',
    requirePermission(KYC.applicationSubmit),
    validate({ query: z.strictObject({ purpose: z.enum(FILE_PURPOSES) }) }),
    express.raw({ type: () => true, limit: MAX_FILE_BYTES }),
    (req, res, next) => {
      (async () => {
        const { actor } = contextOf(res);
        if (actor.type !== 'member') throw new ForbiddenError('ORG_NOT_SELECTED');
        if (!Buffer.isBuffer(req.body)) throw new DomainError('FILE_EMPTY');
        const stored = await files.store({
          orgId: actor.orgId,
          purpose: res.locals.input.query.purpose,
          uploadedBy: actor.userId,
          originalName: req.get('x-file-name'),
          bytes: req.body,
        });
        res.status(201).json(stored);
      })().catch(next);
    },
  );
  return router;
}
