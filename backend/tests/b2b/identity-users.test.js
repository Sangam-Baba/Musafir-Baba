// @ts-check
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import {
  assertPasswordAllowed,
  createUserRepository,
  isLocked,
  lockDurationMs,
  normaliseEmail,
  normalisePhone,
  parseLoginIdentifier,
} from '../../src/b2b/modules/identity/index.js';
import { UserRecord } from '../../src/b2b/modules/identity/models/user.model.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { startMongo } from './helpers/mongo.js';

let now = new Date('2026-11-13T10:00:00Z');
const clock = { now: () => now };
const GOOD = 'correct-horse-battery';

describe('user rules (pure)', () => {
  it('normalises emails and phones', () => {
    expect(normaliseEmail('  Asha.Rao@Example.COM ')).toBe('asha.rao@example.com');
    expect(() => normaliseEmail('not-an-email')).toThrow(expect.objectContaining({ code: 'EMAIL_INVALID' }));
    expect(normalisePhone('98765 43210')).toBe('+919876543210');
    expect(normalisePhone('+44 20 7946 0958')).toBe('+442079460958');
    expect(normalisePhone('0044 20 7946 0958')).toBe('+442079460958');
    expect(() => normalisePhone('12345')).toThrow(expect.objectContaining({ code: 'PHONE_INVALID' }));
    expect(() => normalisePhone('5876543210')).toThrow(expect.objectContaining({ code: 'PHONE_INVALID' })); // not an Indian mobile, no country code
    expect(parseLoginIdentifier('ASHA@example.com')).toEqual({ field: 'email', value: 'asha@example.com' });
    expect(parseLoginIdentifier('9876543210')).toEqual({ field: 'phone', value: '+919876543210' });
  });

  it('password policy', () => {
    expect(() => assertPasswordAllowed('short')).toThrow(expect.objectContaining({ code: 'PASSWORD_TOO_SHORT' }));
    expect(() => assertPasswordAllowed('a'.repeat(73))).toThrow(expect.objectContaining({ code: 'PASSWORD_TOO_LONG' }));
    expect(() => assertPasswordAllowed('é'.repeat(37))).toThrow(expect.objectContaining({ code: 'PASSWORD_TOO_LONG' })); // 74 bytes
    expect(() => assertPasswordAllowed('Password123')).toThrow(expect.objectContaining({ code: 'PASSWORD_TOO_COMMON' }));
    expect(() => assertPasswordAllowed('zzzzzzzzzzzz')).toThrow(expect.objectContaining({ code: 'PASSWORD_TOO_COMMON' }));
    expect(() => assertPasswordAllowed('ashwini-2026-ok', { email: 'ashwini@x.com' })).toThrow(
      expect.objectContaining({ code: 'PASSWORD_CONTAINS_EMAIL' }),
    );
    expect(() => assertPasswordAllowed(GOOD, { email: 'asha@x.com' })).not.toThrow();
  });

  it('lockout steps', () => {
    expect([1, 4, 5, 9, 10, 14, 15, 40].map(lockDurationMs)).toEqual([
      0, 0, 900_000, 900_000, 3_600_000, 3_600_000, 86_400_000, 86_400_000,
    ]);
    expect(isLocked({ count: 5, lockedUntil: new Date('2026-11-13T10:10:00Z') }, now)).toBe(true);
    expect(isLocked({ count: 5, lockedUntil: new Date('2026-11-13T09:59:59Z') }, now)).toBe(false);
    expect(isLocked(null, now)).toBe(false);
  });
});

