// @ts-check
/** Owned by an organisation → tenant model (every query must be scoped by orgId). */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const ITEMS_COLLECTION = 'core_example_items';

const schema = new b2bMongoose.Schema(
  {
    orgId: { type: String, required: true },
    name: { type: String, required: true, maxlength: 200 },
  },
  { timestamps: true, versionKey: false },
);

export const ExampleItem = defineTenantModel('ExampleItem', schema, ITEMS_COLLECTION, ['orgId']);
