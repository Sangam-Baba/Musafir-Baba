// @ts-check
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { definePermissions, mergeCatalogues } from '../../src/b2b/core/permissions.js';
import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import {
  allowedPermissions,
  matchesPattern,
  resolveSystemRole,
  syncPermissionCatalogue,
  SYSTEM_ROLES,
  systemRole,
  systemRolesFor,
} from '../../src/b2b/modules/access/index.js';
import { PermissionRecord } from '../../src/b2b/modules/access/models/permission.model.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { PERMISSION_CATALOGUE } from '../../src/b2b/permission-catalogue.js';
import { startMongo } from './helpers/mongo.js';

const clock = { now: () => new Date('2026-11-13T10:00:00Z') };

/** @param {string} key */
const grants = (key) => {
  const role = systemRole(key);
  if (!role) throw new Error(`no role ${key}`);
  return resolveSystemRole(role, PERMISSION_CATALOGUE);
};

// A stand-in for permissions later stages will add, to prove the roles pick them up by pattern.
const FUTURE = definePermissions('Bookings', {
  bookingRead: { code: 'hotel-booking.booking.read', description: 'See bookings', orgTypes: ['PLATFORM', 'CLIENT', 'HOTEL'] },
  bookingCreate: { code: 'hotel-booking.booking.create', description: 'Make bookings', orgTypes: ['CLIENT'] },
  bookingAck: { code: 'hotel-booking.booking.acknowledge', description: 'Acknowledge new bookings', orgTypes: ['HOTEL'] },
  bookingCancel: { code: 'hotel-booking.booking.cancel', description: 'Cancel bookings', orgTypes: ['CLIENT', 'HOTEL', 'PLATFORM'] },
  walletTopUp: { code: 'wallet.topup.create', description: 'Top up the wallet', orgTypes: ['CLIENT'] },
  bankEdit: { code: 'hotel-catalog.bank.update', description: 'Change payout bank details', orgTypes: ['HOTEL'], sensitive: true },
}).catalogue;
const WITH_FUTURE = mergeCatalogues([PERMISSION_CATALOGUE, FUTURE.filter((d) => !PERMISSION_CATALOGUE.some((p) => p.code === d.code))]);
/** @param {string} key */
const futureGrants = (key) => resolveSystemRole(/** @type {any} */ (systemRole(key)), WITH_FUTURE);

describe('permission patterns', () => {
  it.each([
    ['organizations.member.invite', 'organizations.**', true],
    ['organizations.member.invite', 'organizations.*', false],
    ['organizations.member.invite', 'organizations.*.invite', true],
    ['organizations.member.invite', '**', true],
    ['organizations.member.read', '**.read', true],
    ['hotel-booking.booking.read', 'hotel-booking.**.read', true],
    ['hotel-booking.booking.read', 'hotel-catalog.**', false],
    ['admin.viewAs.read', '**.read', true],
    ['admin.viewAs.write', '**.read', false],
  ])('%s ~ %s → %s', (code, pattern, expected) => {
    expect(matchesPattern(code, pattern)).toBe(expected);
  });
});