describe('user repository (id_users)', () => {
  /** @type {Awaited<ReturnType<typeof startMongo>>} */
  let mongo;
  const users = createUserRepository({ bcryptCost: 4, clock });

  beforeAll(async () => {
    mongo = await startMongo();
    await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  });
  afterAll(async () => mongo.stop());
  beforeEach(async () => {
    now = new Date('2026-11-13T10:00:00Z');
    await UserRecord.deleteMany({});
  });

  it('creates users with a bcrypt hash, never returns it, and keeps email/phone unique', async () => {
    const u = await users.create({ email: 'Asha@Example.com', phone: '9876543210', name: ' Asha Rao ', password: GOOD });
    expect(u).toMatchObject({ email: 'asha@example.com', phone: '+919876543210', name: 'Asha Rao', status: 'ACTIVE', hasPassword: true });
    expect(JSON.stringify(u)).not.toContain('$2');
    const raw = await UserRecord.findById(u.id).lean();
    expect(raw?.passwordHash).toMatch(/^\$2[aby]\$04\$/);
    await expect(users.create({ email: 'asha@example.com', name: 'Dup' })).rejects.toMatchObject({ code: 'EMAIL_TAKEN', status: 409 });
    await expect(users.create({ phone: '+919876543210', name: 'Dup' })).rejects.toMatchObject({ code: 'PHONE_TAKEN' });
    await expect(users.create({ name: 'Nobody' })).rejects.toMatchObject({ code: 'EMAIL_OR_PHONE_REQUIRED' });
    // several users without a phone are fine (partial unique index)
    await users.create({ email: 'b@example.com', name: 'B' });
    await users.create({ email: 'c@example.com', name: 'C' });
  });

  it('checks a password by email or phone; unknown account and wrong password look the same', async () => {
    await users.create({ email: 'asha@example.com', phone: '9876543210', name: 'Asha', password: GOOD });
    expect(await users.checkPassword('ASHA@example.com', GOOD)).toMatchObject({ ok: true, user: { email: 'asha@example.com' } });
    expect(await users.checkPassword('98765 43210', GOOD)).toMatchObject({ ok: true });
    expect(await users.checkPassword('asha@example.com', 'wrong-password-1')).toEqual({ ok: false, reason: 'INVALID' });
    expect(await users.checkPassword('nobody@example.com', GOOD)).toEqual({ ok: false, reason: 'INVALID' });
  });

  it('locks after 5 failures for 15 minutes; success resets the counter', async () => {
    await users.create({ email: 'asha@example.com', name: 'Asha', password: GOOD });
    for (let i = 0; i < 4; i += 1) expect((await users.checkPassword('asha@example.com', 'wrong-password-1')).ok).toBe(false);
    const fifth = await users.checkPassword('asha@example.com', 'wrong-password-1');
    expect(fifth).toMatchObject({ ok: false, reason: 'LOCKED' });
    expect(await users.checkPassword('asha@example.com', GOOD)).toMatchObject({ ok: false, reason: 'LOCKED' }); // even the right password
    now = new Date('2026-11-13T10:15:01Z');
    expect(await users.checkPassword('asha@example.com', GOOD)).toMatchObject({ ok: true });
    expect((await UserRecord.findOne({ email: 'asha@example.com' }).lean())?.failedLogins).toEqual({ count: 0, lockedUntil: null });
  });

  it('counts parallel failures exactly (atomic)', async () => {
    await users.create({ email: 'asha@example.com', name: 'Asha', password: GOOD });
    await Promise.all(Array.from({ length: 4 }, () => users.checkPassword('asha@example.com', 'wrong-password-1')));
    expect((await UserRecord.findOne({ email: 'asha@example.com' }).lean())?.failedLogins?.count).toBe(4);
  });

  it('a disabled user is refused only after the right password (no account probing)', async () => {
    const u = await users.create({ email: 'asha@example.com', name: 'Asha', password: GOOD });
    await UserRecord.updateOne({ _id: u.id }, { $set: { status: 'DISABLED' } });
    expect(await users.checkPassword('asha@example.com', 'wrong-password-1')).toEqual({ ok: false, reason: 'INVALID' });
    expect(await users.checkPassword('asha@example.com', GOOD)).toEqual({ ok: false, reason: 'DISABLED' });
  });

  it('setPassword applies the policy, rehashes and clears a lock', async () => {
    const u = await users.create({ email: 'asha@example.com', name: 'Asha', password: GOOD });
    await expect(users.setPassword(u.id, 'short')).rejects.toMatchObject({ code: 'PASSWORD_TOO_SHORT' });
    await UserRecord.updateOne({ _id: u.id }, { $set: { 'failedLogins.count': 7, 'failedLogins.lockedUntil': new Date('2026-11-14') } });
    await users.setPassword(u.id, 'another-good-pass');
    expect(await users.checkPassword('asha@example.com', 'another-good-pass')).toMatchObject({ ok: true });
    expect(await users.checkPassword('asha@example.com', GOOD)).toMatchObject({ ok: false });
    await expect(users.setPassword('64b000000000000000000000', GOOD)).rejects.toMatchObject({ code: 'USER_NOT_FOUND', status: 404 });
  });

  it('login lookups are injection-safe (identifier is parsed, never passed raw)', async () => {
    await users.create({ email: 'asha@example.com', name: 'Asha', password: GOOD });
    await expect(users.checkPassword(/** @type {any} */ ({ $gt: '' }), GOOD)).rejects.toThrow();
    expect(await users.findById('{"$ne":null}')).toBeNull();
  });
});
