// @ts-check
/**
 * Notifications foundation (S02-T10; plan 11 §15): one inbox row per event and recipient, live push with
 * ids and titles only, emails from templates, catch-up, permission filter, preferences with critical lock.
 */
import express from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { newEvent } from '../../src/b2b/core/db/events.js';
import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { createUserRepository, UserRecord } from '../../src/b2b/modules/identity/index.js';
import {
  createDelivery,
  InboxRecord,
  PreferenceRecord,
  renderTemplate,
  visibleOrgCategories,
} from '../../src/b2b/modules/notifications/index.js';
import { createOrganizationsService, MemberRecord, OrganizationRecord } from '../../src/b2b/modules/organizations/index.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startServer } from './helpers/http.js';
import { startMongo } from './helpers/mongo.js';

const SECRET = ['b2b', 'notifications', 'test', 'secret', 'long-enough'].join('-');
const PASSWORD = 'correct-horse-battery';
const clock = { now: () => new Date('2026-11-15T10:00:00Z') };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };

describe('templates and catalogue', () => {
  it('renders with the allowed variables; control characters can not add lines; markup stays text', () => {
    const r = renderTemplate('kyc.approved', { orgName: 'Sea <b>View</b>\r\nBcc: x@evil.in', link: 'https://musafirbaba.com/business' });
    expect(r.title).toBe('Verification approved');
    expect(r.subject).not.toMatch(/[\r\n]/);
    expect(r.text).toContain('Sea <b>View</b> Bcc: x@evil.in is verified'); // one line, shown as typed
    expect(r.version).toBe(1);
    expect(() => renderTemplate('kyc.approved', { orgName: 'x' })).toThrow(expect.objectContaining({ code: 'TEMPLATE_VARIABLES_MISSING' }));
    const custom = { t: { version: 1, vars: ['a'], title: '{{a}}', body: '{{b}}', subject: 's', text: 't' } };
    expect(() => renderTemplate('t', { a: '1' }, custom)).toThrow(expect.objectContaining({ code: 'TEMPLATE_VARIABLE_UNKNOWN' }));
    expect(() => renderTemplate('nope', {})).toThrow(expect.objectContaining({ code: 'TEMPLATE_NOT_FOUND' }));
  });

  it('org categories follow permissions', () => {
    expect(visibleOrgCategories(['kyc.application.read'])).toEqual(['kyc.submitted', 'kyc.approved', 'kyc.rejected', 'kyc.reminder']);
    expect(visibleOrgCategories([])).toEqual([]);
  });
});

