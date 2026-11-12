// @ts-check
import { ObjectId } from 'mongodb';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import * as legacyRead from '../../src/b2b/legacy-read/index.js';
import { startMongo } from './helpers/mongo.js';

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
const userId = new ObjectId();
const staffId = new ObjectId();

beforeAll(async () => {
  mongo = await startMongo();
  await mongo.db.collection('users').insertOne({
    _id: userId, name: 'Asha', email: 'asha@example.com', phone: '9999999999',
    password: 'hashed-secret', role: 'user', isVerified: true, isActive: true,
  });
  await mongo.db.collection('staffs').insertOne({
    _id: staffId, name: 'Ravi', email: 'ravi@example.com', password: 'hashed', role: 'admin', permissions: ['blogs'],
  });
  await mongo.db.collection('sessions').insertOne({ sessionId: 's-1', userId, status: 'logout' });
});
afterAll(async () => mongo.stop());

describe('legacy-read (read-only access to existing data)', () => {
  it('exposes read functions only — nothing that can write', () => {
    const names = Object.keys(legacyRead).filter((k) => typeof (/** @type {any} */ (legacyRead)[k]) === 'function');
    expect(names.sort()).toEqual(['findCustomerById', 'findSessionById', 'findStaffById']);
    expect(legacyRead.LEGACY_READ_COLLECTIONS).toEqual(['users', 'staffs', 'sessions']);
  });

  it('reads a customer without the password', async () => {
    const customer = await legacyRead.findCustomerById(userId.toHexString());
    expect(customer).toEqual({
      id: userId.toHexString(), name: 'Asha', email: 'asha@example.com', phone: '9999999999',
      role: 'user', isActive: true, isVerified: true,
    });
    expect(JSON.stringify(customer)).not.toContain('hashed-secret');
  });

  it('reads staff with permissions, and a session', async () => {
    expect(await legacyRead.findStaffById(staffId.toHexString())).toMatchObject({ role: 'admin', permissions: ['blogs'] });
    expect(await legacyRead.findSessionById('s-1')).toEqual({
      sessionId: 's-1', userId: userId.toHexString(), status: 'logout', revoked: false,
    });
  });

  it('returns null for malformed or unknown ids (no query injection)', async () => {
    expect(await legacyRead.findCustomerById('not-an-id')).toBeNull();
    expect(await legacyRead.findCustomerById(new ObjectId().toHexString())).toBeNull();
    expect(await legacyRead.findSessionById(/** @type {any} */ ({ $ne: null }))).toBeNull();
  });

  it('leaves the existing documents exactly as they were', async () => {
    const after = await mongo.db.collection('users').findOne({ _id: userId });
    expect(after?.password).toBe('hashed-secret');
    expect(await mongo.db.collection('users').countDocuments()).toBe(1);
  });
});
