// @ts-check
/**
 * Stage 14 routes (S14-T07): the Owner creates a key (shown once), lists, limits it to IPs, revokes it (refused at
 * once); a key can't manage keys; with two-factor sign-in on, creating / rotating needs a second-factor check in the
 * last 10 minutes; webhook endpoints CRUD, rotate secret, test event, deliveries and replay; another company gets
 * 404; a key with `webhooks:manage` may manage endpoints.
 */
import { describe, expect, it } from 'vitest';

import { ApiKeyRecord } from '../../src/b2b/modules/api-access/index.js';
import { hotp, stepAt } from '../../src/b2b/modules/identity/domain/totp.js';
import { MfaRecord } from '../../src/b2b/modules/identity/models/mfa.model.js';
import { DeliveryRecord, EndpointRecord } from '../../src/b2b/modules/webhooks/index.js';
import { auth, useInventoryApp } from './helpers/inventory-app.js';
import { clientOwner } from './helpers/search-setup.js';

let nowMs = Date.parse('2026-11-24T06:30:00Z');
const clock = { now: () => new Date(nowMs) };
const ENV = { B2B_API_ENABLED: 'true', B2B_API_KEY_PEPPER: 'developers-api-test-pepper-01' };
const app = useInventoryApp({ clock, models: [ApiKeyRecord, EndpointRecord, DeliveryRecord, MfaRecord], env: ENV });

describe('API keys over HTTP', () => {
  it('create (once) → list → IP limit → revoke; a key cannot manage keys; another company gets 404', async () => {
    nowMs = Date.parse('2026-11-24T06:30:00Z');
    const c = await clientOwner(app, 'dev-api@trips.in');
    const made = await app.srv.post('/api/v1/api-keys', { name: 'Booking engine', scopes: ['hotel:search', 'orders:read'] }, auth(c.token));
    expect(made.status).toBe(201);
    expect(made.body.key).toMatch(/^mb_live_/);
    const list = (await app.srv.get('/api/v1/api-keys', auth(c.token))).body.data;
    expect(list).toEqual([expect.objectContaining({ name: 'Booking engine', display: expect.stringMatching(/^mb_live_.{8}_…$/) })]);
    expect(JSON.stringify(list)).not.toContain(made.body.key);

    expect((await app.srv.get('/api/v1/client/bookings', auth(made.body.key))).status).not.toBe(401);
    expect((await app.srv.get('/api/v1/api-keys', auth(made.body.key))).status).toBe(403); // keys never manage keys
    expect((await app.srv.post('/api/v1/api-keys', { name: 'x', scopes: ['orders:read'] }, auth(made.body.key))).status).toBe(403);
    expect((await app.srv.post('/api/v1/api-keys', { name: 'x', scopes: ['admin:everything'] }, auth(c.token))).status).toBe(400);

    const limited = await app.srv.patch(`/api/v1/api-keys/${made.body.id}`, { ipAllowList: ['203.0.113.0/24'] }, auth(c.token));
    expect(limited.body.ipAllowList).toEqual(['203.0.113.0/24']);
    expect((await app.srv.get('/api/v1/client/bookings', auth(made.body.key))).body.code).toBe('API_KEY_IP_NOT_ALLOWED'); // at once
    const bad = await app.srv.patch(`/api/v1/api-keys/${made.body.id}`, { ipAllowList: ['not-an-ip'] }, auth(c.token));
    expect([bad.status, bad.body.code]).toEqual([422, 'IP_ENTRY_INVALID']);

    const other = await clientOwner(app, 'dev-api-other@trips.in');
    expect((await app.srv.del(`/api/v1/api-keys/${made.body.id}`, auth(other.token))).status).toBe(404);
    expect((await app.srv.del(`/api/v1/api-keys/${made.body.id}`, auth(c.token))).body.status).toBe('REVOKED');
    expect((await app.srv.get('/api/v1/client/bookings', auth(made.body.key))).status).toBe(401);
  });

  it('two-factor on → creating and rotating need a second-factor check in the last 10 minutes', async () => {
    nowMs = Date.parse('2026-11-24T08:00:00Z');
    const c = await clientOwner(app, 'dev-mfa@trips.in');
    const setup = await app.srv.post('/api/v1/me/mfa/totp/setup', {}, auth(c.token));
    expect(
      (await app.srv.post('/api/v1/me/mfa/totp/enable', { code: hotp(setup.body.secret, stepAt(clock.now())) }, auth(c.token))).status,
    ).toBe(200);
    const refused = await app.srv.post('/api/v1/api-keys', { name: 'Engine', scopes: ['orders:read'] }, auth(c.token));
    expect([refused.status, refused.body.code]).toEqual([403, 'STEP_UP_REQUIRED']);
    nowMs += 60_000; // a fresh code
    expect((await app.srv.post('/api/v1/me/step-up', { code: hotp(setup.body.secret, stepAt(clock.now())) }, auth(c.token))).status).toBe(
      200,
    );
    const made = await app.srv.post('/api/v1/api-keys', { name: 'Engine', scopes: ['orders:read'] }, auth(c.token));
    expect(made.status).toBe(201);
    nowMs += 11 * 60_000;
    expect((await app.srv.post(`/api/v1/api-keys/${made.body.id}/rotate`, {}, auth(c.token))).body.code).toBe('STEP_UP_REQUIRED');
  });
});

