// @ts-check
/** On approval of a B2B client (S10-T05): Standard category (repeat-safe, never overrides) and the client wording of the welcome. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { newEvent } from '../../src/b2b/core/db/events.js';
import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createUserRepository } from '../../src/b2b/modules/identity/index.js';
import { categoryKeyFor, createDelivery, InboxRecord } from '../../src/b2b/modules/notifications/index.js';
import {
  createClientCategoriesService,
  createOrganizationsService,
  OrganizationRecord,
  seedClientCategories,
} from '../../src/b2b/modules/organizations/index.js';
import { startMongo } from './helpers/mongo.js';

const clock = { now: () => new Date('2026-11-19T10:00:00Z') };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
const users = createUserRepository({ bcryptCost: 4, clock });
const orgs = createOrganizationsService({ clock });
const categories = createClientCategoriesService({ clock });

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  await seedClientCategories();
});
afterAll(async () => mongo.stop());

/** @param {'CLIENT' | 'HOTEL'} type @param {string} email */
async function org(type, email) {
  const owner = await users.create({ email, name: 'Owner', password: 'correct-horse-battery' });
  const o = await orgs.createOrganization({
    type,
    legalName: type === 'CLIENT' ? 'Wanderlust Trips' : 'Sea View Hotels',
    ownerUserId: owner.id,
    createdBy: 's',
  });
  return { orgId: o.id, ownerId: owner.id };
}
const categoryOf = async (/** @type {string} */ orgId) =>
  /** @type {any} */ (await OrganizationRecord.findById(orgId).setOptions(SYSTEM).lean()).clientCategory;

describe('category on approval', () => {
  it('a verified client starts as Standard; repeat-safe; an admin-chosen category is never overridden; hotels untouched', async () => {
    const c = await org('CLIENT', 'owner@trips.in');
    expect((await orgs.activate({ orgId: c.orgId, legalName: null, activatedBy: 'kyc:x' })).activated).toBe(true);
    expect(await categories.assignDefault(c.orgId)).toEqual({ changed: true });
    expect(await categoryOf(c.orgId)).toBe('STANDARD');
    expect(await categories.assignDefault(c.orgId)).toEqual({ changed: false });
    const gold = await org('CLIENT', 'owner@gold.in');
    await categories.assign('staff:1', gold.orgId, 'GOLD');
    expect(await categories.assignDefault(gold.orgId)).toEqual({ changed: false });
    expect(await categoryOf(gold.orgId)).toBe('GOLD');
    const hotel = await org('HOTEL', 'owner@seaview.in');
    expect(await categories.assignDefault(hotel.orgId)).toEqual({ changed: false });
    expect(await categoryOf(hotel.orgId)).toBeNull();
  });
});

describe('the welcome', () => {
  it('clients get their own wording and link; hotels exactly as before', async () => {
    expect(categoryKeyFor('kyc.application.approved', { orgType: 'CLIENT' })).toBe('kyc.approved-client');
    expect(categoryKeyFor('kyc.application.approved', { orgType: 'HOTEL' })).toBe('kyc.approved');
    expect(categoryKeyFor('kyc.application.rejected', { orgType: 'CLIENT' })).toBe('kyc.rejected');

    /** @type {{ to: string, subject: string, text: string }[]} */
    const emails = [];
    const deliver = createDelivery({
      clock,
      publicUrl: 'https://musafirbaba.com',
      orgName: async (id) => (await orgs.basicInfo(id))?.displayName ?? null,
      ownerContacts: async (id) => (await users.describe(await orgs.ownerUserIds(id))).map((u) => ({ userId: u.id, email: u.email })),
      userContact: async () => null,
      queueEmail: async (m) => {
        emails.push(m);
      },
      publish: async () => {},
    });
    const c = await org('CLIENT', 'welcome@trips.in');
    const h = await org('HOTEL', 'welcome@seaview.in');
    for (const [o, type] of /** @type {const} */ ([
      [c, 'CLIENT'],
      [h, 'HOTEL'],
    ]))
      await deliver(newEvent('kyc.application.approved', { orgId: o.orgId, applicationId: `app-${type}`, orgType: type }, { clock }));
    expect(emails.map((e) => e.subject)).toEqual([
      'Your company is verified — MusafirBaba Business',
      'Your business is verified — MusafirBaba Business',
    ]);
    const rows = await InboxRecord.find({ orgId: { $in: [c.orgId, h.orgId] } })
      .setOptions(SYSTEM)
      .lean();
    const byOrg = new Map(rows.map((r) => [r.orgId, r]));
    expect(byOrg.get(c.orgId)).toMatchObject({ category: 'kyc.approved-client', link: '/business' });
    expect(byOrg.get(c.orgId)?.body).toContain('search hotels with your B2B prices');
    expect(byOrg.get(h.orgId)).toMatchObject({ category: 'kyc.approved', link: '/business/verification' });
    expect(byOrg.get(h.orgId)?.body).toContain('start listing your property');
  });
});
