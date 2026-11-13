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
