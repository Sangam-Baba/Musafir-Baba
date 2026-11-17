// @ts-check
/**
 * Availability (S04-T07, plan §9 "availability property test vs naive reference"): random calendars, plans,
 * restrictions and stays; the real code (pure rules, and the database path with the §4 aggregation) must give
 * exactly what a deliberately simple reference written here gives.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import {
  createAvailabilityService,
  evaluate,
  INVENTORY_DAYS_COLLECTION,
  nights,
  RATE_DAYS_COLLECTION,
  RATE_PLANS_COLLECTION,
} from '../../src/b2b/modules/hotel-inventory/index.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { startMongo } from './helpers/mongo.js';

const clock = { now: () => new Date('2026-11-17T10:00:00Z') }; // 17 Nov in India
const TODAY = '2026-11-17';
const DATES = nights('2026-11-14', '2026-12-06');
const ORG = '64b0000000000000000000aa';

/** Small seeded random numbers (repeatable failures). @param {number} seed */
function rng(seed) {
  let a = seed;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (/** @type {number} */ lo, /** @type {number} */ hi) => lo + Math.floor(next() * (hi - lo + 1)),
    chance: (/** @type {number} */ p) => next() < p,
  };
}

/** @typedef {ReturnType<typeof rng>} Rng */

/** @param {Rng} r @param {string} pid */
function randomRoomTypes(r, pid) {
  return ['a', 'b'].map((k) => {
    const maxAdults = r.int(2, 3);
    const maxChildren = r.int(0, 2);
    return { id: `${pid}-rt-${k}`, maxAdults, maxChildren, maxOccupancy: r.int(maxAdults, maxAdults + maxChildren) };
  });
}

/** @param {Rng} r @param {string} pid @param {string[]} ids @param {string} id */
function randomPlan(r, pid, ids, id) {
  return {
    id,
    propertyId: pid,
    name: id,
    mealPlanKey: 'ep',
    roomTypeIds: r.chance(0.8) ? ids : [/** @type {string} */ (ids[r.int(0, 1)])],
    pricingModel: r.chance(0.5) ? 'PER_OCCUPANCY' : 'PER_ROOM',
    minAdvanceDays: r.chance(0.2) ? r.int(0, 6) : 0,
    maxAdvanceDays: r.chance(0.2) ? r.int(3, 20) : 365,
    status: r.chance(0.85) ? 'ACTIVE' : 'INACTIVE',
    /** @type {any} */ derived: null,
  };
}

/** @param {Rng} r */
const randomAdjust = (r) =>
  r.chance(0.5) ? { type: 'AMOUNT', value: r.int(-50000, 80000) || 1000 } : { type: 'PERCENT', value: r.int(-30, 40) || 5 };

/** @param {Rng} r @param {string} pid @param {string} roomTypeId @param {string} date */
function randomNight(r, pid, roomTypeId, date) {
  const total = r.int(0, 6);
  const booked = r.chance(0.5) ? 0 : r.int(0, total);
  const held = r.chance(0.7) ? 0 : r.int(0, total - booked);
  const holds = held ? [{ holdId: 'h', qty: held, expiresAt: new Date() }] : [];
  const bookings = booked ? [{ bookingId: 'b', qty: booked }] : [];
  return { hotelOrgId: ORG, propertyId: pid, roomTypeId, date, total, booked, held, stopSell: r.chance(0.03), holds, bookings };
}

/** @param {Rng} r @param {any} plan @param {{ id: string, maxOccupancy: number }} rt @param {string} date */
function randomRateNight(r, plan, rt, date) {
  const keys = plan.pricingModel === 'PER_ROOM' ? [0] : Array.from({ length: rt.maxOccupancy }, (_, i) => i + 1);
  const prices = plan.derived ? [] : keys.filter(() => r.chance(0.97)).map((g) => ({ guests: g, amount: r.int(100, 900) * 1000 }));
  return {
    hotelOrgId: ORG,
    propertyId: plan.propertyId,
    ratePlanId: plan.id,
    roomTypeId: rt.id,
    date,
    prices,
    minLos: r.chance(0.08) ? r.int(1, 4) : null,
    maxLos: r.chance(0.05) ? r.int(1, 6) : null,
    closedToArrival: r.chance(0.03),
    closedToDeparture: r.chance(0.03),
    stopSell: r.chance(0.02),
  };
}

