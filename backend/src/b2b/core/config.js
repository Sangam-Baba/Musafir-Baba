// @ts-check
/**
 * B2B configuration, validated once. Reads existing variables (MONGO_URI) and new
 * B2B_* variables only — it never changes the existing env (docs/plan/12-… §2, B5).
 */
import { z } from 'zod';

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  B2B_REALTIME_PORT: z.coerce.number().int().min(1).max(65535).default(8101),
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
