// @ts-check
/**
 * Stage 01 mandatory test: tenant isolation for EVERY new collection (plan Stage 01 §9).
 * Each owned collection refuses reads and writes that are not scoped to an owner, and a scoped query
 * only ever sees that owner's documents. Platform-wide collections are listed explicitly, so a new
 * model has to be classified here on purpose.
 * The other mandatory tests live in: access-system-roles (authorization matrix), route-permissions
 * (permission coverage), identity-sessions (token rotation), identity-otp (OTP caps), view-as (read-only).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { b2bMongoose } from '../../src/b2b/core/db/connection.js';
import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { PermissionRecord } from '../../src/b2b/modules/access/models/permission.model.js';
import { RoleRecord, StaffRoleRecord } from '../../src/b2b/modules/access/index.js';
import { AuditEventRecord } from '../../src/b2b/modules/audit/index.js';
import { SessionRecord, UserRecord, ViewAsRecord } from '../../src/b2b/modules/identity/index.js';
import { MfaRecord } from '../../src/b2b/modules/identity/models/mfa.model.js';
import { OtpRecord } from '../../src/b2b/modules/identity/models/otp.model.js';
import { InvitationRecord, MemberRecord, OrganizationRecord } from '../../src/b2b/modules/organizations/index.js';
import { BranchRecord } from '../../src/b2b/modules/organizations/models/branch.model.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { startMongo } from './helpers/mongo.js';

const clock = { now: () => new Date('2026-11-15T10:00:00Z') };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test seed' };
const A = '64b0000000000000000000aa';
const B = '64b0000000000000000000bb';
const later = new Date('2026-12-01T00:00:00Z');

/**
 * Every Stage 01 collection owned by an org or a user: the model, its owner field, and a valid document for an owner.
 * @type {[string, import('mongoose').Model<any>, string, (owner: string) => Record<string, unknown>][]}
 */
const OWNED = [
  [
    'id_sessions',
    SessionRecord,
    'userId',
    (o) => ({ userId: o, methods: ['password'], generation: 1, refreshHash: `h-${o}`, expiresAt: later, lastUsedAt: clock.now() }),
  ],
  ['id_otp_codes', OtpRecord, 'userId', (o) => ({ userId: o, purpose: 'login', codeHash: `c-${o}`, expiresAt: later })],
  ['id_mfa', MfaRecord, 'userId', (o) => ({ userId: o, status: 'PENDING', secretSealed: 'sealed' })],
  [
    'id_view_as',
    ViewAsRecord,
    'orgId',
    (o) => ({ orgId: o, staffId: 's', legacySessionId: 'x', reason: 'support request', mode: 'READ', expiresAt: later }),
  ],
  ['org_members', MemberRecord, 'orgId', (o) => ({ orgId: o, userId: `u-${o}`, joinedAt: clock.now() })],
  ['org_branches', BranchRecord, 'orgId', (o) => ({ orgId: o, name: `Branch ${o}` })],
  [
    'org_invitations',
    InvitationRecord,
    'orgId',
    (o) => ({ orgId: o, email: `x@${o}.in`, roles: ['client.viewer'], secretHash: 'h', expiresAt: later, invitedBy: 'u' }),
  ],
  [
    'acl_roles',
    RoleRecord,
    'orgId',
    (o) => ({
      orgId: o,
      orgType: 'CLIENT',
      name: `Role ${o}`,
      nameKey: `role ${o}`,
      permissions: ['organizations.org.read'],
      createdBy: 'u',
    }),
  ],
  [
    'aud_events',
    AuditEventRecord,
    'orgId',
    (o) => ({ _id: `evt-${o}`, action: 'organizations.org.created', orgId: o, occurredAt: clock.now(), recordedAt: clock.now() }),
  ],
];

/** Platform-wide on purpose (no owner): business users span orgs; catalogue and staff roles are global. */
const PLATFORM_WIDE = ['id_users', 'acl_permissions', 'acl_staff_roles', 'org_client_categories']; // categories: Stage 10, MusafirBaba's own list

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  for (const [, model, , doc] of OWNED) await model.insertMany([doc(A), doc(B)], { rawResult: false });
});
afterAll(async () => mongo.stop());

describe('tenant isolation — every Stage 01 owned collection', () => {
  it.each(OWNED)('%s: unscoped reads and writes are refused', async (_name, model) => {
    await expect(model.find({}).lean()).rejects.toThrow(/no ownership filter/);
    await expect(model.countDocuments({})).rejects.toThrow(/no ownership filter/);
    await expect(model.updateMany({}, { $set: { updatedAt: new Date() } })).rejects.toThrow(/no ownership filter/);
    await expect(model.deleteMany({})).rejects.toThrow(/no ownership filter/);
  });

  it.each(OWNED)("%s: a scoped query sees only that owner's documents", async (_name, model, field) => {
    const docs = await model.find({ [field]: A }).lean();
    expect(docs.length).toBeGreaterThan(0);
    for (const d of docs) expect(String(/** @type {any} */ (d)[field])).toBe(A);
  });

  it('organisations are scoped by their own id', async () => {
    await OrganizationRecord.insertMany([
      { _id: A, type: 'CLIENT', reference: 'MBC-AAAAA1', legalName: 'A', displayName: 'A', status: 'ACTIVE' },
      { _id: B, type: 'HOTEL', reference: 'MBHO-BBBBB2', legalName: 'B', displayName: 'B', status: 'ACTIVE' },
    ]);
    await expect(OrganizationRecord.find({}).lean()).rejects.toThrow(/no ownership filter/);
    expect((await OrganizationRecord.find({ _id: A }).lean()).map((o) => String(o._id))).toEqual([A]);
    expect(await OrganizationRecord.countDocuments({}).setOptions(SYSTEM)).toBe(2); // admin tools: explicit, logged system scope
  });

  it('every B2B collection is classified: owned (above) or platform-wide on purpose', () => {
    const classified = new Set([...OWNED.map(([name]) => name), 'org_organizations', ...PLATFORM_WIDE]);
    const stage01 = Object.values(b2bMongoose.models)
      .map((m) => m.collection.collectionName)
      .filter((n) => /^(id|org|acl|aud)_/.test(n));
    expect(stage01.filter((n) => !classified.has(n))).toEqual([]);
    for (const model of [UserRecord, PermissionRecord, StaffRoleRecord]) expect(PLATFORM_WIDE).toContain(model.collection.collectionName);
  });
});