/** A random property: room types, plans (one maybe derived), nights and rate nights. @param {Rng} r @param {string} pid */
function world(r, pid) {
  const roomTypes = randomRoomTypes(r, pid);
  const ids = roomTypes.map((x) => x.id);
  const p1 = randomPlan(r, pid, ids, `${pid}-p1`);
  const p2 = randomPlan(r, pid, ids, `${pid}-p2`);
  const plans = [p1, p2];
  if (r.chance(0.6))
    plans.push({
      ...randomPlan(r, pid, ids, `${pid}-p3`),
      pricingModel: p1.pricingModel,
      roomTypeIds: p1.roomTypeIds,
      derived: { parentRatePlanId: p1.id, adjust: randomAdjust(r) },
    });
  const nightDocs = [];
  const rateDocs = [];
  for (const rt of roomTypes)
    for (const date of DATES) {
      if (r.chance(0.95)) nightDocs.push(randomNight(r, pid, rt.id, date));
      for (const plan of plans) if (plan.roomTypeIds.includes(rt.id) && !r.chance(0.02)) rateDocs.push(randomRateNight(r, plan, rt, date));
    }
  return { roomTypes, plans, nightDocs, rateDocs };
}

/** A random stay. @param {Rng} r */
function query(r) {
  const start = r.int(0, DATES.length - 6);
  const checkIn = /** @type {string} */ (DATES[start]);
  const checkOut = /** @type {string} */ (DATES[start + r.int(1, 5)]);
  const groups = Array.from({ length: r.chance(0.7) ? 1 : r.int(2, 3) }, () => ({
    adults: r.int(1, 2),
    children: r.chance(0.7) ? 0 : r.int(1, 2),
  }));
  return { checkIn, checkOut, groups };
}

// ---- the deliberately simple reference (plain loops; shares no code with the module) ----

/** @typedef {ReturnType<typeof world>} World */
/** @typedef {ReturnType<typeof query>} Query */

/** @param {World} w @param {string} pl @param {string} rt @param {string} d */
const storedNight = (w, pl, rt, d) => w.rateDocs.find((x) => x.ratePlanId === pl && x.roomTypeId === rt && x.date === d) ?? null;

/** Rooms free on every night, or -1 when a night is missing or stopped. @param {World} w @param {string} rt @param {string[]} stay */
function refFree(w, rt, stay) {
  let free = Infinity;
  for (const d of stay) {
    const n = w.nightDocs.find((x) => x.roomTypeId === rt && x.date === d);
    if (!n || n.stopSell) return -1;
    free = Math.min(free, n.total - n.booked - n.held);
  }
  return free;
}

/** @param {any} own */
const ownDay = (own) => ({
  prices: own?.prices ?? [],
  minLos: own?.minLos ?? null,
  maxLos: own?.maxLos ?? null,
  cta: own?.closedToArrival ?? false,
  ctd: own?.closedToDeparture ?? false,
  stop: own?.stopSell ?? false,
});

/** @param {number | null} a @param {number | null} b @param {(x: number, y: number) => number} pick */
const either = (a, b, pick) => (a === null ? b : b === null ? a : pick(a, b));

/** @param {any} ownRaw @param {any} parRaw @param {{ type: string, value: number }} adj */
function derivedDay(ownRaw, parRaw, adj) {
  const own = ownDay(ownRaw);
  const par = ownDay(parRaw);
  const move = (/** @type {number} */ a) =>
    Math.max(100, adj.type === 'AMOUNT' ? a + adj.value : Math.round((a * (100 + adj.value)) / 100));
  return {
    prices: par.prices.map((/** @type {any} */ p) => ({ guests: p.guests, amount: move(p.amount) })),
    minLos: either(own.minLos, par.minLos, Math.max),
    maxLos: either(own.maxLos, par.maxLos, Math.min),
    cta: own.cta || par.cta,
    ctd: own.ctd || par.ctd,
    stop: own.stop || par.stop,
  };
}

/** @param {World} w @param {any} plan @param {string} rt @param {string} d */
function refDay(w, plan, rt, d) {
  const own = storedNight(w, plan.id, rt, d);
  return plan.derived ? derivedDay(own, storedNight(w, plan.derived.parentRatePlanId, rt, d), plan.derived.adjust) : ownDay(own);
}

/** @param {World} w @param {Query} q @param {any} plan @param {{ rt: string, stay: string[], free: number }} x */
function refOffer(w, q, plan, x) {
  const days = x.stay.map((d) => refDay(w, plan, x.rt, d));
  const first = /** @type {any} */ (days[0]);
  if (days.some((d) => d.stop) || first.cta || refDay(w, plan, x.rt, q.checkOut).ctd) return null;
  if (first.minLos !== null && x.stay.length < first.minLos) return null;
  if (first.maxLos !== null && x.stay.length > first.maxLos) return null;
  const key = (/** @type {{ adults: number, children: number }} */ g) => (plan.pricingModel === 'PER_ROOM' ? 0 : g.adults + g.children);
  const nightly = x.stay.map((date, i) => ({
    date,
    amounts: q.groups.map((g) => /** @type {any} */ (days[i]).prices.find((/** @type {any} */ p) => p.guests === key(g))?.amount ?? null),
  }));
  if (nightly.some((n) => n.amounts.includes(null))) return null;
  const totalNet = nightly.reduce((s, n) => s + n.amounts.reduce((a, b) => a + b, 0), 0);
  return { roomTypeId: x.rt, ratePlanId: plan.id, mealPlanKey: 'ep', available: x.free, nightly, totalNet };
}

