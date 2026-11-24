// @ts-check
/** Dunning — pure (plan Stage 13 §3.9): reminders on day 0, 3 and 7 past due; suspended on day 10. */
export const DUNNING_STEPS = /** @type {const} */ ([
  { day: 0, action: 'REMIND' },
  { day: 3, action: 'REMIND' },
  { day: 7, action: 'REMIND' },
  { day: 10, action: 'SUSPEND' },
]);
const DAY_MS = 86_400_000;

/** Steps due by now for a past-due episode. @param {Date} pastDueSince @param {Date} now */
export const dunningStepsDue = (pastDueSince, now) => DUNNING_STEPS.filter((s) => now.getTime() - pastDueSince.getTime() >= s.day * DAY_MS);
