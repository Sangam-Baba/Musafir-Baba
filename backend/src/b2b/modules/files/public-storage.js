// @ts-check
/**
 * Public files (D32 — hotel photos): the existing R2 bucket, folder `b2b-public/`, served to everyone at
 * `https://cdn.musafirbaba.com/<key>` like the website's newer uploads; in local development a folder on disk,
 * served by GET /api/v1/media/<key>. Only already-checked, metadata-free images are handed to this store
 * (hotel-catalog checks them). Keys are fixed-format, so nothing outside the public folder can be written or read.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export const PUBLIC_PREFIX = 'b2b-public/';
/**
 * e.g. b2b-public/hotels/MBHT-7K3Q9X/64b0…aa-gallery.webp — and (Stage 18 B8) bus photos under the bus company's
 * reference: b2b-public/buses/MBBO-4H8K2M/64b0…aa-card.webp. Nothing else can be written or served.
 */
const PUBLIC_KEY = /^b2b-public\/(hotels\/MBHT-[0-9A-Z]{6}|buses\/MBBO-[0-9A-Z]{6})\/[a-f0-9]{24}-(thumb|card|gallery|hero)\.(webp|jpg)$/;

/** @typedef {{ put: (key: string, bytes: Buffer, contentType: string) => Promise<void>, remove: (key: string) => Promise<void>, read?: (key: string) => Promise<Buffer>, url: (key: string) => string, kind: string }} PublicStore */

/** @param {string} key */
export const isPublicKey = (key) => PUBLIC_KEY.test(key);

/** @param {string} key */
function assertKey(key) {
  if (!isPublicKey(key)) throw new Error('[b2b] invalid public file key');
}

/** @param {{ dir?: string, baseUrl: string }} options @returns {PublicStore} */
export function createLocalPublicStore(options) {
  const dir = options.dir ?? path.join(homedir(), '.musafirbaba-b2b-files', 'public');
  return {
    kind: 'local',
    async put(key, bytes) {
      assertKey(key);
      await mkdir(path.dirname(path.join(dir, key)), { recursive: true });
      await writeFile(path.join(dir, key), bytes);
    },
    async remove(key) {
      assertKey(key);
      await rm(path.join(dir, key), { force: true });
    },
    async read(key) {
      assertKey(key);
      return readFile(path.join(dir, key));
    },
    url: (key) => `${options.baseUrl.replace(/\/$/, '')}/${key}`,
  };
}

/**
 * @param {{ endpoint: string, accessKeyId: string, secretAccessKey: string, bucket: string, baseUrl: string,
 *   client?: { send: (command: any) => Promise<any> } }} options
 * @returns {PublicStore}
 */
export function createR2PublicStore(options) {
  const client =
    options.client ??
    new S3Client({
      region: 'auto',
      endpoint: options.endpoint,
      credentials: { accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey },
    });
  return {
    kind: 'r2',
    async put(key, bytes, contentType) {
      assertKey(key);
      await client.send(
        new PutObjectCommand({
          Bucket: options.bucket,
          Key: key,
          Body: bytes,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
    },
    async remove(key) {
      assertKey(key);
      await client.send(new DeleteObjectCommand({ Bucket: options.bucket, Key: key }));
    },
    url: (key) => `${options.baseUrl.replace(/\/$/, '')}/${key}`,
  };
}

/**
 * @param {{ B2B_FILE_STORAGE?: string | undefined, B2B_FILE_DIR?: string | undefined, B2B_MEDIA_BASE_URL?: string | undefined,
 *   R2_ENDPOINT?: string | undefined, R2_ACCESS_KEY?: string | undefined, R2_SECRET_KEY?: string | undefined, R2_BUCKET?: string | undefined }} env
 * @returns {PublicStore}
 */
export function publicStoreFromEnv(env) {
  if (env.B2B_FILE_STORAGE !== 'r2') {
    const dir = env.B2B_FILE_DIR ? path.join(env.B2B_FILE_DIR, 'public') : undefined;
    return createLocalPublicStore({ ...(dir ? { dir } : {}), baseUrl: env.B2B_MEDIA_BASE_URL || 'http://localhost:8000/api/v1/media' });
  }
  if (!env.R2_ENDPOINT || !env.R2_ACCESS_KEY || !env.R2_SECRET_KEY || !env.R2_BUCKET)
    throw new Error('[b2b] B2B_FILE_STORAGE=r2 needs the R2_* settings');
  return createR2PublicStore({
    endpoint: env.R2_ENDPOINT,
    accessKeyId: env.R2_ACCESS_KEY,
    secretAccessKey: env.R2_SECRET_KEY,
    bucket: env.R2_BUCKET,
    baseUrl: env.B2B_MEDIA_BASE_URL || 'https://cdn.musafirbaba.com',
  });
}
