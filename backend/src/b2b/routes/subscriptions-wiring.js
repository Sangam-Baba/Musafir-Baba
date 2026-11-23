// @ts-check
/**
 * Stage 13 background parts: a client company is activated → its subscription starts (the default plan / trial,
 * repeat-safe); every 10 minutes: verified clients without one get it (clients verified before Stage 13), approved
 * overrides cut short are applied; every 5 minutes: 80 % / 100 % quota alerts. Billing (renewals, invoices, collection, dunning) is added with S13-T06 / T07.
 */
import { systemScope } from '../core/db/tenant-plugin.js';
import { EVENTS as ORG_EVENTS, OrganizationRecord } from '../modules/organizations/index.js';
import { createOverrides, createSubscriptions, sendQuotaAlerts, SubscriptionRecord } from '../modules/subscriptions/index.js';

const SCOPE = systemScope('subscriptions: start for verified clients', { routine: true });

/** Active clients without a subscription → started. @param {ReturnType<typeof createSubscriptions>} subs */
export async function startMissingSubscriptions(subs) {
  const clients = await OrganizationRecord.find({ type: 'CLIENT', status: 'ACTIVE' }, { _id: 1 }).setOptions(SCOPE).limit(2000).lean();
  const have = new Set((await SubscriptionRecord.find({}, { clientOrgId: 1 }).setOptions(SCOPE).lean()).map((s) => String(s.clientOrgId)));
  let started = 0;
  for (const c of clients)
    if (!have.has(String(c._id))) {
      await subs.start(String(c._id));
      started += 1;
    }
  return started;
}

/** @param {import('../core/clock.js').Clock} clock */
export function subscriptionParts(clock) {
  const subs = createSubscriptions({ clock });
  const overrides = createOverrides({ clock });
  return {
    subs,
    consumers: [
      {
        consumer: 'subscriptions-client-start',
        types: [ORG_EVENTS.orgActivated],
        /** @param {any} event */
        handler: async (event) => {
          if (event.payload.type === 'CLIENT') await subs.start(String(event.payload.orgId));
        },
      },
    ],
    schedules: [
      {
        name: 'subscriptions-housekeeping',
        everyMs: 10 * 60_000,
        run: async () => ({ started: await startMissingSubscriptions(subs), ...(await overrides.applyDue()) }),
      },
      { name: 'subscriptions-quota-alerts', everyMs: 5 * 60_000, run: () => sendQuotaAlerts({ clock }) },
    ],
  };
}
