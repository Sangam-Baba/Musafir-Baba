// @ts-check
/**
 * Wallet statement and alerts (S11-T09): opening + entries = closing, straight from the journal, in Indian dates; CSV
 * (no spreadsheet formulas); the low-balance threshold — one alert when available falls below it, again only after
 * going back above; "money added" with every top-up; one credit-overdue alert until paid; the messages read well.
 */
import { describe, expect, it } from 'vitest';

import { renderTemplate } from '../../src/b2b/modules/notifications/domain/templates.js';
import {
  AccountRecord,
  createLedger,
  createLiveWallets,
  seedPlatformAccounts,
  TransactionRecord,
} from '../../src/b2b/modules/wallet/index.js';
import { walletParts } from '../../src/b2b/routes/wallet-wiring.js';
import { asStaff, auth, useInventoryApp } from './helpers/inventory-app.js';
import { clientOwner } from './helpers/search-setup.js';

let nowMs = Date.parse('2026-11-10T06:00:00Z');
const clock = { now: () => new Date(nowMs) };
const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const app = useInventoryApp({ clock, models: [TransactionRecord], env: { B2B_WALLET_ENABLED: 'true' } });
let n = 0;

async function client() {
  nowMs = Date.parse('2026-11-10T06:00:00Z');
  await seedPlatformAccounts();
  const email = `st${(n += 1)}@trips.example`;
  const c = { ...(await clientOwner(app, email)), email };
  await app.srv.get('/api/v1/wallet', auth(c.token));
  return c;
}
/** @param {string} orgId @param {number} amount @param {string} [memo] */
async function move(orgId, amount, memo) {
  const ledger = createLedger({ clock });
  const bank = await ledger.accountId('platform', 'BANK');
  const id = `s-${(n += 1)}`;
  return createLiveWallets({ clock, ledger }).apply({
    clientOrgId: orgId,
    opId: id,
    type: amount > 0 ? 'TOPUP' : 'DEBIT',
    amountPaise: amount,
    journal: {
      reference: { type: 'test-st', id },
      purpose: amount > 0 ? 'wallet-topup' : 'order-paid-wallet',
      lines: [amount > 0 ? { accountId: bank, debitPaise: amount } : { accountId: bank, creditPaise: -amount }],
      memo: memo ?? null,
    },
    by: 'test',
  });
}
/** @param {string} orgId @returns {Promise<string[]>} */
const events = async (orgId) =>
  /** @type {any} */ ((await AccountRecord.findOne({ ownerOrgId: orgId, type: 'WALLET' }).setOptions(S).lean())?.pendingEvents ?? []).map(
    (/** @type {any} */ e) => e.type,
  );

describe('statement', () => {
  it('opening + entries = closing for the period (Indian dates); CSV with opening and closing, no formulas', async () => {
    const c = await client();
    await move(c.orgId, 1_000_000); // 10 Nov
    nowMs = Date.parse('2026-11-14T20:00:00Z'); // 15 Nov 01:30 in India
    await move(c.orgId, -250_000, '=HYPERLINK("x")');
    nowMs = Date.parse('2026-11-20T06:00:00Z');
    await move(c.orgId, 500_000);
    c.token = await app.login(c.email);
    const s = (await app.srv.get('/api/v1/wallet/statement?from=2026-11-15&to=2026-11-20', auth(c.token))).body;
    expect(s).toMatchObject({ openingPaise: 1_000_000, closingPaise: 1_250_000 });
    expect(s.lines.map((/** @type {any} */ l) => [l.description, l.amountPaise, l.balancePaise])).toEqual([
      ['Booking paid', -250_000, 750_000],
      ['Money added (PayU)', 500_000, 1_250_000],
    ]);
    const csv = await app.srv.get('/api/v1/wallet/statement.csv?from=2026-11-15&to=2026-11-20', auth(c.token));
    expect(csv.headers.get('content-type')).toContain('text/csv');
    const text = typeof csv.body === 'string' ? csv.body : JSON.stringify(csv.body);
    expect(text).toContain('Opening balance');
    expect(text).toContain('12500.00');
    expect(text).toContain(`"'=HYPERLINK(""x"")"`);
    expect((await app.srv.get('/api/v1/wallet/statement?from=2025-01-01&to=2026-11-20', auth(c.token))).status).toBe(422);
  });
});

describe('alerts', () => {
  it('low balance: once when available falls below the threshold, again only after going back above; 0 = off', async () => {
    const c = await client();
    expect(
      (await app.srv.patch('/api/v1/wallet/settings', { lowBalanceThresholdPaise: 500_000 }, auth(c.token))).body.lowBalanceThresholdPaise,
    ).toBe(500_000);
    await move(c.orgId, 1_000_000);
    await move(c.orgId, -600_000); // 4 000 left → alert
    await move(c.orgId, -100_000); // still below → no second alert
    expect((await events(c.orgId)).filter((t) => t === 'wallet.account.low-balance')).toHaveLength(1);
    await move(c.orgId, 400_000); // back above → re-armed
    await move(c.orgId, -400_000);
    expect((await events(c.orgId)).filter((t) => t === 'wallet.account.low-balance')).toHaveLength(2);
    expect((await events(c.orgId)).filter((t) => t === 'wallet.topup.credited')).toHaveLength(2);
  });

  it('credit overdue: one alert until the wallet is back to zero', async () => {
    const c = await client();
    await AccountRecord.updateOne(
      { ownerOrgId: c.orgId, type: 'WALLET' },
      { $set: { creditLimitPaise: 500_000, creditDueDays: 5, lowBalanceThresholdPaise: 0 } },
    ).setOptions(S);
    await move(c.orgId, -200_000);
    const job = walletParts(clock).schedule;
    await job.run();
    expect(await events(c.orgId)).not.toContain('wallet.credit.overdue');
    nowMs += 6 * 86_400_000;
    await job.run();
    await job.run();
    expect((await events(c.orgId)).filter((t) => t === 'wallet.credit.overdue')).toHaveLength(1);
    expect((await app.admin.get('/api/v1/admin/wallet/credit-overdue', asStaff('f1:wallet.credit.propose'))).body.data).toHaveLength(1);
  });

  it('the messages read well', () => {
    const vars = { orgName: 'Trips Co', link: 'https://musafirbaba.com/business/wallet', amount: '₹10,000' };
    expect(renderTemplate('wallet.low-balance', vars).body).toBe(
      'The Trips Co wallet has less than ₹10,000 available. Add money so bookings are not stopped.',
    );
    expect(renderTemplate('wallet.topup-credited', { ...vars, amount: '₹2,500' }).subject).toBe('₹2,500 added to your MusafirBaba wallet');
    expect(renderTemplate('wallet.credit-overdue', vars).title).toBe('Credit payment overdue');
  });
});
