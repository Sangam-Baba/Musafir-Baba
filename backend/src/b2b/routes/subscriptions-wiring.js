// @ts-check
/**
 * Stage 13 background parts: a client company is activated → its subscription starts (the default plan / trial,
 * repeat-safe); every 10 minutes: verified clients without one get it (clients verified before Stage 13), approved
 * overrides cut short are applied; every 5 minutes: 80 % / 100 % quota alerts.
 * Billing (S13-T06): every 10 minutes — trials ended, months renewed, new charges invoiced and collected from the
 * wallet, finished months' overage billed; hourly — unpaid invoices tried again, dunning (reminders day 0 / 3 / 7, suspended
 * day 10); a wallet top-up → that client's unpaid invoices tried at once; a PayU payment for an invoice → paid.
 */
import express from 'express';

import { systemScope } from '../core/db/tenant-plugin.js';
import { ServiceUnavailableError } from '../core/errors.js';
import { EVENTS as ORG_EVENTS, OrganizationRecord } from '../modules/organizations/index.js';
import { createOverrides, createPlans, createSubscriptions, sendQuotaAlerts, SubscriptionRecord } from '../modules/subscriptions/index.js';
import { paymentsFromEnv } from './payments-wiring.js';
import { subscriptionRoutes } from './subscriptions.js';
import { subscriptionAdminRoutes } from './subscriptions-admin.js';
import { createBilling, runDunning } from '../modules/billing/index.js';
import { createGstRegistrations } from '../modules/kyc/index.js';
import { EVENTS as PAYMENT_EVENTS } from '../modules/payments/index.js';
import { readSettings } from '../modules/pricing/index.js';
import { createLedger, createLiveWallets, EVENTS as WALLET_EVENTS } from '../modules/wallet/index.js';
import { inPilot, pilotGate } from './pilot.js';

const SCOPE = systemScope('subscriptions: start for verified clients', { routine: true });

/** Active clients without a subscription → started (pilot companies only while `B2B_PILOT_ORGS` is set). @param {ReturnType<typeof createSubscriptions>} subs @param {NodeJS.ProcessEnv} [env] */
export async function startMissingSubscriptions(subs, env = {}) {
  const clients = await OrganizationRecord.find({ type: 'CLIENT', status: 'ACTIVE' }, { _id: 1 }).setOptions(SCOPE).limit(2000).lean();
  const have = new Set((await SubscriptionRecord.find({}, { clientOrgId: 1 }).setOptions(SCOPE).lean()).map((s) => String(s.clientOrgId)));
  let started = 0;
  for (const c of clients)
    if (!have.has(String(c._id)) && inPilot(env, String(c._id))) {
      await subs.start(String(c._id));
      started += 1;
    }
  return started;
}

/**
 * Billing for this process: MusafirBaba's default GST registration, the client's name and verified GSTIN.
 * @param {import('../core/clock.js').Clock} clock
 * @param {NodeJS.ProcessEnv} env
 * @param {ReturnType<typeof createSubscriptions>} subs
 */
export function billingFor(clock, env, subs) {
  const ledger = createLedger({ clock });
  const gst = createGstRegistrations({ clock, fieldKey: env.B2B_FILE_KEY ?? env.B2B_AUTH_SECRET ?? '' });
  return createBilling({
    clock,
    ledger,
    wallets: createLiveWallets({ clock, ledger }),
    subscriptions: subs,
    issuer: async () => {
      const issuers = (await readSettings()).issuers ?? [];
      const i = issuers.find((x) => x.isDefault) ?? issuers[0];
      return { stateCode: i?.stateCode ?? '07', gstin: i?.gstin ?? null };
    },
    client: async (orgId) => {
      const org = /** @type {any} */ (await OrganizationRecord.findOne({ _id: orgId }, { legalName: 1 }).setOptions(SCOPE).lean());
      const status = await gst.gstStatus(orgId);
      return { name: org?.legalName ?? 'Client', gstin: status.verified[0]?.gstin ?? null };
    },
  });
}

