// @ts-check
/**
 * Calendar file rows → changes (plan Stage 04 §3.7). Pure. One row = one night of one room type, optionally of one
 * rate plan. A blank cell = no change. Columns (header row, any order, case-insensitive):
 *   date, room_type (id or name), rate_plan (id or name, optional), rooms, stop_sell, price (per-room plans) or
 *   price_1 … price_30 (per number of guests), min_stay, max_stay, closed_to_arrival, closed_to_departure;
 *   columns ending in `_name` and `note` are ignored (the template fills them in for people).
 * `rooms` changes the room type's night; `stop_sell` stops the plan when a plan is given, otherwise the room type.
 * Amounts are rupees (up to 2 decimals) → paise. Every problem is listed with its line and column.
 */
import { priceKeys } from './rate-day.js';

export const MAX_IMPORT_ROWS = 50_000;
export const MAX_IMPORT_ERRORS = 1000;
const KNOWN = new Set([
  'date',
  'room_type',
  'rate_plan',
  'rooms',
  'stop_sell',
  'price',
  'min_stay',
  'max_stay',
  'closed_to_arrival',
  'closed_to_departure',
]);
const PRICE_N = /^price_(\d{1,2})$/;
const TRUE = new Set(['yes', 'y', 'true', '1']);
const FALSE = new Set(['no', 'n', 'false', '0']);

/** @typedef {{ line: number, column: string, code: string }} RowError */
/** @typedef {{ roomTypeId: string, date: string, total?: number, stopSell?: boolean }} RoomCell */
/** @typedef {import('./bulk-edit.js').RateChange & { date: string }} RateCell */
/** @typedef {{ id: string, name: string, maxOccupancy: number }} RoomTypeRef */
/** @typedef {{ id: string, name: string, pricingModel: string, derived: unknown, roomTypeIds: string[] }} PlanRef */

/** Rupees text → paise, or null. @param {string} s */
export function rupeesToPaise(s) {
  const m = /^(\d{1,8})(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? '0').padEnd(2, '0'));
}

/** @param {string} s @returns {boolean | null | undefined} undefined = not a yes / no */
function yesNo(s) {
  const v = s.toLowerCase();
  if (TRUE.has(v)) return true;
  if (FALSE.has(v)) return false;
  return undefined;
}

/** @param {string} s @param {number} min @param {number} max */
const intIn = (s, min, max) => (/^\d{1,4}$/.test(s) && Number(s) >= min && Number(s) <= max ? Number(s) : null);

/** Header problems and the column positions. @param {string[]} header */
export function readHeader(header) {
  const cols = header.map((h) => h.trim().toLowerCase());
  /** @type {RowError[]} */
  const errors = [];
  cols.forEach((c) => {
    const ignored = c.endsWith('_name') || c === 'note' || c === '';
    const price = PRICE_N.exec(c);
    if (!ignored && !KNOWN.has(c) && !(price && Number(price[1]) >= 1 && Number(price[1]) <= 30))
      errors.push({ line: 1, column: c, code: 'COLUMN_UNKNOWN' });
  });
  for (const req of ['date', 'room_type']) if (!cols.includes(req)) errors.push({ line: 1, column: req, code: 'COLUMN_MISSING' });
  if (new Set(cols.filter((c) => c)).size !== cols.filter((c) => c).length) errors.push({ line: 1, column: '', code: 'COLUMN_REPEATED' });
  return { cols, errors };
}

/** @param {string} ref @param {{ id: string, name: string }[]} list */
const find = (ref, list) => list.find((x) => x.id === ref) ?? list.find((x) => x.name.trim().toLowerCase() === ref.trim().toLowerCase());

/** Prices of a row. @param {Record<string, string>} cell @param {PlanRef | undefined} plan @param {RoomTypeRef} rt @param {(c: string, code: string) => void} err */
function rowPrices(cell, plan, rt, err) {
  const priced = Object.entries(cell).filter(([c, v]) => (c === 'price' || PRICE_N.test(c)) && v !== '');
  if (priced.length === 0) return undefined;
  if (!plan) return void err(/** @type {string} */ (priced[0]?.[0]), 'RATE_PLAN_REQUIRED');
  if (plan.derived) return void err(/** @type {string} */ (priced[0]?.[0]), 'PRICES_COME_FROM_PARENT');
  const keys = priceKeys(plan, rt);
  const prices = [];
  for (const [c, v] of priced) {
    const guests = c === 'price' ? 0 : Number(PRICE_N.exec(c)?.[1]);
    const amount = rupeesToPaise(v);
    if (!keys.includes(guests)) err(c, 'PRICE_COLUMN_NOT_FOR_PLAN');
    else if (amount === null || amount < 100) err(c, 'PRICE_INVALID');
    else prices.push({ guests, amount });
  }
  return prices;
}

