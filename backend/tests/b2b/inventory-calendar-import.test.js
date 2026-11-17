// @ts-check
/**
 * Calendar files (S04-T11): the CSV reader, the template, every problem listed with line and column (nothing
 * written), dry run, apply (repeat-safe, logged, undoable), rooms never below booked + held, > 50 % confirmation,
 * limits.
 */
import { describe, expect, it } from 'vitest';

import {
  CancellationPolicyRecord,
  ChangeLogRecord,
  InventoryDayRecord,
  parseCsv,
  RateDayRecord,
  RatePlanRecord,
  rupeesToPaise,
  toCsv,
} from '../../src/b2b/modules/hotel-inventory/index.js';
import { auth, SYSTEM, useInventoryApp } from './helpers/inventory-app.js';

const clock = { now: () => new Date('2026-11-17T10:00:00Z') };
const app = useInventoryApp({
  clock,
  models: [CancellationPolicyRecord, RatePlanRecord, InventoryDayRecord, RateDayRecord, ChangeLogRecord],
});

describe('the CSV reader', () => {
  it('quotes, doubled quotes, commas and line breaks inside quotes, CRLF, a leading BOM, blank lines', () => {
    expect(parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n\r\n"line\nbreak",2\n', 10)).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
      ['line\nbreak', '2'],
    ]);
    expect(() => parseCsv('a\n"open', 10)).toThrow(expect.objectContaining({ code: 'IMPORT_CSV_UNCLOSED_QUOTE' }));
    expect(() => parseCsv('h\n1\n2\n3\n', 2)).toThrow(expect.objectContaining({ code: 'IMPORT_TOO_MANY_ROWS' }));
  });

  it('written cells are quoted when needed and never start a spreadsheet formula; rupees → paise', () => {
    expect(toCsv([['=SUM(A1)', 'a,b', 'ok']])).toBe(`'=SUM(A1),"a,b",ok\r\n`);
    expect(['3500', '3500.5', '3500.05', '0.99', '35.123', '-1', '1e3'].map(rupeesToPaise)).toEqual([
      350000,
      350050,
      350005,
      99,
      null,
      null,
      null,
    ]);
  });
});

async function setup() {
  const h = await app.hotelWithProperty();
  const room = await app.roomType(h.token, h.propertyId);
  const policy = (
    await app.srv.post(
      `/api/v1/hotel/properties/${h.propertyId}/cancellation-policies`,
      { name: 'Flexible', nonRefundable: false, rules: [], noShow: { type: 'PERCENT', value: 100 } },
      auth(h.token),
    )
  ).body.id;
  const plan = { roomTypeIds: [room], cancellationPolicyId: policy, pricingModel: 'PER_OCCUPANCY', minAdvanceDays: 0, maxAdvanceDays: 365 };
  const plans = `/api/v1/hotel/properties/${h.propertyId}/rate-plans`;
  const ep = (await app.srv.post(plans, { ...plan, name: 'Room only', mealPlanKey: 'ep', derived: null }, auth(h.token))).body.id;
  const cp = (
    await app.srv.post(
      plans,
      { ...plan, name: 'Breakfast', mealPlanKey: 'cp', derived: { parentRatePlanId: ep, adjust: { type: 'AMOUNT', value: 50000 } } },
      auth(h.token),
    )
  ).body.id;
  const base = `/api/v1/hotel/properties/${h.propertyId}/calendar-imports`;
  /** @param {string} csv @param {string} [query] @param {string} [token] */
  const upload = async (csv, query = '', token = h.token) => {
    const res = await fetch(`${app.srv.base}${base}${query}`, {
      method: 'POST',
      headers: { ...auth(token), 'content-type': 'text/csv' },
      body: csv,
    });
    return { status: res.status, body: /** @type {any} */ (await res.json()) };
  };
  /** @param {string} date */
  const read = async (date) =>
    (await app.srv.get(`/api/v1/hotel/properties/${h.propertyId}/calendar?from=${date}&to=2026-12-31`, auth(h.token))).body.roomTypes[0];
  return { ...h, room, ep, cp, base, upload, read };
}