describe('system roles (plan §4) — authorization matrix', () => {
  it('there are 5 platform, 5 client and 3 hotel roles with unique keys', () => {
    expect(systemRolesFor('PLATFORM')).toHaveLength(5);
    expect(systemRolesFor('CLIENT')).toHaveLength(5);
    expect(systemRolesFor('HOTEL')).toHaveLength(3);
    expect(new Set(SYSTEM_ROLES.map((r) => r.key)).size).toBe(SYSTEM_ROLES.length);
  });

  it('no role ever gets a permission its org type may not hold', () => {
    for (const role of SYSTEM_ROLES) {
      const allowed = allowedPermissions(role.orgType, WITH_FUTURE);
      for (const code of resolveSystemRole(role, WITH_FUTURE)) expect(allowed).toContain(code);
    }
  });

  it('client and hotel roles never get platform or admin permissions', () => {
    for (const role of SYSTEM_ROLES.filter((r) => r.orgType !== 'PLATFORM')) {
      for (const code of resolveSystemRole(role, WITH_FUTURE)) expect(code).not.toMatch(/^(platform|admin)\./);
    }
  });

  it('owners get everything their org type may hold (incl. sensitive)', () => {
    expect(futureGrants('client.owner')).toEqual(allowedPermissions('CLIENT', WITH_FUTURE));
    expect(futureGrants('hotel.owner')).toEqual(allowedPermissions('HOTEL', WITH_FUTURE));
    expect(futureGrants('hotel.owner')).toContain('hotel-catalog.bank.update');
    expect(futureGrants('platform.superAdmin')).toEqual(allowedPermissions('PLATFORM', WITH_FUTURE));
  });

  /** @type {[string, string, boolean][]} */
  const matrix = [
    ['client.admin', 'organizations.member.invite', true],
    ['client.admin', 'access.role.manage', true],
    ['client.admin', 'organizations.branch.manage', true],
    ['client.bookingAgent', 'organizations.member.invite', false],
    ['client.bookingAgent', 'access.role.manage', false],
    ['client.bookingAgent', 'organizations.branch.read', true],
    ['client.accountant', 'organizations.member.invite', false],
    ['client.viewer', 'organizations.member.read', false],
    ['client.viewer', 'organizations.org.read', true],
    ['hotel.manager', 'organizations.member.read', true],
    ['hotel.manager', 'organizations.member.invite', false],
    ['hotel.manager', 'access.role.manage', false],
    ['hotel.frontDesk', 'organizations.member.read', false],
    ['hotel.frontDesk', 'organizations.org.read', true],
    ['platform.operations', 'platform.org.manage', true],
    ['platform.operations', 'admin.viewAs.read', true],
    ['platform.operations', 'admin.viewAs.write', false],
    ['platform.finance', 'platform.org.manage', false],
    ['platform.support', 'platform.org.read', true],
    ['platform.support', 'admin.viewAs.read', true],
    ['platform.support', 'admin.viewAs.write', false],
    ['platform.support', 'platform.user.manage', false],
    ['platform.operations', 'platform.kyc.review', true],
    ['platform.operations', 'platform.kyc.approve', true],
    ['platform.support', 'platform.kyc.read', true],
    ['platform.support', 'platform.kyc.review', false],
    ['platform.finance', 'platform.kyc.review', false],
    ['client.owner', 'kyc.application.submit', true],
    ['client.admin', 'kyc.application.submit', false], // sensitive (bank details): Owner only by default
    ['hotel.owner', 'kyc.application.submit', true],
    ['hotel.manager', 'kyc.application.submit', false],
    ['hotel.manager', 'kyc.application.read', false], // KYC documents (PAN, cheque) stay with the Owner (plan §4: Manager = listings, rates, bookings)
    // Stage 03: hotel listings
    ['hotel.owner', 'hotel-catalog.property.manage', true],
    ['hotel.manager', 'hotel-catalog.property.manage', true], // limited to assigned properties by scope
    ['hotel.frontDesk', 'hotel-catalog.property.read', false],
    ['client.owner', 'hotel-catalog.property.read', false], // clients see listings only through the public content
    ['platform.hotels', 'hotel-catalog.listing.review', true],
    ['platform.hotels', 'hotel-catalog.master.manage', true],
    ['platform.operations', 'hotel-catalog.listing.read', true],
    ['platform.operations', 'hotel-catalog.listing.review', false],
    ['platform.support', 'hotel-catalog.listing.read', true],
    ['platform.support', 'hotel-catalog.listing.review', false],
    ['platform.superAdmin', 'hotel-catalog.listing.review', true],
    // Stage 04: rooms, prices and rules per night
    ['hotel.owner', 'hotel-inventory.calendar.manage', true],
    ['hotel.manager', 'hotel-inventory.calendar.manage', true], // limited to assigned properties by scope
    ['hotel.frontDesk', 'hotel-inventory.calendar.read', false],
    ['client.owner', 'hotel-inventory.calendar.read', false],
    ['platform.hotels', 'hotel-inventory.admin.read', true],
    ['platform.hotels', 'hotel-inventory.admin.override', false],
    ['platform.support', 'hotel-inventory.admin.read', true],
    ['platform.support', 'hotel-inventory.admin.override', false],
    ['platform.superAdmin', 'hotel-inventory.admin.override', true],
    // Stage 05: pricing & GST — Hotels team proposes, a different person with the approve permission approves
    ['platform.hotels', 'pricing.rules.propose', true],
    ['platform.hotels', 'pricing.simulator.use', true],
    ['platform.hotels', 'pricing.rules.approve', false],
    ['platform.hotels', 'pricing.tax.manage', false],
    ['platform.superAdmin', 'pricing.rules.approve', true],
    ['platform.superAdmin', 'pricing.tax.manage', true],
    ['platform.support', 'pricing.rules.read', true],
    ['platform.support', 'pricing.rules.propose', false],
    ['platform.finance', 'pricing.rules.read', false],
    ['client.owner', 'pricing.markup.manage', true],
    ['client.bookingAgent', 'pricing.markup.read', true],
    ['client.bookingAgent', 'pricing.markup.manage', false],
    ['hotel.owner', 'pricing.rules.read', false],
    // Stage 06: hotel search (website is public; B2B clients search with B2B prices)
    ['client.owner', 'hotel-search.search.use', true],
    ['client.admin', 'hotel-search.search.use', true],
    ['client.bookingAgent', 'hotel-search.search.use', true],
    ['client.accountant', 'hotel-search.search.use', false],
    ['client.viewer', 'hotel-search.search.use', false],
    ['hotel.owner', 'hotel-search.search.use', false],
    // D37: booking requests
    ['client.bookingAgent', 'hotel-booking.request.create', true],
    ['client.viewer', 'hotel-booking.request.read', true],
    ['client.viewer', 'hotel-booking.request.create', false],
    ['client.accountant', 'hotel-booking.request.create', false],
    ['platform.operations', 'hotel-booking.admin.handle', true],
    ['platform.support', 'hotel-booking.admin.read', true],
    ['platform.support', 'hotel-booking.admin.handle', false],
    ['hotel.owner', 'hotel-booking.request.create', false],
    // Stage 07: ledger and payments — Finance reads and works them; approvals, manual refunds and test payments are sensitive
    ['platform.finance', 'wallet.ledger.read', true],
    ['platform.finance', 'wallet.adjustment.propose', true],
    ['platform.finance', 'wallet.adjustment.approve', false],
    ['platform.finance', 'payments.payment.read', true],
    ['platform.finance', 'payments.recon.manage', true],
    ['platform.finance', 'payments.refund.create', false],
    ['platform.superAdmin', 'wallet.adjustment.approve', true],
    ['platform.superAdmin', 'payments.refund.create', true],
    ['platform.superAdmin', 'payments.test.run', true],
    ['platform.support', 'wallet.ledger.read', true],
    ['platform.support', 'payments.payment.read', true],
    ['platform.support', 'payments.recon.manage', false],
    ['platform.hotels', 'payments.payment.read', false],
  ];
  it.each(matrix)('%s → %s = %s', (role, code, expected) => {
    expect(grants(role).includes(code)).toBe(expected);
  });

  it('support can only read', () => {
    for (const code of futureGrants('platform.support')) expect(code).toMatch(/\.read$/);
  });

  it('permissions added by later modules reach the right roles by pattern', () => {
    expect(futureGrants('client.bookingAgent')).toEqual(
      expect.arrayContaining(['hotel-booking.booking.create', 'hotel-booking.booking.cancel']),
    );
    expect(futureGrants('client.bookingAgent')).not.toContain('wallet.topup.create');
    expect(futureGrants('client.accountant')).toContain('wallet.topup.create');
    expect(futureGrants('client.accountant')).not.toContain('hotel-booking.booking.create');
    // + booking requests (D37, real today): viewers follow them too
    expect(futureGrants('client.viewer')).toEqual([
      'hotel-booking.booking.read',
      'hotel-booking.request.read',
      'orders.export.read', // Stage 12B: bookings as CSV
      'orders.order.read', // Stage 12B: the company's orders
      'organizations.org.read',
    ]);
    expect(futureGrants('client.bookingAgent')).toEqual(expect.arrayContaining(['orders.order.create', 'orders.order.read']));
    expect(futureGrants('client.viewer')).not.toContain('orders.order.create');
    expect(futureGrants('hotel.frontDesk')).toEqual([
      'hotel-booking.booking.acknowledge',
      'hotel-booking.booking.markNoShow', // Stage 09: listed by exact code in the role
      'hotel-booking.booking.read',
      'organizations.org.read',
    ]);
    expect(futureGrants('hotel.manager')).toContain('hotel-booking.booking.acknowledge');
  });

  it('wildcards never grant sensitive permissions — only owners (**) or an exact code do', () => {
    expect(futureGrants('hotel.manager')).not.toContain('hotel-catalog.bank.update'); // bank details: Owner only (plan §4)
    expect(futureGrants('hotel.owner')).toContain('hotel-catalog.bank.update');
    expect(futureGrants('client.admin')).not.toContain('platform.org.manage');
    expect(grants('platform.operations')).toContain('platform.org.manage'); // listed by exact code
    expect(grants('platform.hotels')).not.toContain('platform.org.manage');
  });

  it('only Super Admin has a holder limit (3)', () => {
    expect(SYSTEM_ROLES.filter((r) => r.maxHolders !== undefined).map((r) => [r.key, r.maxHolders])).toEqual([['platform.superAdmin', 3]]);
  });
});

