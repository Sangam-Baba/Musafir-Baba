// @ts-check
/**
 * Bus operators as a company type (S18-T02): reference `MBBO-…`, the owner gets `bus.owner`; operator roles resolve
 * only to permissions meant for operators (organisation, team, KYC — never hotel catalogue, client orders, wallet or
 * platform ones); hotels and clients resolve exactly as before; operator data is tenant-isolated like everyone else's.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { resolveSystemRole, systemRole, systemRolesFor } from '../../src/b2b/modules/access/index.js';
import { createOrganizationsService, MemberRecord, OrganizationRecord } from '../../src/b2b/modules/organizations/index.js';
import { PERMISSION_CATALOGUE } from '../../src/b2b/permission-catalogue.js';
import { startMongo } from './helpers/mongo.js';

const clock = { now: () => new Date('2026-11-25T06:30:00Z') };
const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
});
afterAll(async () => mongo.stop());

describe('BUS_OPERATOR', () => {
  it('a company with an MBBO reference and its owner as bus.owner; isolated like other companies', async () => {
    const orgs = createOrganizationsService({ clock });
    const org = await orgs.createOrganization({
      type: 'BUS_OPERATOR',
      legalName: 'Shree Travels Pvt Ltd',
      ownerUserId: '65f0000000000000000b1801',
      createdBy: 's',
    });
    const doc = /** @type {any} */ (await OrganizationRecord.findById(org.id).setOptions(S).lean());
    expect(doc).toMatchObject({ type: 'BUS_OPERATOR', status: 'ONBOARDING' });
    expect(doc.reference).toMatch(/^MBBO-[A-Z0-9]{6}$/);
    expect(await MemberRecord.findOne({ orgId: org.id }).setOptions(S).lean()).toMatchObject({ roles: ['bus.owner'] });
    await expect(MemberRecord.find({}).lean()).rejects.toThrow(/no ownership filter/);
  });

  it('operator roles get operator permissions only; hotel and client roles unchanged', () => {
    expect(systemRolesFor('BUS_OPERATOR').map((r) => r.key)).toEqual(['bus.owner', 'bus.manager', 'bus.counterStaff']);
    const owner = resolveSystemRole(/** @type {any} */ (systemRole('bus.owner')), PERMISSION_CATALOGUE);
    expect(owner).toEqual(
      expect.arrayContaining(['organizations.org.read', 'organizations.member.invite', 'kyc.application.read', 'access.role.manage']),
    );
    for (const p of owner)
      expect(p).not.toMatch(/^(hotel-|orders\.|wallet\.|platform\.|api-access\.|webhooks\.|subscriptions\.|metering\.)/);
    const staff = resolveSystemRole(/** @type {any} */ (systemRole('bus.counterStaff')), PERMISSION_CATALOGUE);
    expect(staff).toEqual(['organizations.org.read']); // seat permissions arrive with the bus modules (B2+)
    const hotelOwner = resolveSystemRole(/** @type {any} */ (systemRole('hotel.owner')), PERMISSION_CATALOGUE);
    expect(hotelOwner).toEqual(expect.arrayContaining(['hotel-catalog.property.read', 'wallet.statement.read']));
    expect(hotelOwner.some((p) => p.startsWith('bus-'))).toBe(false);
  });
});
