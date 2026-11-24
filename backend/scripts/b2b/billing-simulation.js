// @ts-check
/**
 * A billing month for a demo client, simulated on whatever database is connected (plan Stage 13 §9 — no real clients
 * yet). Used by `simulate-billing.js` (prints the story on a throw-away in-memory database) and by the Stage 13
 * mandatory tests. Steps: trial → upgrade to Plan B (prorated fee from the wallet) → searches to 80 % and 100 %
 * (alerts) → over the limit (OVERAGE goes on) → month renews and closes (December fee, November overage) → wallet
 * empty → unpaid → reminders → suspended → top-up → paid and active again.
 */
import { createBilling, dunningBoard, runDunning } from '../../src/b2b/modules/billing/index.js';
import { UsageMonthlyRecord } from '../../src/b2b/modules/metering/index.js';
import { createSubscriptions, quotaOf, seedPlans, sendQuotaAlerts, SubscriptionRecord } from '../../src/b2b/modules/subscriptions/index.js';
import { createLedger, createLiveWallets, seedPlatformAccounts } from '../../src/b2b/modules/wallet/index.js';
import { runBilling } from '../../src/b2b/routes/subscriptions-wiring.js';

const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'billing simulation' };
const DAY = 86_400_000;

/**
 * @param {{ start?: string, client?: string, log?: (line: string) => void }} [o]
 * @returns {Promise<{ steps: { at: string, what: string }[], invoices: any[], final: any }>}
 */
export async function simulateBillingMonth(o = {}) {
  let nowMs = Date.parse(o.start ?? '2026-11-10T06:30:00Z');
  const clock = { now: () => new Date(nowMs) };
  const client = o.client ?? '65f0000000000000000a1001';
  /** @type {{ at: string, what: string }[]} */
  const steps = [];
  const note = (/** @type {string} */ what) => {
    steps.push({ at: new Date(nowMs).toISOString().slice(0, 16), what });
    o.log?.(`${new Date(nowMs + 330 * 60_000).toISOString().slice(0, 16).replace('T', ' ')} IST  ${what}`);
  };
  const rupees = (/** @type {number} */ p) => `₹${(p / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  await seedPlatformAccounts();
  await seedPlans();
  const ledger = createLedger({ clock });
  const wallets = createLiveWallets({ clock, ledger });
  const subs = createSubscriptions({ clock });
  const billing = createBilling({
    clock,
    ledger,
    wallets,
    subscriptions: subs,
    issuer: async () => ({ stateCode: '07', gstin: '07AAACM0000A1Z5' }),
    client: async () => ({ name: 'Demo Travels Pvt Ltd', gstin: '07AAACD0000B1Z9' }),
  });
  const topUp = async (/** @type {number} */ amount) => {
    await wallets.apply({
      clientOrgId: client,
      opId: `sim-top-${nowMs}`,
      type: 'TOPUP',
      amountPaise: amount,
      journal: {
        reference: { type: 'sim-top', id: `${client}-${nowMs}` },
        purpose: 'wallet-topup',
        lines: [{ accountId: await ledger.accountId('platform', 'BANK'), debitPaise: amount }],
      },
      by: 'simulation',
    });
    note(`wallet topped up with ${rupees(amount)}`);
  };
  const searches = async (/** @type {number} */ n) => {
    await UsageMonthlyRecord.updateOne(
      { orgId: client, metric: 'hotel.search', month: new Date(nowMs + 330 * 60_000).toISOString().slice(0, 7) },
      { $inc: { count: n, billable: n } },
      { upsert: true },
    ).setOptions(S);
    const q = /** @type {any} */ (await quotaOf(client, clock.now()));
    note(`${n} searches → ${q.used} of ${q.allowance} used (${q.percent} %)${q.blocked ? ' — blocked' : ''}`);
  };

  await wallets.open(client);
  const sub = await subs.start(client);
  note(`client verified → ${sub.planKey} trial, ${sub.includedQueries} queries`);
  await topUp(300_000); // enough for November only — December goes unpaid
  const up = await subs.change({ clientOrgId: client, planKey: 'B', expectedVersion: sub.version, by: 'user:demo' });
  note(`upgraded to Plan B: ${rupees(up.chargeNowPaise)} + GST for the rest of November, ${up.subscription?.includedQueries} queries`);
  await runBilling(subs, billing);
  note(`billing run → wallet ${rupees((await wallets.read(client)).balancePaise)}`);
  nowMs += 8 * DAY;
  const allowance = /** @type {any} */ (await subs.current(client)).includedQueries;
  await searches(Math.ceil(allowance * 0.82));
  note(`quota alerts: ${JSON.stringify(await sendQuotaAlerts({ clock }))}`);
  nowMs += 5 * DAY;
  await searches(Math.ceil(allowance * 0.25));
  note(`quota alerts: ${JSON.stringify(await sendQuotaAlerts({ clock }))}`);
  nowMs = Date.parse('2026-12-01T00:10:00Z');
  await runBilling(subs, billing);
  note(
    `1 December: renewed → ${/** @type {any} */ (await subs.current(client)).status}, wallet ${rupees((await wallets.read(client)).balancePaise)}`,
  );
  nowMs = Date.parse('2026-12-02T01:00:00Z');
  await runBilling(subs, billing);
  note(`November closed → overage billed; status ${/** @type {any} */ (await subs.current(client)).status}`);
  let prev = 0;
  for (const d of [0, 3, 7, 10]) {
    nowMs += (d - prev) * DAY;
    prev = d;
    note(`dunning: ${JSON.stringify(await runDunning({ clock }))} → ${/** @type {any} */ (await subs.current(client)).status}`);
  }
  note(`dunning board: ${JSON.stringify((await dunningBoard()).map((x) => ({ status: x.status, unpaid: x.unpaidPaise })))}`);
  await topUp(2_000_000);
  note(
    `unpaid tried again: ${JSON.stringify(await billing.retryUnpaid(client))} → ${/** @type {any} */ (await subs.current(client)).status}`,
  );
  const invoices = await billing.list(client);
  for (const i of [...invoices].reverse())
    note(
      `invoice ${i.number} (${i.period}) ${i.lines.map((/** @type {any} */ l) => l.kind).join(' + ')}: ${rupees(i.totals.taxablePaise)} + GST ${rupees(i.totals.gstPaise)} = ${rupees(i.totals.totalPaise)} — ${i.status}`,
    );
  const final = await SubscriptionRecord.findOne({ clientOrgId: client }).setOptions(S).lean();
  return { steps, invoices, final };
}
