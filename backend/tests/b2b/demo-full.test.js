// @ts-check
/**
 * The full demo (local / test only): adds partners and runs the real flows — wallets, bookings, a cancellation with a
 * refund, a finished stay, a payout run, a plan invoice, an API key, a webhook address, a booking request, a data
 * request — with every safety check clean; then `remove` deletes exactly the demo, leaves a real client's wallet and
 * journal untouched, and the safety checks are still clean.
 */
import { BusBookingRecord } from '../../src/b2b/modules/bus-booking/index.js';
import { VehicleRecord } from '../../src/b2b/modules/bus-catalog/index.js';
import { ClaimRecord, TripRecord, TripSeatRecord } from '../../src/b2b/modules/bus-inventory/index.js';
import { describe, expect, it } from 'vitest';

import { createInvariantChecks } from '../../src/b2b/core/db/invariants.js';
import { addDemoData, removeDemoData } from '../../src/b2b/demo/demo-data.js';
import { addDemoFlows } from '../../src/b2b/demo/demo-flows.js';
import { ApiKeyRecord } from '../../src/b2b/modules/api-access/index.js';
import { InvoiceRecord } from '../../src/b2b/modules/billing/index.js';
import { documentInvariants } from '../../src/b2b/modules/documents/index.js';
import { BookingRecord, BookingRequestRecord } from '../../src/b2b/modules/hotel-booking/index.js';
import { inventoryInvariants } from '../../src/b2b/modules/hotel-inventory/index.js';
import { DataRequestRecord } from '../../src/b2b/modules/identity/index.js';
import { ApplicationRecord } from '../../src/b2b/modules/kyc/index.js';
import { OrderRecord, orderInvariants } from '../../src/b2b/modules/orders/index.js';
import { ClientCategoryRecord, OrganizationRecord } from '../../src/b2b/modules/organizations/index.js';
import { MarginRuleRecord, SigningKeyRecord, TaxRuleRecord } from '../../src/b2b/modules/pricing/index.js';
import { SubscriptionRecord, seedPlans } from '../../src/b2b/modules/subscriptions/index.js';
import {
  AccountRecord,
  createLedger,
  createLiveWallets,
  ledgerInvariants,
  PayableRecord,
  PayoutRunRecord,
  rollUpBalances,
  seedPlatformAccounts,
  TransactionRecord,
} from '../../src/b2b/modules/wallet/index.js';
import { EndpointRecord } from '../../src/b2b/modules/webhooks/index.js';
import { PASSWORD, SYSTEM, useInventoryApp } from './helpers/inventory-app.js';
import { clientOwner, seedPricing } from './helpers/search-setup.js';

const clock = { now: () => new Date('2026-11-24T06:00:00Z') };
const ENV = {
  B2B_AUTH_SECRET: ['b2b', 'inventory', 'test', 'secret', 'long-enough-1'].join('-'),
  B2B_WALLET_ENABLED: 'true',
  B2B_BUS_ENABLED: 'true',
  B2B_BUS_SELLING_ENABLED: 'true',
}; // as demo.js full
const app = useInventoryApp({ clock, env: ENV, models: [MarginRuleRecord, SigningKeyRecord, ClientCategoryRecord] });
const quiet = /** @type {any} */ ({ info: () => undefined, warn: () => undefined, error: () => undefined, child: () => quiet });

async function checks() {
  const c = createInvariantChecks();
  for (const inv of [
    ...inventoryInvariants({ clock }),
    ...ledgerInvariants(),
    ...orderInvariants({ clock }),
    ...documentInvariants({ clock }),
  ])
    c.register(inv);
  return (await c.runAll(quiet)).filter((r) => r.violations.length || r.error);
}

