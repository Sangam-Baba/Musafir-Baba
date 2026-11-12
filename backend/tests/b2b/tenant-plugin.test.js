// @ts-check
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { b2bMongoose } from '../../src/b2b/core/db/connection.js';
import { defineTenantModel } from '../../src/b2b/core/db/model.js';
import { isScoped, systemScope, TenantScopeError } from '../../src/b2b/core/db/tenant-plugin.js';
import { startMongo } from './helpers/mongo.js';

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
const OrgA = new b2bMongoose.Types.ObjectId();
const OrgB = new b2bMongoose.Types.ObjectId();

const Rate = defineTenantModel(
  'ProbeRate',
  new b2bMongoose.Schema({ orgId: b2bMongoose.Schema.Types.ObjectId, amount: Number }),
  'prc_probe_rates',
  ['orgId'],
);
const Order = defineTenantModel(
  'ProbeOrder',
  new b2bMongoose.Schema({
    clientOrgId: b2bMongoose.Schema.Types.ObjectId,
    hotelOrgId: b2bMongoose.Schema.Types.ObjectId,
    customerId: String,
    ref: String,
  }),
  'ord_probe_orders',
  ['clientOrgId', 'customerId', 'hotelOrgId'],
);

beforeAll(async () => {
  mongo = await startMongo();
  await Rate.create([
    { orgId: OrgA, amount: 100 },
    { orgId: OrgB, amount: 200 },
  ]);
  await Order.create([
    { clientOrgId: OrgA, hotelOrgId: OrgB, ref: 'o1' },
    { customerId: 'c1', hotelOrgId: OrgB, ref: 'o2' },
  ]);
});
afterAll(async () => mongo.stop());

describe('tenant guard — unscoped access throws', () => {
  /** @type {Array<[string, () => PromiseLike<unknown>]>} */
  const unscoped = [
    ['find', () => Rate.find({})],
    ['findOne by amount', () => Rate.findOne({ amount: 100 })],
    ['countDocuments', () => Rate.countDocuments({})],
    ['distinct', () => Rate.distinct('amount', {})],
    ['updateMany', () => Rate.updateMany({}, { $set: { amount: 0 } })],
    ['deleteMany', () => Rate.deleteMany({ amount: { $gt: 0 } })],
    ['findOneAndUpdate', () => Rate.findOneAndUpdate({ amount: 100 }, { $set: { amount: 1 } })],
    ['estimatedDocumentCount', () => Rate.estimatedDocumentCount()],
    ['aggregate without $match', () => Rate.aggregate([{ $group: { _id: null, n: { $sum: 1 } } }])],
    ['aggregate with non-tenant $match', () => Rate.aggregate([{ $match: { amount: 100 } }])],
    ['bulkWrite update without org', () => Rate.bulkWrite([{ updateMany: { filter: {}, update: { $set: { amount: 0 } } } }])],
    ['bulkWrite insert without org', () => Rate.bulkWrite([{ insertOne: { document: { amount: 5 } } }])],
    ['empty $in', () => Rate.find({ orgId: { $in: [] } })],
    ['operator instead of value', () => Rate.find({ orgId: { $ne: OrgA } })],
    ['$or with an unscoped branch', () => Order.find({ $or: [{ clientOrgId: OrgA }, { ref: 'o2' }] })],
  ];
  it.each(unscoped)('%s', async (_name, run) => {
    await expect(run()).rejects.toBeInstanceOf(TenantScopeError);
  });

  it('nothing was changed by the refused writes', async () => {
    expect(
      await Rate.find({ orgId: { $in: [OrgA, OrgB] } })
        .sort({ amount: 1 })
        .lean()
        .then((r) => r.map((x) => x.amount)),
    ).toEqual([100, 200]);
  });

  it('refuses new documents without an ownership field (create and insertMany)', async () => {
    await expect(Rate.create({ amount: 1 })).rejects.toBeInstanceOf(TenantScopeError);
    await expect(Rate.insertMany([{ amount: 1 }])).rejects.toBeInstanceOf(TenantScopeError);
  });
});

describe('tenant guard — scoped access works and stays inside the org', () => {
  it('org A sees only its own rates', async () => {
    const rows = await Rate.find({ orgId: OrgA }).lean();
    expect(rows.map((r) => r.amount)).toEqual([100]);
    expect(await Rate.countDocuments({ orgId: OrgB, amount: 100 })).toBe(0);
  });

  it('multi-party documents: client, hotel and customer each see theirs', async () => {
    expect((await Order.find({ clientOrgId: OrgA }).lean()).map((o) => o.ref)).toEqual(['o1']);
    expect((await Order.find({ hotelOrgId: OrgB }).sort({ ref: 1 }).lean()).map((o) => o.ref)).toEqual(['o1', 'o2']);
    expect((await Order.find({ customerId: 'c1' }).lean()).map((o) => o.ref)).toEqual(['o2']);
    expect((await Order.find({ $or: [{ clientOrgId: OrgA }, { hotelOrgId: OrgA }] }).lean()).map((o) => o.ref)).toEqual(['o1']);
  });

  it('scoped aggregate, updates and bulk writes are allowed', async () => {
    expect(await Rate.aggregate([{ $match: { orgId: OrgA } }, { $count: 'n' }])).toEqual([{ n: 1 }]);
    await Rate.updateOne({ orgId: OrgA }, { $inc: { amount: 0 } });
    await Rate.bulkWrite([{ updateOne: { filter: { orgId: OrgA }, update: { $inc: { amount: 0 } } } }]);
  });

  it('system access needs a reason and is allowed across orgs', async () => {
    expect(() => systemScope('')).toThrow(/reason/);
    expect(await Rate.countDocuments({}).setOptions(systemScope('nightly-invariant-check'))).toBe(2);
    expect(await Rate.aggregate([{ $count: 'n' }]).option(systemScope('report'))).toEqual([{ n: 2 }]);
  });
});

describe('isScoped', () => {
  it('handles $eq, $in, $and and nested $or', () => {
    const f = ['orgId'];
    expect(isScoped({ orgId: { $eq: 'a' } }, f)).toBe(true);
    expect(isScoped({ orgId: { $in: ['a', 'b'] } }, f)).toBe(true);
    expect(isScoped({ $and: [{ x: 1 }, { orgId: 'a' }] }, f)).toBe(true);
    expect(isScoped({ $or: [] }, f)).toBe(false);
    expect(isScoped({ orgId: '' }, f)).toBe(false);
    expect(isScoped({ orgId: null }, f)).toBe(false);
  });
});