/** @param {World} w @param {Query} q */
function reference(w, q) {
  const stay = DATES.slice(DATES.indexOf(q.checkIn), DATES.indexOf(q.checkOut));
  if (q.checkIn < TODAY) return [];
  const ahead = DATES.indexOf(q.checkIn) - DATES.indexOf(TODAY);
  const out = [];
  for (const rt of w.roomTypes) {
    if (!q.groups.every((g) => g.adults <= rt.maxAdults && g.children <= rt.maxChildren && g.adults + g.children <= rt.maxOccupancy))
      continue;
    const free = refFree(w, rt.id, stay);
    if (free < q.groups.length) continue;
    for (const plan of w.plans) {
      if (plan.status !== 'ACTIVE' || !plan.roomTypeIds.includes(rt.id) || ahead < plan.minAdvanceDays || ahead > plan.maxAdvanceDays)
        continue;
      const offer = refOffer(w, q, plan, { rt: rt.id, stay, free });
      if (offer) out.push(offer);
    }
  }
  return out;
}

describe('availability matches a simple reference', () => {
  it('pure rules — 400 random calendars and stays', () => {
    let sellable = 0;
    for (let seed = 1; seed <= 400; seed += 1) {
      const r = rng(seed);
      const w = world(r, 'p');
      const q = query(r);
      const expected = reference(w, q);
      sellable += expected.length;
      const got = evaluate({
        stay: nights(q.checkIn, q.checkOut),
        checkOut: q.checkOut,
        today: TODAY,
        groups: q.groups,
        roomTypes: w.roomTypes,
        plans: w.plans,
        nightOf: (rt, d) => w.nightDocs.find((x) => x.roomTypeId === rt && x.date === d) ?? null,
        storedDay: (pl, rt, d) =>
          /** @type {any} */ (w.rateDocs.find((x) => x.ratePlanId === pl && x.roomTypeId === rt && x.date === d) ?? null),
      });
      expect(got, `seed ${seed}`).toEqual(expected);
    }
    expect(sellable).toBeGreaterThan(150); // the generator really produces sellable stays, not only refusals
  });
});

describe('the database path (aggregation + rules)', () => {
  /** @type {Awaited<ReturnType<typeof startMongo>>} */
  let mongo;
  beforeAll(async () => {
    mongo = await startMongo();
    await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  });
  afterAll(async () => mongo.stop());

  it('30 random calendars across two properties give the reference result', async () => {
    const service = createAvailabilityService({ clock });
    let sellable = 0;
    for (let seed = 1001; seed <= 1030; seed += 1) {
      const r = rng(seed);
      const worlds = [world(r, `x${seed}`), world(r, `y${seed}`)];
      for (const w of worlds) {
        await mongo.db.collection(INVENTORY_DAYS_COLLECTION).insertMany(w.nightDocs);
        if (w.rateDocs.length) await mongo.db.collection(RATE_DAYS_COLLECTION).insertMany(w.rateDocs);
        await mongo.db.collection(RATE_PLANS_COLLECTION).insertMany(
          w.plans.map(({ id, ...p }) => ({
            ...p,
            _id: /** @type {any} */ (id),
            hotelOrgId: ORG,
            nameKey: id,
            cancellationPolicyId: 'c',
            createdBy: 't',
            updatedBy: 't',
            version: 1,
            order: 100,
          })),
        );
      }
      const q = query(r);
      const got = await service.checkAvailability({
        ...q,
        properties: worlds.map((w, i) => ({ id: i ? `y${seed}` : `x${seed}`, timeZone: 'Asia/Kolkata', roomTypes: w.roomTypes })),
      });
      expect(got, `seed ${seed}`).toEqual(worlds.map((w, i) => ({ propertyId: i ? `y${seed}` : `x${seed}`, offers: reference(w, q) })));
      sellable += got.reduce((n, p) => n + p.offers.length, 0);
    }
    expect(sellable).toBeGreaterThan(15);
  });

  it('refuses stays longer than 30 nights, empty or wrong-way stays, and more than 9 rooms', async () => {
    const service = createAvailabilityService({ clock });
    const base = { properties: [], groups: [{ adults: 1, children: 0 }] };
    await expect(service.checkAvailability({ ...base, checkIn: '2026-12-01', checkOut: '2027-01-15' })).rejects.toMatchObject({
      code: 'DATE_RANGE_TOO_LONG',
    });
    await expect(service.checkAvailability({ ...base, checkIn: '2026-12-02', checkOut: '2026-12-01' })).rejects.toMatchObject({
      code: 'DATE_RANGE_EMPTY',
    });
    await expect(
      service.checkAvailability({
        ...base,
        checkIn: '2026-12-01',
        checkOut: '2026-12-02',
        groups: Array(10).fill({ adults: 1, children: 0 }),
      }),
    ).rejects.toMatchObject({ code: 'ROOMS_OUT_OF_RANGE' });
  });
});
