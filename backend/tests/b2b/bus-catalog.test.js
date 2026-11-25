// @ts-check
/**
 * Buses, seat layouts, papers and review (S18-T05).
 * - layouts: every template is valid; problems found at once (repeated / bad seat numbers, overlap, outside the grid,
 *   span only for sleepers, 1–2 decks, seat count); a layout used by a submitted / approved bus is locked; copy works;
 * - buses: registration number normalised and unique across operators; papers need an uploaded `bus-paper` file;
 *   sending for approval needs a layout and all four valid papers; approve / changes requested (note) / suspend;
 *   changing the layout of an approved bus sends it back; sellable only when approved with valid papers;
 * - reminders: 30 and 7 days before expiry and on expiry, each once; another operator sees nothing.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import {
  checkLayout,
  createBusReview,
  createLayouts,
  createVehicles,
  LAYOUT_TEMPLATES,
  LayoutRecord,
  remindersDue,
  VehicleRecord,
} from '../../src/b2b/modules/bus-catalog/index.js';
import { startMongo } from './helpers/mongo.js';

let today = '2026-11-25';
const clock = { now: () => new Date(`${today}T06:30:00Z`) };
const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const OP = { orgId: '65f0000000000000000b1811', userId: '65f0000000000000000c1811' };
const OTHER = { orgId: '65f0000000000000000b1812', userId: '65f0000000000000000c1812' };
const files = {
  describe: async (/** @type {string} */ orgId, /** @type {string} */ id) =>
    id.startsWith('paper') && orgId === OP.orgId ? { purpose: 'bus-paper' } : id.startsWith('kyc') ? { purpose: 'kyc-document' } : null,
};
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
});
afterAll(async () => mongo.stop());
beforeEach(async () => {
  today = '2026-11-25';
  await LayoutRecord.deleteMany({}).setOptions(S);
  await VehicleRecord.deleteMany({}).setOptions(S);
});

const deps = { clock, today: () => today, files };
/** @param {ReturnType<typeof createVehicles>} v @param {any} bus */
async function allPapers(v, bus, expiresOn = '2027-06-30') {
  let b = bus;
  for (const kind of /** @type {const} */ (['RC', 'PERMIT', 'INSURANCE', 'FITNESS']))
    b = await v.setPaper(OP, b.id, { kind, fileId: `paper-${kind}`, number: `${kind}-123`, expiresOn, expectedVersion: b.version });
  return b;
}

describe('layouts (rules)', () => {
  it('templates valid; every problem found at once', () => {
    for (const [key, t] of Object.entries(LAYOUT_TEMPLATES)) expect(checkLayout(t.build()), key).toEqual([]);
    const codes = checkLayout({
      decks: [
        {
          deck: 'LOWER',
          rows: 2,
          cols: 3,
          seats: [
            { no: '1', row: 0, col: 0, type: 'SEATER' },
            { no: '1', row: 0, col: 1, type: 'SEATER' },
            { no: 'x!', row: 1, col: 0, type: 'SEATER' },
            { no: '2', row: 0, col: 0, type: 'SEATER' },
            { no: '3', row: 5, col: 0, type: 'SEATER' },
            { no: '4', row: 1, col: 1, type: 'SEATER', span: 2 },
          ],
        },
      ],
    }).map((p) => p.code);
    expect(codes).toEqual(
      expect.arrayContaining(['SEAT_NUMBER_REPEATED', 'SEAT_NUMBER_INVALID', 'SEATS_OVERLAP', 'SEAT_OUTSIDE_GRID', 'ONLY_SLEEPERS_SPAN']),
    );
    expect(checkLayout({ decks: [] }).map((p) => p.code)).toEqual(expect.arrayContaining(['DECKS_ONE_OR_TWO', 'SEAT_COUNT_INVALID']));
  });
});