describe('importing a calendar file', () => {
  it("the template lists the property's room types and plans, with names for people", async () => {
    const s = await setup();
    const res = await fetch(`${app.srv.base}${s.base}/template`, { headers: auth(s.token) });
    const rows = parseCsv(await res.text(), 100);
    expect(res.headers.get('content-type')).toMatch(/^text\/csv/);
    expect(rows[0]).toEqual([
      'date',
      'room_type',
      'room_type_name',
      'rate_plan',
      'rate_plan_name',
      'rooms',
      'stop_sell',
      'price',
      'price_1',
      'price_2',
      'price_3',
      'min_stay',
      'max_stay',
      'closed_to_arrival',
      'closed_to_departure',
    ]);
    expect(rows.slice(1).map((r) => [r[2], r[4]])).toEqual([
      ['Deluxe', ''],
      ['Deluxe', 'Room only'],
      ['Deluxe', 'Breakfast'],
    ]);
  });

  it('a file with problems: every one listed with its line and column, nothing written', async () => {
    const s = await setup();
    const csv = ['date,room_type,rate_plan,rooms,price,price_2,min_stay,max_stay,colour', '2026-12-01,Deluxe,,5,,,,,'].join('\n');
    expect((await s.upload(csv)).body.errors).toEqual([{ line: 1, column: 'colour', code: 'COLUMN_UNKNOWN' }]);
    const bad = [
      'date,room_type,rate_plan,rooms,stop_sell,price,price_2,min_stay,max_stay',
      '2026-02-30,Deluxe,,5,,,,,',
      '2026-11-10,Deluxe,,5,,,,,',
      '2026-12-01,Suite,,5,,,,,',
      `2026-12-01,${s.room},Room only,,maybe,3000,,,`,
      `2026-12-01,Deluxe,Breakfast,,,,4000,,`,
      '2026-12-02,Deluxe,,1000,,,,,',
      '2026-12-03,Deluxe,Room only,,,,abc,5,2',
      '2026-12-04,Deluxe,,,,,,,',
      '2026-12-05,Deluxe,,4,,,,,',
      '2026-12-05,deluxe,,3,,,,,',
    ].join('\n');
    const res = await s.upload(bad, '?dryRun=false&requestId=file-0000001');
    expect(res.body).toMatchObject({ ok: false, dryRun: true, rows: 10 });
    expect(res.body.errors).toEqual([
      { line: 2, column: 'date', code: 'DATE_INVALID' },
      { line: 3, column: 'date', code: 'DATE_PAST' },
      { line: 4, column: 'room_type', code: 'ROOM_TYPE_UNKNOWN' },
      { line: 5, column: 'stop_sell', code: 'YES_NO_INVALID' },
      { line: 5, column: 'price', code: 'PRICE_COLUMN_NOT_FOR_PLAN' },
      { line: 6, column: 'price_2', code: 'PRICES_COME_FROM_PARENT' },
      { line: 7, column: 'rooms', code: 'ROOMS_INVALID' },
      { line: 8, column: 'price_2', code: 'PRICE_INVALID' },
      { line: 8, column: 'min_stay', code: 'STAY_LIMITS_ORDER' },
      { line: 9, column: '', code: 'NOTHING_TO_CHANGE' },
      { line: 11, column: '', code: 'ROW_REPEATED' },
    ]);
    expect(await ChangeLogRecord.countDocuments({}).setOptions(SYSTEM)).toBe(0);
    expect(await InventoryDayRecord.countDocuments({ total: { $gt: 0 } }).setOptions(SYSTEM)).toBe(0);
  });

  it('dry run says what would change; applying writes it, logs it once per request id, and can be undone', async () => {
    const s = await setup();
    const csv = [
      'date,room_type,rate_plan,rooms,stop_sell,price_1,price_2,min_stay',
      `2026-12-10,${s.room},,6,,,,`,
      `2026-12-10,${s.room},${s.ep},,,3000,3500.50,2`,
      `2026-12-11,Deluxe,Room only,,yes,3200,,`,
      `2026-12-11,Deluxe,Breakfast,,,,,3`,
    ].join('\r\n');
    const dry = await s.upload(csv);
    expect(dry.body).toEqual({ dryRun: true, ok: true, rows: 4, roomNights: 1, rateNights: 3, refused: [], warnings: [], errors: [] });
    expect((await s.read('2026-12-10')).nights[0].total).toBe(0);
    const applied = await s.upload(csv, '?dryRun=false&requestId=file-0000002');
    expect(applied.body).toMatchObject({ dryRun: false, changeId: expect.any(String), roomNights: 1, rateNights: 3 });
    expect((await s.upload(csv, '?dryRun=false&requestId=file-0000002')).body.changeId).toBe(applied.body.changeId);
    const rt = await s.read('2026-12-10');
    const ep = rt.ratePlans.find((/** @type {any} */ p) => p.id === s.ep);
    const cp = rt.ratePlans.find((/** @type {any} */ p) => p.id === s.cp);
    expect([rt.nights[0].total, ep.days[0].prices, ep.days[0].minLos, ep.days[1].stopSell, cp.days[1].minLos, cp.days[1].prices]).toEqual([
      6,
      [
        { guests: 1, amount: 300000 },
        { guests: 2, amount: 350050 },
      ],
      2,
      true,
      3,
      [{ guests: 1, amount: 370000 }],
    ]);
    const history = (await app.srv.get(`/api/v1/hotel/properties/${s.propertyId}/calendar/changes`, auth(s.token))).body.data;
    expect(history[0]).toMatchObject({ id: applied.body.changeId, kind: 'IMPORT', from: '2026-12-10', to: '2026-12-12' });
    await app.srv.post(`/api/v1/hotel/properties/${s.propertyId}/calendar/undo`, { changeId: applied.body.changeId }, auth(s.token));
    const undone = await s.read('2026-12-10');
    expect([undone.nights[0].total, undone.ratePlans.find((/** @type {any} */ p) => p.id === s.ep).days[0].prices]).toEqual([0, []]);
  });

  it('rooms never below booked + held (listed); > 50 % price moves need confirming; applying needs a request id', async () => {
    const s = await setup();
    await s.upload(
      `date,room_type,rate_plan,rooms,price_1\n2026-12-20,${s.room},,4,\n2026-12-20,${s.room},${s.ep},,1000`,
      '?dryRun=false&requestId=file-0000003',
    );
    await InventoryDayRecord.updateOne(
      { roomTypeId: s.room, date: '2026-12-20' },
      { $set: { booked: 3, bookings: [{ bookingId: 'b', qty: 3 }] } },
    ).setOptions(SYSTEM);
    const csv = `date,room_type,rate_plan,rooms,stop_sell,price_1\n2026-12-20,${s.room},,1,yes,\n2026-12-20,${s.room},${s.ep},,,5000`;
    expect((await s.upload(csv, '?dryRun=false')).body.code).toBe('IMPORT_REQUEST_ID_REQUIRED');
    const big = await s.upload(csv, '?dryRun=false&requestId=file-0000004');
    expect([big.status, big.body.code]).toEqual([409, 'BIG_PRICE_CHANGE']);
    const ok = await s.upload(csv, '?dryRun=false&requestId=file-0000004&confirmBigChange=true');
    expect(ok.body.refused).toEqual([{ roomTypeId: s.room, date: '2026-12-20', booked: 3, held: 0 }]);
    const n = (await s.read('2026-12-20')).nights[0];
    expect([n.total, n.stopSell]).toEqual([4, true]); // rooms kept (booked), stop-sell applied
  });

  it("follows the property's limits", async () => {
    const s = await setup();
    const desk = await app.staff(s.orgId, 'desk@seaview.in', 'hotel.frontDesk');
    expect((await s.upload('date,room_type,rooms\n2026-12-01,Deluxe,1', '', desk)).status).toBe(403);
    const stranger = await app.hotelWithProperty('owner@hill.in');
    expect((await s.upload('date,room_type,rooms\n2026-12-01,Deluxe,1', '', stranger.token)).status).toBe(404);
  });
});