describe('the full demo', () => {
  it('runs the real flows with every check clean, and is removed exactly', async () => {
    await seedPricing(clock);
    await seedPlatformAccounts();
    await seedPlans();
    const real = await clientOwner(app, 'owner@real-agency.in'); // a real client with money — must survive removal
    const ledger = createLedger({ clock });
    await createLiveWallets({ clock, ledger }).open(real.orgId);
    await createLiveWallets({ clock, ledger }).apply({
      clientOrgId: real.orgId,
      opId: 'real-top-1',
      type: 'TOPUP',
      amountPaise: 1_000_000,
      journal: {
        reference: { type: 'test-top', id: 'real' },
        purpose: 'wallet-topup',
        lines: [{ accountId: await ledger.accountId('platform', 'BANK'), debitPaise: 1_000_000 }],
      },
      by: 'test',
    });

    const base = await addDemoData({ api: app.srv, clock, users: app.users, orgs: app.orgs, password: PASSWORD });
    const log = await addDemoFlows(
      { api: app.srv, clock, users: app.users, orgs: app.orgs, password: PASSWORD, env: { ...process.env, ...ENV }, logger: quiet },
      base,
    );
    expect(log.join('\n')).not.toMatch(/skipped/);
    expect(await OrganizationRecord.countDocuments({ statusReason: 'demo-data' }).setOptions(SYSTEM)).toBe(6); // + the demo bus company
    expect(await BusBookingRecord.countDocuments({ status: 'CONFIRMED' }).setOptions(SYSTEM)).toBe(1);
    expect(await TripRecord.countDocuments({}).setOptions(SYSTEM)).toBe(90);
    expect(await BookingRecord.countDocuments({ status: 'CANCELLED' }).setOptions(SYSTEM)).toBe(1);
    expect(await BookingRecord.countDocuments({ status: 'COMPLETED' }).setOptions(SYSTEM)).toBe(1);
    expect(await PayoutRunRecord.findOne({}).lean()).toMatchObject({ status: 'PAID', bankReference: 'NEFT-DEMO-0001' });
    expect(await InvoiceRecord.countDocuments({}).setOptions(SYSTEM)).toBeGreaterThan(0);
    expect(await ApplicationRecord.countDocuments({ status: 'SUBMITTED' }).setOptions(SYSTEM)).toBe(1);
    expect(await ApiKeyRecord.countDocuments({}).setOptions(SYSTEM)).toBe(1);
    expect(await EndpointRecord.countDocuments({}).setOptions(SYSTEM)).toBe(1);
    expect(await BookingRequestRecord.countDocuments({}).setOptions(SYSTEM)).toBe(1);
    expect(await DataRequestRecord.countDocuments({})).toBe(1);
    await rollUpBalances({ clock });
    expect(await checks()).toEqual([]);

    const realTx = await TransactionRecord.countDocuments({ 'reference.id': 'real' });
    const removed = await removeDemoData();
    expect(removed).toMatchObject({ removed: 6, busCompanies: 1 });
    for (const m of [BusBookingRecord, TripRecord, TripSeatRecord, VehicleRecord, ClaimRecord])
      expect(await /** @type {any} */ (m).countDocuments({}).setOptions(SYSTEM), m.modelName).toBe(0);
    expect(await MarginRuleRecord.countDocuments({ key: 'demo-bus-margin' })).toBe(0);
    expect(await TaxRuleRecord.countDocuments({ key: 'demo-bus-gst' })).toBe(0);
    expect(await OrganizationRecord.countDocuments({ statusReason: 'demo-data' }).setOptions(SYSTEM)).toBe(0);
    for (const m of [
      OrderRecord,
      BookingRecord,
      PayableRecord,
      InvoiceRecord,
      SubscriptionRecord,
      ApiKeyRecord,
      EndpointRecord,
      ApplicationRecord,
    ])
      expect(await /** @type {any} */ (m).countDocuments({}).setOptions(SYSTEM), m.modelName).toBe(0);
    expect(await PayoutRunRecord.countDocuments({})).toBe(0);
    expect(await TransactionRecord.countDocuments({ 'reference.id': 'real' })).toBe(realTx);
    expect(await AccountRecord.findOne({ ownerOrgId: real.orgId, type: 'WALLET' }).setOptions(SYSTEM).lean()).toMatchObject({
      balancePaise: 1_000_000,
    });
    await rollUpBalances({ clock });
    expect(await checks()).toEqual([]);
  }, 180_000);
});