/** Every subscription: trial end, renewal, charges invoiced, finished months billed. @param {ReturnType<typeof createSubscriptions>} subs @param {ReturnType<typeof createBilling>} billing */
export async function runBilling(subs, billing) {
  const all = await SubscriptionRecord.find({}, { _id: 1, clientOrgId: 1 }).setOptions(SCOPE).limit(5000).lean();
  let invoices = 0;
  for (const { clientOrgId } of all) {
    let sub = await subs.current(clientOrgId);
    if (sub) await subs.endTrial(sub);
    sub = await subs.current(clientOrgId);
    if (sub) await subs.renew(sub);
    sub = await subs.current(clientOrgId);
    if (!sub) continue;
    invoices += await billing.billCharges(sub);
    invoices += await billing.closeMonths(sub);
  }
  return { subscriptions: all.length, invoices };
}

/**
 * Background parts — only with `B2B_BILLING_ENABLED=true` (off by default: nothing starts, nothing is billed).
 * @param {import('../core/clock.js').Clock} clock
 * @param {NodeJS.ProcessEnv} [env]
 */
export function subscriptionParts(clock, env = {}) {
  const subs = createSubscriptions({ clock });
  const overrides = createOverrides({ clock });
  const billing = billingFor(clock, env, subs);
  // Switched off until the owner turns it on: no subscriptions start, no billing, no reminders.
  if (env.B2B_BILLING_ENABLED !== 'true') return { subs, billing, consumers: [], schedules: [] };
  return {
    subs,
    billing,
    consumers: [
      {
        consumer: 'billing-invoice-paid-payu',
        types: [PAYMENT_EVENTS.intentSucceeded, PAYMENT_EVENTS.intentPaidLate],
        /** @param {any} event */
        handler: async (event) => {
          const p = event.payload;
          if (p.purpose === 'SUBSCRIPTION' && p.reference?.type === 'saas-invoice')
            await billing.paidByPayu(String(p.reference.id), String(p.txnId));
        },
      },
      {
        consumer: 'billing-retry-after-topup',
        types: [WALLET_EVENTS.topUpCredited],
        /** @param {any} event */
        handler: async (event) => void (await billing.retryUnpaid(String(event.payload.orgId))), // paid → active again at once
      },
      {
        consumer: 'subscriptions-client-start',
        types: [ORG_EVENTS.orgActivated],
        /** @param {any} event */
        handler: async (event) => {
          if (event.payload.type === 'CLIENT' && inPilot(env, String(event.payload.orgId))) await subs.start(String(event.payload.orgId));
        },
      },
    ],
    schedules: [
      {
        name: 'subscriptions-housekeeping',
        everyMs: 10 * 60_000,
        run: async () => ({ started: await startMissingSubscriptions(subs, env), ...(await overrides.applyDue()) }),
      },
      { name: 'subscriptions-quota-alerts', everyMs: 5 * 60_000, run: () => sendQuotaAlerts({ clock }) },
      { name: 'billing-run', everyMs: 10 * 60_000, run: () => runBilling(subs, billing) },
      { name: 'billing-retry-unpaid', everyMs: 60 * 60_000, run: () => billing.retryUnpaid() },
      { name: 'billing-dunning', everyMs: 60 * 60_000, run: () => runDunning({ clock }) },
    ],
  };
}

/**
 * Stage 13 routes: client plan and billing, MusafirBaba admin (plans, subscriptions, overrides, dunning, revenue).
 * @param {NodeJS.ProcessEnv} env
 * @param {import('../core/clock.js').Clock} clock
 * @param {import('../core/logger.js').Logger} logger
 */
export function stage13Routes(env, clock, logger) {
  const router = express.Router();
  const subs = createSubscriptions({ clock });
  const billing = billingFor(clock, env, subs);
  router.use(subscriptionAdminRoutes({ clock, plans: createPlans({ clock }), overrides: createOverrides({ clock }) }));
  // clients see their plan only once billing is switched on (admin can prepare plans before)
  if (env.B2B_BILLING_ENABLED !== 'true')
    router.use(['/plans', '/subscription', '/billing'], (_req, _res, next) => next(new ServiceUnavailableError('BILLING_NOT_ENABLED')));
  router.use(['/plans', '/subscription', '/billing'], pilotGate(env, 'BILLING_NOT_ENABLED')); // Stage 16: pilot companies first
  router.use(
    subscriptionRoutes({
      clock,
      plans: createPlans({ clock }),
      subs,
      billing,
      payments: paymentsFromEnv(env, clock, logger).payments,
      publicUrl: (env.B2B_PUBLIC_URL || 'https://musafirbaba.com').replace(/\/$/, ''),
    }),
  );
  return router;
}
