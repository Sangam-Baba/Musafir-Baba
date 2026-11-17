// @ts-check
/** Small request helpers shared by the Stage 04 (rooms, prices, rules) routes. */
import { z } from 'zod';

import { AppError } from '../core/errors.js';

export const Id = z.string().regex(/^[a-f0-9]{24}$/);

/** The version the screen loaded, from `If-Match` (428 without it). @param {import('express').Request} req */
export function versionOf(req) {
  const raw = String(req.get('if-match') ?? '')
    .replace(/^W\//, '')
    .replace(/"/g, '');
  if (!/^\d+$/.test(raw)) throw new AppError('VERSION_REQUIRED', 428, 'Send the version you loaded in the If-Match header');
  return Number(raw);
}
