// @ts-check
/** Bus switches off (S18-T03, T08): operator registration and bus pages → 503 BUS_NOT_ENABLED, bus search → 503 BUS_SELLING_NOT_ENABLED; hotel registration unaffected. */
import { describe, expect, it } from 'vitest';

import { useInventoryApp } from './helpers/inventory-app.js';

const app = useInventoryApp({ clock: { now: () => new Date('2026-11-25T10:00:00Z') } });

describe('bus switch off', () => {
  it('operator registration is not open; hotels still register as before', async () => {
    const r = await app.srv.post('/api/v1/registrations/operator', { details: {} }, { 'x-b2b-auth': '1' });
    expect([r.status, r.body.code]).toEqual([503, 'BUS_NOT_ENABLED']);
    expect((await app.srv.post('/api/v1/registrations/hotel', { details: {} }, { 'x-b2b-auth': '1' })).status).toBe(400); // reaches the form check
    expect((await app.srv.get('/api/v1/bus/vehicles')).body.code).toBe('BUS_NOT_ENABLED');
    expect((await app.srv.get('/api/v1/admin/bus/vehicles')).body.code).toBe('BUS_NOT_ENABLED');
    expect((await app.srv.get('/api/v1/buses/search')).body.code).toBe('BUS_SELLING_NOT_ENABLED'); // B5: selling switch
  });
});