describe('webhooks over HTTP', () => {
  it('endpoint CRUD, secret once, rotate, test event and deliveries, replay; private URL refused; key with webhooks:manage', async () => {
    nowMs = Date.parse('2026-11-24T09:00:00Z');
    const c = await clientOwner(app, 'dev-hooks@trips.in');
    const ep = await app.srv.post(
      '/api/v1/webhook-endpoints',
      { url: 'https://hooks.trips.co/mb', events: ['booking.confirmed'] },
      auth(c.token),
    );
    expect(ep.status).toBe(201);
    expect(ep.body.secret).toMatch(/^whsec_/);
    expect((await app.srv.get('/api/v1/webhook-endpoints', auth(c.token))).body.data[0]).not.toHaveProperty('secret');
    const priv = await app.srv.post(
      '/api/v1/webhook-endpoints',
      { url: 'https://169.254.169.254/latest', events: ['booking.confirmed'] },
      auth(c.token),
    );
    expect([priv.status, priv.body.code]).toEqual([422, 'URL_PRIVATE_ADDRESS']);
    expect((await app.srv.post(`/api/v1/webhook-endpoints/${ep.body.id}/rotate-secret`, {}, auth(c.token))).body.secret).not.toBe(
      ep.body.secret,
    );
    const t = await app.srv.post(`/api/v1/webhook-endpoints/${ep.body.id}/test`, {}, auth(c.token));
    expect([t.status, t.body.type]).toEqual([202, 'webhook.test']);
    const log = (await app.srv.get(`/api/v1/webhook-deliveries?endpointId=${ep.body.id}`, auth(c.token))).body.data;
    expect(log).toEqual([expect.objectContaining({ type: 'webhook.test', status: 'PENDING' })]);
    const replay = await app.srv.post(`/api/v1/webhook-deliveries/${log[0].id}/replay`, {}, auth(c.token));
    expect(replay.body).toMatchObject({ eventId: log[0].eventId, replayOf: log[0].id });
    expect((await app.srv.patch(`/api/v1/webhook-endpoints/${ep.body.id}`, { enabled: false }, auth(c.token))).body.status).toBe(
      'DISABLED',
    );

    const other = await clientOwner(app, 'dev-hooks-other@trips.in');
    expect((await app.srv.get(`/api/v1/webhook-deliveries`, auth(other.token))).body.data).toEqual([]);
    expect((await app.srv.del(`/api/v1/webhook-endpoints/${ep.body.id}`, auth(other.token))).status).toBe(404);

    const key = (await app.srv.post('/api/v1/api-keys', { name: 'Ops', scopes: ['webhooks:manage'] }, auth(c.token))).body.key;
    expect((await app.srv.get('/api/v1/webhook-endpoints', auth(key))).status).toBe(200);
    expect((await app.srv.del(`/api/v1/webhook-endpoints/${ep.body.id}`, auth(key))).body.status).toBe('DELETED');
  });
});
