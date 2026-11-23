// @ts-check
/**
 * Dunning (plan Stage 13 §3.9): for every PAST_DUE subscription, the steps due since it went past due — reminders
 * (day 0, 3, 7) and suspension (day 10: SUSPENDED — search and booking off; existing bookings, documents and
 * cancellations still work) — each once per episode (unique row; the event in the same insert). Paying clears it:
 * the subscription is ACTIVE again as soon as nothing is unpaid (billing `markPaid`).
 */
import { newEvent } from '../../core/db/events.js';
import { SubscriptionRecord } from '../subscriptions/index.js';
import { BILL } from './billing.service.js';
import { dunningStepsDue } from './domain/dunning.js';
import { EVENTS } from './events.js';
import { InvoiceRecord } from './models/invoice.model.js';
import { DunningRecord } from './models/dunning.model.js';

/** @param {{ clock: import('../../core/clock.js').Clock }} deps */
export async function runDunning(deps) {
  const now = deps.clock.now();
  const pastDue = await SubscriptionRecord.find({ status: 'PAST_DUE', pastDueSince: { $ne: null } })
    .setOptions(BILL)
    .limit(2000)
    .lean();
  let reminded = 0;
  let suspended = 0;
  for (const sub of pastDue) {
    const unpaid = (
      await InvoiceRecord.find({ clientOrgId: sub.clientOrgId, status: 'UNPAID' }, { totals: 1 }).setOptions(BILL).lean()
    ).reduce((s, i) => s + (i.totals?.totalPaise ?? 0), 0);
    const episode = new Date(/** @type {any} */ (sub.pastDueSince)).toISOString();
    for (const step of dunningStepsDue(new Date(/** @type {any} */ (sub.pastDueSince)), now)) {
      const type = step.action === 'SUSPEND' ? EVENTS.subscriptionSuspended : EVENTS.dunningReminded;
      try {
        await DunningRecord.create({
          clientOrgId: sub.clientOrgId,
          episode,
          step: step.day,
          action: step.action,
          unpaidPaise: unpaid,
          at: now,
          hasPendingEvents: true,
          pendingEvents: [newEvent(type, { orgId: sub.clientOrgId, step: step.day, amountPaise: unpaid }, deps)],
        });
      } catch (e) {
        if (/** @type {any} */ (e)?.code === 11000) continue; // this step was done
        throw e;
      }
      if (step.action === 'SUSPEND') {
        const res = await SubscriptionRecord.updateOne(
          { _id: sub._id, status: 'PAST_DUE' },
          {
            $set: { status: 'SUSPENDED' },
            $inc: { version: 1 },
            $push: { history: { at: now, what: 'suspended — unpaid for 10 days', by: 'system:billing' } },
          },
        ).setOptions(BILL);
        suspended += res.modifiedCount;
      } else reminded += 1;
    }
  }
  return { reminded, suspended };
}

/** The dunning board: past-due and suspended clients with what they owe and the steps done. */
export async function dunningBoard() {
  const subs = await SubscriptionRecord.find({ status: { $in: ['PAST_DUE', 'SUSPENDED'] } })
    .setOptions(BILL)
    .sort({ pastDueSince: 1 })
    .limit(500)
    .lean();
  const out = [];
  for (const s of subs) {
    const unpaid = await InvoiceRecord.find({ clientOrgId: s.clientOrgId, status: 'UNPAID' }, { number: 1, totals: 1 })
      .setOptions(BILL)
      .lean();
    const steps = await DunningRecord.find(
      { clientOrgId: s.clientOrgId, episode: new Date(/** @type {any} */ (s.pastDueSince ?? 0)).toISOString() },
      { step: 1, at: 1 },
    )
      .setOptions(BILL)
      .lean();
    out.push({
      clientOrgId: s.clientOrgId,
      status: s.status,
      pastDueSince: s.pastDueSince,
      unpaidPaise: unpaid.reduce((a, i) => a + (i.totals?.totalPaise ?? 0), 0),
      invoices: unpaid.map((i) => i.number),
      steps: steps.map((x) => x.step).sort((a, b) => a - b),
    });
  }
  return out;
}
