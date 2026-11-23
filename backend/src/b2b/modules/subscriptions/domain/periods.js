// @ts-check
/**
 * Billing periods — pure (plan Stage 13 §3.2, §6): a period is a calendar month in India (`YYYY-MM`), the same months
 * usage is counted in. Mid-month changes are prorated by days: the share of the month left from a moment.
 */
const IST_MS = 330 * 60_000;
const DAY_MS = 86_400_000;

/** `YYYY-MM` in India. @param {Date} at */
export const monthOf = (at) => new Date(at.getTime() + IST_MS).toISOString().slice(0, 7);

/** Midnight (India) starting a month, as an instant. @param {string} month YYYY-MM */
export const monthStart = (month) => new Date(Date.parse(`${month}-01T00:00:00Z`) - IST_MS);

/** The month after. @param {string} month */
export function nextMonth(month) {
  const [y = 1970, m = 1] = month.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

/** Days in a month. @param {string} month */
export const daysIn = (month) => Math.round((monthStart(nextMonth(month)).getTime() - monthStart(month).getTime()) / DAY_MS);

/**
 * Whole days left in the month from `at` (today counts), and the month's days.
 * @param {Date} at
 */
export function daysLeft(at) {
  const month = monthOf(at);
  const total = daysIn(month);
  const dayIndex = Math.floor((at.getTime() - monthStart(month).getTime()) / DAY_MS); // 0 = the 1st
  return { month, left: total - dayIndex, total };
}

/** `amount × left / total`, rounded to the paisa (or query). @param {number} amount @param {number} left @param {number} total */
export const prorate = (amount, left, total) => Math.round((amount * left) / total);
