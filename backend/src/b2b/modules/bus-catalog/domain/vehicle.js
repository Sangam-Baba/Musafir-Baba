// @ts-check
/**
 * Bus rules (plan Stage 18 B2) — pure: papers every bus needs (RC, permit, insurance, fitness) with expiry dates,
 * whether a bus can sell today (approved and every paper valid), which reminders are due (30 and 7 days before an
 * expiry, once each), and the review steps (draft → submitted → approved / changes requested; suspended by staff).
 */

export const PAPER_KINDS = /** @type {const} */ (['RC', 'PERMIT', 'INSURANCE', 'FITNESS']);
export const AMENITIES = /** @type {const} */ ([
  'AC',
  'WIFI',
  'CHARGING',
  'WATER',
  'BLANKET',
  'PILLOW',
  'READING_LIGHT',
  'CCTV',
  'GPS',
  'TOILET',
  'TV',
  'SNACKS',
  'EMERGENCY_EXIT',
  'FIRE_EXTINGUISHER',
]);
export const VEHICLE_STATUSES = /** @type {const} */ (['DRAFT', 'SUBMITTED', 'APPROVED', 'CHANGES_REQUESTED', 'SUSPENDED', 'RETIRED']);
export const REMINDER_DAYS = /** @type {const} */ ([30, 7]);

/** @typedef {{ kind: typeof PAPER_KINDS[number], fileId: string, number: string, expiresOn: string }} Paper */

/** Days from `today` to `day` (both YYYY-MM-DD). @param {string} today @param {string} day */
export const daysUntil = (today, day) => Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);

/** Kinds missing or expired on `today`. @param {Paper[]} papers @param {string} today */
export function paperProblems(papers, today) {
  return PAPER_KINDS.flatMap((kind) => {
    const p = papers.find((x) => x.kind === kind);
    if (!p) return [{ kind, code: 'PAPER_MISSING' }];
    return daysUntil(today, p.expiresOn) < 0 ? [{ kind, code: 'PAPER_EXPIRED' }] : [];
  });
}

/** May this bus be sold for trips today? @param {{ status: string, papers: Paper[] }} v @param {string} today */
export const sellable = (v, today) => v.status === 'APPROVED' && paperProblems(v.papers, today).length === 0;

/**
 * Reminders due now: for each paper, the smallest threshold reached (30 or 7 days) not yet sent; `expired` when past.
 * @param {Paper[]} papers @param {string} today @param {string[]} sent keys already sent (`RC:30`, `RC:expired`…)
 */
export function remindersDue(papers, today, sent) {
  /** @type {{ key: string, kind: string, days: number }[]} */
  const out = [];
  for (const p of papers) {
    const left = daysUntil(today, p.expiresOn);
    const key =
      left < 0
        ? `${p.kind}:${p.expiresOn}:expired`
        : REMINDER_DAYS.filter((d) => left <= d)
            .map((d) => `${p.kind}:${p.expiresOn}:${d}`)
            .pop();
    if (key && !sent.includes(key)) out.push({ key, kind: p.kind, days: left });
  }
  return out;
}

/** Allowed review moves. */
export const REVIEW_MOVES = /** @type {const} */ ({
  submit: { from: ['DRAFT', 'CHANGES_REQUESTED'], to: 'SUBMITTED' },
  approve: { from: ['SUBMITTED'], to: 'APPROVED' },
  requestChanges: { from: ['SUBMITTED'], to: 'CHANGES_REQUESTED' },
  suspend: { from: ['APPROVED'], to: 'SUSPENDED' },
  reinstate: { from: ['SUSPENDED'], to: 'APPROVED' },
  retire: { from: ['DRAFT', 'SUBMITTED', 'APPROVED', 'CHANGES_REQUESTED', 'SUSPENDED'], to: 'RETIRED' },
});
