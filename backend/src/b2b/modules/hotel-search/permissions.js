// @ts-check
/**
 * Permissions of the hotel-search module (Stage 06). Website search, offers and price check are public (no sign-in,
 * stricter rate limits). B2B clients search with `hotel-search.search.use` (Owner, Admin, Booking Agent) and see B2B
 * prices; screens come with Stage 12, API keys with Stage 14.
 */
import { definePermissions } from '../../core/permissions.js';

export const { codes: PERMISSIONS, catalogue: PERMISSION_CATALOGUE } = definePermissions('Hotel search', {
  search: {
    code: 'hotel-search.search.use',
    description: 'Search hotels, see rooms with B2B prices and check a price before booking',
    orgTypes: ['CLIENT'],
  },
});