describe('delivery and the bell', () => {
  /** @type {Awaited<ReturnType<typeof startMongo>>} */
  let mongo;
  /** @type {Awaited<ReturnType<typeof startServer>>} */
  let srv;
  const users = createUserRepository({ bcryptCost: 4, clock });
  const orgs = createOrganizationsService({ clock });
  /** @type {{ room: string, event: string, data: Record<string, unknown> }[]} */
  let pushes = [];
  /** @type {{ to: string, subject: string, text: string }[]} */
  let emails = [];
  let orgId = '';
  let otherOrgId = '';
  let ownerId = '';
  let managerId = '';

  /** @param {Partial<import('../../src/b2b/modules/notifications/delivery.js').DeliveryDeps>} [over] */
  const delivery = (over = {}) =>
    createDelivery({
      clock,
      publicUrl: 'https://musafirbaba.com/',
      orgName: async (id) => (await orgs.basicInfo(id))?.displayName ?? null,
      ownerContacts: async (id) => (await users.describe(await orgs.ownerUserIds(id))).map((u) => ({ userId: u.id, email: u.email })),
      userContact: async (id) => (await users.describe([id])).map((u) => ({ userId: u.id, email: u.email }))[0] ?? null,
      queueEmail: async (m) => {
        emails.push(m);
      },
      publish: async (room, event, data) => {
        pushes.push({ room, event, data });
      },
      ...over,
    });
  /** @param {string} email */
  const login = async (email) =>
    (await srv.post('/api/v1/auth/login', { identifier: email, password: PASSWORD }, { 'x-b2b-auth': '1' })).body.accessToken;
  /** @param {string} t */
  const auth = (t) => ({ authorization: `Bearer ${t}` });

  beforeAll(async () => {
    mongo = await startMongo();
    await runMigrations(MIGRATIONS, { clock, owner: 'test' });
    const app = express();
    app.use(
      '/api/v1',
      createB2BRouter({ connect: false, logger: createLogger({ write: () => {} }), clock, env: { B2B_AUTH_SECRET: SECRET } }),
    );
    srv = await startServer(app);
  });
  afterAll(async () => {
    await srv.close();
    await mongo.stop();
  });
  beforeEach(async () => {
    pushes = [];
    emails = [];
    await Promise.all([
      UserRecord.deleteMany({}),
      OrganizationRecord.deleteMany({}).setOptions(SYSTEM),
      MemberRecord.deleteMany({}).setOptions(SYSTEM),
      InboxRecord.deleteMany({}).setOptions(SYSTEM),
      PreferenceRecord.deleteMany({}).setOptions(SYSTEM),
    ]);
    const owner = await users.create({ email: 'owner@seaview.in', name: 'Owner', password: PASSWORD });
    const manager = await users.create({ email: 'manager@seaview.in', name: 'Manager', password: PASSWORD });
    const stranger = await users.create({ email: 'owner@hill.in', name: 'Other', password: PASSWORD });
    ownerId = owner.id;
    managerId = manager.id;
    orgId = (await orgs.createOrganization({ type: 'HOTEL', legalName: 'Sea View', ownerUserId: owner.id, createdBy: 's' })).id;
    otherOrgId = (await orgs.createOrganization({ type: 'HOTEL', legalName: 'Hill View', ownerUserId: stranger.id, createdBy: 's' })).id;
    await orgs.addMember({ orgId, userId: manager.id, roles: ['hotel.manager'], addedBy: 's' });
  });

  const approved = () =>
    newEvent('kyc.application.approved', { orgId, applicationId: 'app-1', orgType: 'HOTEL', approvedBy: ['staff:a'] }, { clock });

  it('one row, one push and one email per event — even when the event is handled twice', async () => {
    const event = approved();
    await delivery()(event);
    await delivery()(event);
    const rows = await InboxRecord.find({ recipientId: orgId }).lean();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ category: 'kyc.approved', critical: true, emailState: 'QUEUED', link: '/business/verification' });
    expect(pushes.filter((p) => p.event === 'queue:changed').map((p) => p.room)).toContain('b2b:admin:general'); // the review queue changed
    expect(pushes.filter((p) => p.event === 'notification:new')).toEqual([
      {
        room: `b2b:org:${orgId}`,
        event: 'notification:new',
        data: { id: String(rows[0]?._id), category: 'kyc.approved', title: 'Verification approved' },
      },
    ]);
    expect(emails.map((e) => [e.to, e.subject])).toEqual([['owner@seaview.in', 'Your business is verified — MusafirBaba Business']]);
    expect(emails[0]?.text).toContain('https://musafirbaba.com/business/verification');
  });

  it('a crash before the emails were queued: the repeat sends them; a failed live push does not stop delivery', async () => {
    const event = approved();
    await expect(delivery({ queueEmail: async () => Promise.reject(new Error('crash')) })(event)).rejects.toThrow('crash');
    expect((await InboxRecord.findOne({ recipientId: orgId }).lean())?.emailState).toBe('PENDING');
    await delivery({ publish: async () => Promise.reject(new Error('down')) })(event);
    expect(emails).toHaveLength(1);
    expect((await InboxRecord.findOne({ recipientId: orgId }).lean())?.emailState).toBe('QUEUED');
  });

  it('submissions also tell the MusafirBaba review queue (ids only)', async () => {
    await delivery()(
      newEvent('kyc.application.submitted', { orgId, applicationId: 'app-1', orgType: 'HOTEL', round: 1, highRisk: false }, { clock }),
    );
    expect(pushes[0]).toEqual({ room: 'b2b:admin:general', event: 'queue:changed', data: { queue: 'kyc' } });
    expect(pushes[1]?.event).toBe('notification:new');
  });

  it('the bell: permission filter, unread count, read, read-all, catch-up after a cursor, other orgs see nothing', async () => {
    await delivery()(approved());
    const owner = await login('owner@seaview.in');
    const manager = await login('manager@seaview.in');
    const stranger = await login('owner@hill.in');

    const list = (await srv.get('/api/v1/notifications', auth(owner))).body;
    expect(list.data).toMatchObject([{ category: 'kyc.approved', read: false, critical: true }]);
    expect((await srv.get('/api/v1/notifications', auth(manager))).body.data).toEqual([]); // no KYC permission
    expect((await srv.get('/api/v1/notifications', auth(stranger))).body.data).toEqual([]);
    expect((await srv.post(`/api/v1/notifications/${list.data[0].id}/read`, {}, auth(stranger))).status).toBe(404);

    expect((await srv.get('/api/v1/notifications/unread-count', auth(owner))).body).toEqual({ count: 1 });
    expect((await srv.post(`/api/v1/notifications/${list.data[0].id}/read`, {}, auth(owner))).status).toBe(204);
    expect((await srv.get('/api/v1/notifications/unread-count', auth(owner))).body).toEqual({ count: 0 });

    await delivery()(newEvent('kyc.application.rejected', { orgId, applicationId: 'app-1', orgType: 'HOTEL', reasons: [] }, { clock }));
    const newer = (await srv.get(`/api/v1/notifications?after=${list.cursor}`, auth(owner))).body;
    expect(newer.data.map((/** @type {any} */ n) => n.category)).toEqual(['kyc.rejected']); // only what came after
    expect((await srv.post('/api/v1/notifications/read-all', {}, auth(owner))).body).toEqual({ updated: 1 });
    expect((await srv.get('/api/v1/notifications?unread=true', auth(owner))).body.data).toEqual([]);
    expect((await srv.get('/api/v1/notifications')).status).toBe(401);
    void otherOrgId;
  });

  it('preferences: critical categories are locked; switching a category off hides it and stops its email', async () => {
    const manager = await login('manager@seaview.in');
    const prefs = (await srv.get('/api/v1/notification-preferences', auth(manager))).body.data;
    expect(prefs.map((/** @type {any} */ p) => [p.category, p.locked])).toEqual([
      ['listing.published', false],
      ['listing.changes-requested', true],
      ['listing.suspended', true],
      ['listing.revision-decided', false],
      ['team.role-changed', false],
    ]); // a Manager sees listings, not the KYC categories
    expect(prefs.at(-1)).toEqual({
      category: 'team.role-changed',
      label: 'Your role changed',
      critical: false,
      locked: false,
      inApp: true,
      email: true,
    });
    const owner = await login('owner@seaview.in');
    const locked = await srv.put('/api/v1/notification-preferences', { category: 'kyc.approved', inApp: false, email: false }, auth(owner));
    expect([locked.status, locked.body.code]).toEqual([422, 'CATEGORY_LOCKED']);

    expect(
      (await srv.put('/api/v1/notification-preferences', { category: 'team.role-changed', inApp: false, email: false }, auth(manager)))
        .status,
    ).toBe(204);
    await delivery()(
      newEvent('organizations.member.roles-changed', { orgId, userId: managerId, before: [], after: [], changedBy: ownerId }, { clock }),
    );
    expect(await InboxRecord.countDocuments({ recipientId: managerId })).toBe(1); // stored (the choice can change back)
    expect(emails).toEqual([]);
    expect((await srv.get('/api/v1/notifications', auth(manager))).body.data).toEqual([]);

    await srv.put('/api/v1/notification-preferences', { category: 'team.role-changed', inApp: true, email: true }, auth(manager));
    expect((await srv.get('/api/v1/notifications', auth(manager))).body.data).toMatchObject([
      { category: 'team.role-changed', body: 'Your role in Sea View was changed.' },
    ]);
  });
});
