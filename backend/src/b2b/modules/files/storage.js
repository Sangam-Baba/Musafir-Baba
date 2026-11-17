// @ts-check
/**
 * Where encrypted file bytes are kept (D29):
 * - `local` (development default): a folder on disk, outside the repository;
 * - `r2` (production): the existing Cloudflare R2 bucket, private folder `b2b-private/`, through the
 *   existing `@aws-sdk/client-s3` package and the existing R2_* settings (read only).
 * Only ciphertext is ever handed to a store — see files.service.js.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export const R2_PREFIX = 'b2b-private/';
const KEY = /^[a-f0-9]{48}$/;

/** @typedef {{ put: (key: string, bytes: Buffer) => Promise<void>, get: (key: string) => Promise<Buffer>, remove: (key: string) => Promise<void>, kind: string }} FileStore */

/** @param {string} key */
function assertKey(key) {
  if (!KEY.test(key)) throw new Error('[b2b] invalid storage key');
}

/** @param {string} [dir] @returns {FileStore} */
export function createLocalStore(dir = path.join(homedir(), '.musafirbaba-b2b-files')) {
  return {
    kind: 'local',
    async put(key, bytes) {
      assertKey(key);
      await mkdir(dir, { recursive: true, mode: 0o700 });
      await writeFile(path.join(dir, key), bytes, { mode: 0o600 });
    },
    async get(key) {
      assertKey(key);
      return readFile(path.join(dir, key));
    },
    async remove(key) {
      assertKey(key);
      await rm(path.join(dir, key), { force: true });
    },
  };
}

/**
 * @param {{ endpoint: string, accessKeyId: string, secretAccessKey: string, bucket: string, client?: { send: (command: any) => Promise<any> } }} options
 * @returns {FileStore}
 */
export function createR2Store(options) {
  const client =
    options.client ??
    new S3Client({
      region: 'auto',
      endpoint: options.endpoint,
      credentials: { accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey },
    });
  return {
    kind: 'r2',
    async put(key, bytes) {
      assertKey(key);
      await client.send(
        new PutObjectCommand({ Bucket: options.bucket, Key: `${R2_PREFIX}${key}`, Body: bytes, ContentType: 'application/octet-stream' }),
      );
    },
    async get(key) {
      assertKey(key);
      const res = await client.send(new GetObjectCommand({ Bucket: options.bucket, Key: `${R2_PREFIX}${key}` }));
      return Buffer.from(await res.Body.transformToByteArray());
    },
    async remove(key) {
      assertKey(key);
      await client.send(new DeleteObjectCommand({ Bucket: options.bucket, Key: `${R2_PREFIX}${key}` }));
    },
  };
}

/**
 * @param {{ B2B_FILE_STORAGE: 'local' | 'r2', B2B_FILE_DIR?: string | undefined, R2_ENDPOINT?: string | undefined, R2_ACCESS_KEY?: string | undefined,
 *   R2_SECRET_KEY?: string | undefined, R2_BUCKET?: string | undefined }} config
 * @returns {FileStore}
 */
export function fileStoreFromConfig(config) {
  if (config.B2B_FILE_STORAGE !== 'r2') return createLocalStore(config.B2B_FILE_DIR);
  if (!config.R2_ENDPOINT || !config.R2_ACCESS_KEY || !config.R2_SECRET_KEY || !config.R2_BUCKET)
    throw new Error('[b2b] B2B_FILE_STORAGE=r2 needs the R2_* settings');
  return createR2Store({
    endpoint: config.R2_ENDPOINT,
    accessKeyId: config.R2_ACCESS_KEY,
    secretAccessKey: config.R2_SECRET_KEY,
    bucket: config.R2_BUCKET,
  });
}
