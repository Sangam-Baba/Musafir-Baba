// @ts-check
import { describe, expect, it } from 'vitest';

import { b2bMongoose } from '../../src/b2b/core/db/connection.js';
import { assertRegisteredModelsAllowed, defineModel } from '../../src/b2b/core/db/model.js';
import { assertAllowedCollection, isAllowedCollection } from '../../src/b2b/core/db/prefixes.js';

describe('allowed collection names', () => {
  it.each(['htl_properties', 'inv_inventory_days', 'core_jobs', 'rt_signals', 'wal_accounts', 'id_users'])('allows %s', (name) =>
    expect(isAllowedCollection(name)).toBe(true),
  );

  it.each([
    'users',
    'staffs',
    'sessions',
    'bookings',
    'auditlogs',
    'invoices',
    'subscriptions',
    'notifications', // existing
    'htl_',
    'core',
    'HTL_properties',
    'htl-properties',
    'orgs_x',
    '',
    'system.indexes',
  ])('refuses %s', (name) => expect(isAllowedCollection(name)).toBe(false));

  it('explains the rule in the error', () => {
    expect(() => assertAllowedCollection('users', 'test')).toThrow(/not allowed.*D1/);
  });
});

describe('defineModel', () => {
  it('registers on the B2B instance with safe settings', () => {
    const Model = defineModel('ProbeHotel', new b2bMongoose.Schema({ name: String }), 'htl_probe');
    expect(Model.db).toBe(b2bMongoose.connection);
    expect(Model.collection.collectionName).toBe('htl_probe');
    expect(Model.schema.get('strict')).toBe('throw');
    expect(Model.schema.get('autoIndex')).toBe(false);
  });

  it('refuses an existing collection name', () => {
    expect(() => defineModel('BadUser', new b2bMongoose.Schema({ name: String }), 'users')).toThrow(/not allowed/);
  });
});

describe('start-up check', () => {
  it('fails if a model was registered directly on an existing collection', () => {
    b2bMongoose.model('SneakyBooking', new b2bMongoose.Schema({ x: String }), 'bookings');
    expect(() => assertRegisteredModelsAllowed()).toThrow(/SneakyBooking.*bookings.*not allowed/);
    b2bMongoose.deleteModel('SneakyBooking');
    expect(() => assertRegisteredModelsAllowed()).not.toThrow();
  });
});
