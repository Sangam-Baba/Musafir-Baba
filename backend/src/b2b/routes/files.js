// @ts-check
/**
 * POST /api/v1/files?purpose=kyc-document — upload one document for the selected org.
 * The body is the raw file (≤ 10 MB); the name comes in the `X-File-Name` header. The type is decided
 * from the content, the file is stored encrypted (D29, D30). Uploading needs `kyc.application.submit`
 * (KYC is the only purpose so far).
 * Reading back (S02-T03): ask for a 60-second link, then GET /files/download?t=… (the link is the
 * permission; every link and download is logged):
 * - POST /files/:id/link — the org's own members with `kyc.application.read`;
 * - POST /admin/files/:id/link {orgId} — MusafirBaba reviewers with `platform.kyc.read`;
 * - GET /admin/files/:id/access?orgId= — who opened a document.
 */
import express from 'express';
import { z } from 'zod';

import { DomainError, ForbiddenError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { publicRoute, requirePermission } from '../core/http/permissions.js';
import { clientIp } from '../core/rate-limit.js';
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
  router.use(readRoutes(files));
  return router;
}

const FileParams = z.strictObject({ id: z.string().regex(/^[a-f0-9]{24}$/) });
const OrgId = z.string().regex(/^[a-f0-9]{24}$/);

/** @param {ReturnType<typeof createFilesService>} files */
function readRoutes(files) {
  const router = express.Router();
  router.post('/files/:id/link', requirePermission(KYC.applicationRead), validate({ params: FileParams }), (req, res, next) => {
    const { actor } = contextOf(res);
    if (actor.type !== 'member') return next(new ForbiddenError('ORG_NOT_SELECTED'));
    files
      .issueLink({ orgId: actor.orgId, fileId: res.locals.input.params.id, viewer: `user:${actor.userId}`, ip: clientIp(req) })
      .then((l) => res.json(l), next);
  });
  router.post(
    '/admin/files/:id/link',
    requirePermission(KYC.platformRead),
    validate({ params: FileParams, body: z.strictObject({ orgId: OrgId }) }),
    (req, res, next) => {
      const { actor } = contextOf(res);
      if (actor.type !== 'staff') return next(new ForbiddenError());
      files
        .issueLink({
          orgId: res.locals.input.body.orgId,
          fileId: res.locals.input.params.id,
          viewer: `staff:${actor.staffId}`,
          ip: clientIp(req),
        })
        .then((l) => res.json(l), next);
    },
  );
  router.get(
    '/admin/files/:id/access',
    requirePermission(KYC.platformRead),
    validate({ params: FileParams, query: z.strictObject({ orgId: OrgId }) }),
    (_req, res, next) => {
      files.accessLog(res.locals.input.query.orgId, res.locals.input.params.id).then((data) => res.json({ data }), next);
    },
  );
  // the signed 60-second link is the permission; the response is always a download, never a page
  router.get(
    '/files/download',
    publicRoute(),
    validate({ query: z.strictObject({ t: z.string().min(20).max(600) }) }),
    (req, res, next) => {
      files.download(res.locals.input.query.t, clientIp(req)).then((file) => {
        res.set({
          'Content-Type': file.contentType,
          'Content-Disposition': `attachment; filename="${file.originalName.replace(/"/g, '')}"`,
          'X-Content-Type-Options': 'nosniff',
          'Content-Security-Policy': "default-src 'none'; sandbox",
        });
        res.send(file.bytes);
      }, next);
    },
  );
  return router;
}