describe('buses', () => {
  it('layout from a template → bus → papers → approval; locked layout; copy; other operator sees nothing', async () => {
    const layouts = createLayouts();
    const vehicles = createVehicles(deps);
    const review = createBusReview(deps);
    const layout = await layouts.create(OP, { name: 'Volvo 2+1 sleeper', template: 'sleeper-2x1-30' });
    expect(layout).toMatchObject({ seatCount: 30, deckCount: 2, types: ['SLEEPER'] });
    let bus = await vehicles.create(OP, {
      regNo: 'rj 14-pa 1234',
      name: 'Shree Express 1',
      acType: 'AC',
      kind: 'SLEEPER',
      layoutId: layout.id,
      amenities: ['AC', 'CHARGING', 'BLANKET'],
    });
    expect(bus).toMatchObject({ regNo: 'RJ14PA1234', status: 'DRAFT', sellable: false });
    await expect(vehicles.create(OTHER, { regNo: 'RJ14PA1234', acType: 'AC', kind: 'SLEEPER' })).rejects.toMatchObject({
      code: 'BUS_ALREADY_LISTED',
    });
    await expect(vehicles.create(OP, { regNo: 'NOT-A-PLATE', acType: 'AC', kind: 'SLEEPER' })).rejects.toMatchObject({
      code: 'REG_NO_INVALID',
    });

    await expect(vehicles.submit(OP, bus.id, bus.version)).rejects.toMatchObject({ code: 'PAPERS_INCOMPLETE' });
    await expect(
      vehicles.setPaper(OP, bus.id, { kind: 'RC', fileId: 'kyc-1', number: 'x', expiresOn: '2027-01-01', expectedVersion: bus.version }),
    ).rejects.toMatchObject({ code: 'FILE_NOT_FOUND' });
    bus = await allPapers(vehicles, bus);
    bus = await vehicles.submit(OP, bus.id, bus.version);
    expect(bus.status).toBe('SUBMITTED');
    await expect(layouts.update(OP, layout.id, { name: 'renamed', expectedVersion: layout.version })).rejects.toMatchObject({
      code: 'LAYOUT_IN_USE',
    });
    expect((await layouts.copy(OP, layout.id, 'Volvo copy')).seatCount).toBe(30);

    const queue = await review.queue({});
    expect(queue).toEqual([
      expect.objectContaining({ regNo: 'RJ14PA1234', operatorOrgId: OP.orgId, layout: expect.objectContaining({ seatCount: 30 }) }),
    ]);
    await expect(review.decide('staff:s1', bus.id, 'requestChanges', null)).rejects.toMatchObject({ code: 'NOTE_REQUIRED' });
    expect(await review.decide('staff:s1', bus.id, 'approve', null)).toMatchObject({ status: 'APPROVED', sellable: true });
    await expect(review.decide('staff:s1', bus.id, 'approve', null)).rejects.toMatchObject({ code: 'BUS_STATUS_CHANGED' });

    const other = await layouts.create(OP, { name: '2+2', template: 'seater-2x2-40' });
    bus = await vehicles.get(OP.orgId, bus.id);
    expect((await vehicles.update(OP, bus.id, { layoutId: other.id, expectedVersion: bus.version })).status).toBe('SUBMITTED'); // seats changed → staff look again

    await expect(vehicles.get(OTHER.orgId, bus.id)).rejects.toMatchObject({ code: 'BUS_NOT_FOUND' });
    expect(await vehicles.list(OTHER.orgId)).toEqual([]);
    expect(await layouts.list(OTHER.orgId)).toEqual([]);
    const events = /** @type {any} */ (await VehicleRecord.findById(bus.id).setOptions(S).lean()).pendingEvents.map(
      (/** @type {any} */ e) => e.type,
    );
    expect(events).toEqual(['bus-catalog.vehicle.submitted', 'bus-catalog.vehicle.approved']);
  });

  it('papers expiring: reminders 30 / 7 days and on expiry, once each; an expired paper stops selling', async () => {
    expect(remindersDue([{ kind: 'RC', fileId: 'f', number: 'n', expiresOn: '2026-12-20' }], '2026-11-25', []).map((r) => r.key)).toEqual([
      'RC:2026-12-20:30',
    ]);
    const layouts = createLayouts();
    const vehicles = createVehicles(deps);
    const review = createBusReview(deps);
    const layout = await layouts.create(OP, { name: '2+2', template: 'seater-2x2-40' });
    let bus = await vehicles.create(OP, { regNo: 'DL1PC9999', acType: 'NON_AC', kind: 'SEATER', layoutId: layout.id });
    bus = await allPapers(vehicles, bus, '2026-12-20');
    bus = await vehicles.submit(OP, bus.id, bus.version);
    await review.decide('staff:s1', bus.id, 'approve', null);
    expect(await review.reminders()).toEqual({ sent: 4 }); // 25 days left → the 30-day reminder per paper
    expect(await review.reminders()).toEqual({ sent: 0 });
    today = '2026-12-14';
    expect(await review.reminders()).toEqual({ sent: 4 }); // 6 days → 7-day reminder
    today = '2026-12-21';
    expect(await review.reminders()).toEqual({ sent: 4 }); // expired
    expect((await vehicles.get(OP.orgId, bus.id)).sellable).toBe(false);
    expect(((await vehicles.get(OP.orgId, bus.id)).paperProblems ?? []).map((/** @type {any} */ p) => p.code)).toEqual([
      'PAPER_EXPIRED',
      'PAPER_EXPIRED',
      'PAPER_EXPIRED',
      'PAPER_EXPIRED',
    ]);
  });
});
