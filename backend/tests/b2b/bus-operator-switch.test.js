// @ts-check
/** Bus switch off (S18-T03): `POST /registrations/operator` → 503 BUS_NOT_ENABLED; hotel registration unaffected. */
import { describe, expect, it } from 'vitest';

import { useInventoryApp } from './helpers/inventory-app.js';

const app = useInventoryApp({ clock: { now: () => new Date('2026-11-25T10:00:00Z') } });

describe('bus switch off', () => {
  it('operator registration is not open; hotels still register as before', async () => {
    const r = await app.srv.post('/api/v1/registrations/operator', { details: {} }, { 'x-b2b-auth': '1' });
    expect([r.status, r.body.code]).toEqual([503, 'BUS_NOT_ENABLED']);
    expect((await app.srv.post('/api/v1/registrations/hotel', { details: {} }, { 'x-b2b-auth': '1' })).status).toBe(400); // reaches the form check
  });
});