describe('acl_permissions sync', () => {
  /** @type {Awaited<ReturnType<typeof startMongo>>} */
  let mongo;
  beforeAll(async () => {
    mongo = await startMongo();
    await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  });
  afterAll(async () => mongo.stop());

  it('writes the catalogue, is repeat-safe, and retires codes that disappear', async () => {
    const first = await syncPermissionCatalogue(PERMISSION_CATALOGUE, { clock });
    expect(first.upserted).toBe(PERMISSION_CATALOGUE.length);
    await Promise.all([syncPermissionCatalogue(PERMISSION_CATALOGUE, { clock }), syncPermissionCatalogue(PERMISSION_CATALOGUE, { clock })]);
    expect(await PermissionRecord.countDocuments({})).toBe(PERMISSION_CATALOGUE.length);
    expect(await PermissionRecord.findById('platform.org.manage').lean()).toMatchObject({
      group: 'Team',
      sensitive: true,
      orgTypes: ['PLATFORM'],
      retired: false,
    });

    const smaller = PERMISSION_CATALOGUE.filter((p) => p.code !== 'audit.event.read');
    expect((await syncPermissionCatalogue(smaller, { clock })).retired).toBe(1);
    expect((await PermissionRecord.findById('audit.event.read').lean())?.retired).toBe(true);
    await syncPermissionCatalogue(PERMISSION_CATALOGUE, { clock });
    expect((await PermissionRecord.findById('audit.event.read').lean())?.retired).toBe(false);
  });
});
