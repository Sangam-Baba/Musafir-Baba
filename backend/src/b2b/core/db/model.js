// @ts-check
/**
 * The only way B2B code defines a Mongoose model.
 * - Registers on the B2B Mongoose instance (never the default one — see connection.js).
 * - Requires an explicit collection name with an allowed prefix (D1).
 * - Applies safe schema defaults: strict writes, strict queries, no auto-indexing.
 */
import { b2bMongoose } from './connection.js';
import { logger } from '../logger.js';
import { assertAllowedCollection } from './prefixes.js';
import { tenantPlugin } from './tenant-plugin.js';

/**
 * @template {import('mongoose').Schema} S
 * @param {string} name        model name, e.g. 'HotelProperty'
 * @param {S} schema
 * @param {string} collection  e.g. 'htl_properties'
 */
export function defineModel(name, schema, collection) {
  assertAllowedCollection(collection, `model ${name}`);
  schema.set('strict', 'throw');
  schema.set('strictQuery', true);
  schema.set('autoIndex', false);
  schema.set('autoCreate', false);
  return b2bMongoose.model(name, schema, collection);
}

/**
 * Like defineModel, for data owned by an organisation / customer: adds the tenant guard
 * (every query must be scoped by one of `ownershipFields`; system access is logged).
 * @template {import('mongoose').Schema} S
 * @param {string} name
 * @param {S} schema
 * @param {string} collection
 * @param {readonly string[]} ownershipFields e.g. ['orgId'] or ['clientOrgId', 'customerId', 'hotelOrgId']
 */
export function defineTenantModel(name, schema, collection, ownershipFields) {
  schema.plugin(tenantPlugin, {
    fields: ownershipFields,
    onSystemAccess: (info) => logger.info(info, 'tenant guard: system access'),
  });
  return defineModel(name, schema, collection);
}

/**
 * Start-up check: every model registered on the B2B instance uses an allowed collection.
 * Catches models created with `b2bMongoose.model()` directly instead of `defineModel()`.
 * @param {typeof b2bMongoose} [instance]
 */
export function assertRegisteredModelsAllowed(instance = b2bMongoose) {
  for (const name of instance.modelNames()) {
    assertAllowedCollection(instance.model(name).collection.collectionName, `model ${name}`);
  }
}
