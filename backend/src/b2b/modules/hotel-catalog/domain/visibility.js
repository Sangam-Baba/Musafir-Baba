// @ts-check
/**
 * Who may see a listing (plan Stage 03 §3.6, §3.9): only LIVE listings, only on the channels switched on
 * (website / B2B), not before the "sell from" date (in the hotel's own time zone), and for B2B — when client
 * categories are set — only clients in one of them. Pure.
 */

export const CHANNELS = /** @type {const} */ (['WEBSITE', 'B2B']);
/** @typedef {typeof CHANNELS[number]} Channel */

/**
 * @param {{ status: string, visibility?: { website?: boolean, b2b?: boolean, clientCategories?: string[], sellFrom?: string | null } | null }} p
 * @param {{ channel: Channel, today: string, clientCategory?: string | null }} viewer
 */
export function isVisible(p, viewer) {
  if (p.status !== 'LIVE') return false;
  const v = p.visibility ?? {};
  if (viewer.channel === 'WEBSITE' && v.website === false) return false;
  if (viewer.channel === 'B2B' && v.b2b === false) return false;
  if (v.sellFrom && viewer.today < v.sellFrom) return false;
  const categories = v.clientCategories ?? [];
  if (viewer.channel === 'B2B' && categories.length > 0 && !(viewer.clientCategory && categories.includes(viewer.clientCategory)))
    return false;
  return true;
}
