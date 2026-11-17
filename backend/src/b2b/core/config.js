// @ts-check
/**
 * B2B configuration, validated once. Reads existing variables (MONGO_URI) and new
 * B2B_* variables only — it never changes the existing env (docs/plan/12-… §2, B5).
 */
import { z } from 'zod';

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  /** Background work (jobs, schedules, event relay, live-update reader) inside this backend process. "false" turns it off. */
  B2B_BACKGROUND: z.enum(['true', 'false']).default('true'),
  /** Signs business-user tokens. Separate from the existing JWT secrets on purpose. Business login is unavailable until set. */
  B2B_AUTH_SECRET: z.string().min(32, 'B2B_AUTH_SECRET must be at least 32 characters').optional(),
  /** Shared with the website's login relay (Vercel) so the API can use the visitor's real IP for rate limits. */
  B2B_RELAY_SECRET: z.string().min(32, 'B2B_RELAY_SECRET must be at least 32 characters').optional(),
  /** 'log' (default) writes emails to the log; 'resend' really sends them (production only). */
  B2B_EMAIL_MODE: z.enum(['log', 'resend']).default('log'),
  /** Sender address for B2B emails, e.g. "MusafirBaba Business <business@musafirbaba.com>". */
  B2B_EMAIL_FROM: z.string().min(3).optional(),
  /** Public address of the website, used in emailed links (e.g. https://musafirbaba.com). */
  B2B_PUBLIC_URL: z.string().url().default('https://musafirbaba.com'),
  /** Unfinished hotel registrations: reminder after this many days, removal (with documents) after this many (S02-T11). */
  B2B_KYC_REMIND_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  B2B_KYC_PURGE_DAYS: z.coerce.number().int().min(2).max(730).default(90),
  /** Where encrypted documents are kept: 'local' (development, a folder on disk) or 'r2' (existing bucket, private folder) — D29. */
  B2B_FILE_STORAGE: z.enum(['local', 'r2']).default('local'),
  /** Master key that locks each document's own key (≥ 32 characters). Falls back to B2B_AUTH_SECRET when unset. */
  B2B_FILE_KEY: z.string().min(32).optional(),
  /** Folder for 'local' file storage (default: ~/.musafirbaba-b2b-files, outside the repository). */
  B2B_FILE_DIR: z.string().optional(),
  /** Existing variables, read only — the existing R2 bucket (used only when B2B_FILE_STORAGE=r2). */
  R2_ENDPOINT: z.string().optional(),
  R2_ACCESS_KEY: z.string().optional(),
  R2_SECRET_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  /** Existing variable, read only — verifies existing customer/admin logins on /api/v1 (never used to sign). */
  JWT_ACCESS_SECRET: z.string().optional(),
  /** Existing variable, read only — the existing Resend account (D25). */
  RESEND_API_KEY: z.string().optional(),
});

/** @typedef {z.infer<typeof ConfigSchema>} B2BConfig */

/**
 * @param {NodeJS.ProcessEnv} env
 * @returns {B2BConfig}
 */
export function loadConfig(env) {
  const result = ConfigSchema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`[b2b] invalid configuration — ${issues}`);
  }
  return result.data;
}