/** Plan rules of a row. @param {Record<string, string>} cell @param {PlanRef | undefined} plan @param {(c: string, code: string) => void} err */
function rowRules(cell, plan, err) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [col, key] of [
    ['min_stay', 'minLos'],
    ['max_stay', 'maxLos'],
  ]) {
    const v = cell[/** @type {string} */ (col)] ?? '';
    if (v === '') continue;
    const n = intIn(v, 1, 30);
    if (n === null) err(/** @type {string} */ (col), 'STAY_INVALID');
    else out[/** @type {string} */ (key)] = n;
  }
  for (const [col, key] of [
    ['closed_to_arrival', 'closedToArrival'],
    ['closed_to_departure', 'closedToDeparture'],
  ]) {
    const v = cell[/** @type {string} */ (col)] ?? '';
    if (v === '') continue;
    const b = yesNo(v);
    if (b === undefined) err(/** @type {string} */ (col), 'YES_NO_INVALID');
    else out[/** @type {string} */ (key)] = b;
  }
  if (typeof out.minLos === 'number' && typeof out.maxLos === 'number' && out.minLos > out.maxLos) err('min_stay', 'STAY_LIMITS_ORDER');
  if (Object.keys(out).length > 0 && !plan) err('rate_plan', 'RATE_PLAN_REQUIRED');
  return out;
}

/** The room type's night (rooms, stop-sell without a plan). @param {Record<string, string>} cell @param {boolean} hasPlan @param {(c: string, code: string) => void} err */
function rowRooms(cell, hasPlan, err) {
  /** @type {{ total?: number, stopSell?: boolean }} */
  const out = {};
  if ((cell.rooms ?? '') !== '') {
    const n = intIn(cell.rooms ?? '', 0, 999);
    if (n === null) err('rooms', 'ROOMS_INVALID');
    else out.total = n;
  }
  const stop = cell.stop_sell ?? '';
  if (stop !== '' && yesNo(stop) === undefined) err('stop_sell', 'YES_NO_INVALID');
  if (stop !== '' && !hasPlan && yesNo(stop) !== undefined) out.stopSell = /** @type {boolean} */ (yesNo(stop));
  return out;
}

/** @typedef {{ cols: string[], rows: string[][], roomTypes: RoomTypeRef[], plans: PlanRef[], today: string, windowEnd: string, isDate: (d: string) => boolean }} ReadInput */

/**
 * Which night the row is about, or the problem. @param {Record<string, string>} cell @param {ReadInput} a
 * @returns {{ date: string, rt: RoomTypeRef, plan: PlanRef | undefined } | { column: string, code: string }}
 */
function locate(cell, a) {
  const date = cell.date ?? '';
  if (!a.isDate(date)) return { column: 'date', code: 'DATE_INVALID' };
  if (date < a.today) return { column: 'date', code: 'DATE_PAST' };
  if (date > a.windowEnd) return { column: 'date', code: 'DATE_BEYOND_WINDOW' };
  const rt = /** @type {RoomTypeRef | undefined} */ (find(cell.room_type ?? '', a.roomTypes));
  if (!rt) return { column: 'room_type', code: 'ROOM_TYPE_UNKNOWN' };
  const ref = cell.rate_plan ?? '';
  const plan = /** @type {PlanRef | undefined} */ (ref ? find(ref, a.plans) : undefined);
  if (ref && !plan) return { column: 'rate_plan', code: 'RATE_PLAN_UNKNOWN' };
  if (plan && !plan.roomTypeIds.includes(rt.id)) return { column: 'rate_plan', code: 'ROOM_TYPE_NOT_IN_PLAN' };
  return { date, rt, plan };
}

/** The changes of a located row. @param {Record<string, string>} cell @param {RoomTypeRef} rt @param {PlanRef | undefined} plan @param {(c: string, code: string) => void} err */
function changesOf(cell, rt, plan, err) {
  const roomPart = rowRooms(cell, Boolean(plan), err);
  const prices = rowPrices(cell, plan, rt, err);
  const rules = rowRules(cell, plan, err);
  const stop = yesNo(cell.stop_sell ?? '');
  if (plan && stop !== undefined && stop !== null) rules.stopSell = stop;
  return { roomPart, ratePart: { ...rules, ...(prices && prices.length ? { prices } : {}) } };
}

/** @param {ReadInput} a */
export function readRows(a) {
  /** @type {RowError[]} */
  const errors = [];
  /** @type {RoomCell[]} */
  const rooms = [];
  /** @type {RateCell[]} */
  const rates = [];
  const seen = new Set();
  a.rows.forEach((raw, i) => {
    const line = i + 2;
    const err = (/** @type {string} */ column, /** @type {string} */ code) =>
      void (errors.length < MAX_IMPORT_ERRORS && errors.push({ line, column, code }));
    const cell = Object.fromEntries(a.cols.map((c, j) => [c, (raw[j] ?? '').trim()]));
    const at = locate(cell, a);
    if ('code' in at) return err(at.column, at.code);
    const before = errors.length;
    const { roomPart, ratePart } = changesOf(cell, at.rt, at.plan, err);
    if (errors.length > before) return undefined;
    const keys = [];
    if (Object.keys(roomPart).length) keys.push(`room|${at.rt.id}|${at.date}`);
    if (at.plan && Object.keys(ratePart).length) keys.push(`rate|${at.plan.id}|${at.rt.id}|${at.date}`);
    if (keys.length === 0) return err('', 'NOTHING_TO_CHANGE');
    if (keys.some((k) => seen.has(k))) return err('', 'ROW_REPEATED');
    keys.forEach((k) => seen.add(k));
    if (Object.keys(roomPart).length) rooms.push({ roomTypeId: at.rt.id, date: at.date, ...roomPart });
    if (at.plan && Object.keys(ratePart).length) rates.push({ ratePlanId: at.plan.id, roomTypeId: at.rt.id, date: at.date, ...ratePart });
    return undefined;
  });
  return { errors, rooms, rates };
}
