// @ts-check
/**
 * Demo data for showing the system on the live site **without anyone outside seeing it** (owner, 20 Nov 2026):
 * - a hidden client category `DEMO` ("Demo (internal)");
 * - one demo hotel company with its Owner login and three LIVE properties (Mumbai, Goa, Jaipur): two room types,
 *   a flexible cancellation policy, two rate plans and 90 days of rooms and prices — **never on the website**
 *   (`visibility.website = false`) and on B2B **only for the DEMO category**;
 * - one demo B2B client company (category DEMO) with its Owner login.
 * Everything is named "Demo — …"; the companies carry the note `demo-data`; emails are `@example.com` (never delivered).
 * Built through the real hotel API (same checks as a real hotel), then published by a direct status change, as the
 * listing review is a separate step. `removeDemoData` deletes exactly these companies and what belongs to them.
 * No payments, orders or ledger entries are made.
 */
import { addDays, todayIn } from '../core/dates.js';
import { systemScope } from '../core/db/tenant-plugin.js';
import { BookingRecord, BookingRequestRecord, BookingStatusRecord } from '../modules/hotel-booking/index.js';
import { CityRecord, PropertyRecord, RoomTypeRecord } from '../modules/hotel-catalog/index.js';
import {
  CancellationPolicyRecord,
  ChangeLogRecord,
  HoldRecord,
  InventoryDayRecord,
  RateDayRecord,
  RatePlanRecord,
} from '../modules/hotel-inventory/index.js';
import { SessionRecord, UserRecord } from '../modules/identity/index.js';
import { OrderRecord } from '../modules/orders/index.js';
import { ClientCategoryRecord, InvitationRecord, MemberRecord, OrganizationRecord } from '../modules/organizations/index.js';
import { ClientMarkupRecord } from '../modules/pricing/index.js';

export const DEMO_MARK = 'demo-data';
export const DEMO_CATEGORY = 'DEMO';
export const DEMO_HOTEL_EMAIL = 'demo.hotel@example.com';
export const DEMO_CLIENT_EMAIL = 'demo.client@example.com';
const SYSTEM = systemScope('demo data (owner-approved demo, hidden from the public)');
const DAYS = 90;

const PROPERTIES = [
  { city: 'mumbai', name: 'Demo — Sea Breeze Marine Drive', type: 'hotel', stars: 4, deluxe: 450000, suite: 750000 },
  { city: 'goa', name: 'Demo — Palm Grove Beach Resort', type: 'resort', stars: 4, deluxe: 520000, suite: 900000 },
  { city: 'jaipur', name: 'Demo — Pink City Haveli', type: 'hotel', stars: 3, deluxe: 280000, suite: 480000 },
];
const ROOM = { description: '', sizeSqm: 28, extraBeds: { allowed: false, max: 0 }, amenities: [] };

/**
 * @typedef {{ status: number, body: any }} Res
 * @typedef {{ get: (p: string, h?: Record<string, string>) => Promise<Res>, post: (p: string, b: unknown, h?: Record<string, string>) => Promise<Res>,
 *   put: (p: string, b: unknown, h?: Record<string, string>) => Promise<Res> }} Api
 * @typedef {{ api: Api, clock: import('../core/clock.js').Clock,
 *   users: ReturnType<typeof import('../modules/identity/index.js').createUserRepository>,
 *   orgs: ReturnType<typeof import('../modules/organizations/index.js').createOrganizationsService>, password: string }} DemoDeps
 */

/** @param {Res} r @param {string} what */
function ok(r, what) {
  if (r.status >= 300) throw new Error(`demo data: ${what} → ${r.status} ${JSON.stringify(r.body)}`);
  return r.body;
}
/** @param {string} t */
const auth = (t) => ({ authorization: `Bearer ${t}` });

/** @param {DemoDeps} deps @param {string} email */
async function login(deps, email) {
  return ok(await deps.api.post('/api/v1/auth/login', { identifier: email, password: deps.password }, { 'x-b2b-auth': '1' }), 'sign in')
    .accessToken;
}

/** @param {DemoDeps} deps @param {{ email: string, name: string, type: 'HOTEL' | 'CLIENT', legalName: string }} a */
async function company(deps, a) {
  const user = await deps.users.create({ email: a.email, name: a.name, password: deps.password });
  const org = await deps.orgs.createOrganization({
    type: a.type,
    legalName: a.legalName,
    ownerUserId: user.id,
    status: 'ACTIVE',
    createdBy: DEMO_MARK,
  });
  await OrganizationRecord.updateOne({ _id: org.id }, { $set: { statusReason: DEMO_MARK } }).setOptions(SYSTEM); // the demo marker
  return { orgId: /** @type {string} */ (org.id), token: await login(deps, a.email) };
}

/**
 * Two room types, a flexible policy and two rate plans on a property.
 * @param {DemoDeps} deps
 * @param {Record<string, string>} h
 * @param {string} base
 */
async function setup(deps, h, base) {
  const deluxe = ok(
    await deps.api.post(
      `${base}/room-types`,
      { ...ROOM, name: 'Deluxe Room', beds: [{ bedTypeKey: 'king', count: 1 }], maxAdults: 2, maxChildren: 1, maxOccupancy: 3 },
      h,
    ),
    'room',
  ).id;
  const suite = ok(
    await deps.api.post(
      `${base}/room-types`,
      {
        ...ROOM,
        name: 'Family Suite',
        sizeSqm: 45,
        beds: [{ bedTypeKey: 'king', count: 1 }],
        maxAdults: 3,
        maxChildren: 2,
        maxOccupancy: 4,
      },
      h,
    ),
    'suite',
  ).id;
  const policy = ok(
    await deps.api.post(
      `${base}/cancellation-policies`,
      { name: 'Flexible', nonRefundable: false, rules: [], noShow: { type: 'PERCENT', value: 100 } },
      h,
    ),
    'policy',
  ).id;
  const plan = (/** @type {string} */ name, /** @type {string} */ meal) =>
    deps.api.post(
      `${base}/rate-plans`,
      {
        name,
        mealPlanKey: meal,
        roomTypeIds: [deluxe, suite],
        cancellationPolicyId: policy,
        pricingModel: 'PER_OCCUPANCY',
        minAdvanceDays: 0,
        maxAdvanceDays: 365,
        derived: null,
      },
      h,
    );
  const roomOnly = ok(await plan('Room only', 'ep'), 'plan').id;
  const breakfast = ok(await plan('With breakfast', 'cp'), 'plan').id;
  return { deluxe, suite, roomOnly, breakfast };
}

/**
 * One property, built through the hotel API, then published (hidden from the website, DEMO clients only).
 * @param {DemoDeps} deps
 * @param {string} token
 * @param {typeof PROPERTIES[number]} p
 */
async function property(deps, token, p) {
  const h = auth(token);
  const id = ok(await deps.api.post('/api/v1/hotel/properties', { name: p.name, propertyTypeKey: p.type }, h), 'property').id;
  const base = `/api/v1/hotel/properties/${id}`;
  const city = /** @type {any} */ (await CityRecord.findOne({ slug: p.city }).lean());
  if (!city) throw new Error(`demo data: city ${p.city} missing (run the server once to seed master lists)`);
  const v = ok(await deps.api.get(base, h), 'read property').version;
  const loc = {
    cityId: String(city._id),
    line1: '1 Demo Road',
    pin: '400001',
    lat: city.location.coordinates[1],
    lng: city.location.coordinates[0],
  };
  ok(await deps.api.put(`${base}/sections/location`, loc, { ...h, 'if-match': `"${v}"` }), 'location');
  const { deluxe, suite, roomOnly, breakfast } = await setup(deps, h, base);
  await calendar(deps, h, { base, deluxe, suite, roomOnly, breakfast, p });
  await PropertyRecord.updateOne(
    { _id: id },
    {
      $set: {
        status: 'LIVE',
        starRating: p.stars,
        description: 'Demo listing for showing the MusafirBaba B2B system. Not a real hotel.',
        visibility: { website: false, b2b: true, clientCategories: [DEMO_CATEGORY], sellFrom: null },
      },
    },
  ).setOptions(SYSTEM);
  return id;
}

/**
 * 90 days of rooms and prices (one edit per room type and plan; at most 92 nights per edit).
 * @param {DemoDeps} deps
 * @param {Record<string, string>} h
 * @param {{ base: string, deluxe: string, suite: string, roomOnly: string, breakfast: string, p: typeof PROPERTIES[number] }} a
 */
async function calendar(deps, h, a) {
  const from = todayIn(deps.clock, 'Asia/Kolkata');
  const to = addDays(from, DAYS);
  /** @param {string} plan @param {string} room @param {number} amount @param {number} guests */
  const rate = (plan, room, amount, guests) => ({
    ratePlanId: plan,
    roomTypeId: room,
    prices: Array.from({ length: guests }, (_, i) => ({ guests: i + 1, amount: amount + i * 50000 })),
  });
  const edit = {
    requestId: `demo-${a.base.slice(-12)}`,
    from,
    to,
    weekdays: null,
    rooms: [
      { roomTypeId: a.deluxe, total: 8 },
      { roomTypeId: a.suite, total: 3 },
    ],
    rates: [
      rate(a.roomOnly, a.deluxe, a.p.deluxe, 2),
      rate(a.breakfast, a.deluxe, a.p.deluxe + 60000, 2),
      rate(a.roomOnly, a.suite, a.p.suite, 3),
      rate(a.breakfast, a.suite, a.p.suite + 90000, 3),
    ],
  };
  ok(await deps.api.put(`${a.base}/calendar`, edit, h), 'calendar');
}

/** @param {DemoDeps} deps */
export async function addDemoData(deps) {
  if (await OrganizationRecord.exists({ statusReason: DEMO_MARK }).setOptions(SYSTEM))
    throw new Error('demo data is already there — run "remove" first');
  await ClientCategoryRecord.updateOne(
    { key: DEMO_CATEGORY },
    {
      $set: { active: true },
      $setOnInsert: {
        key: DEMO_CATEGORY,
        name: 'Demo (internal)',
        description: 'Only for demo data — never give to a real client',
        order: 999,
        updatedBy: DEMO_MARK,
      },
    },
    { upsert: true },
  );
  const hotel = await company(deps, {
    email: DEMO_HOTEL_EMAIL,
    name: 'Demo Hotel Owner',
    type: 'HOTEL',
    legalName: 'Demo — Sea Breeze Hotels Pvt Ltd',
  });
  const properties = [];
  for (const p of PROPERTIES) properties.push(await property(deps, hotel.token, p));
  const client = await company(deps, {
    email: DEMO_CLIENT_EMAIL,
    name: 'Demo Agency Owner',
    type: 'CLIENT',
    legalName: 'Demo — Wanderlust Travels',
  });
  await OrganizationRecord.updateOne({ _id: client.orgId }, { $set: { clientCategory: DEMO_CATEGORY } }).setOptions(SYSTEM);
  return { hotelOrgId: hotel.orgId, clientOrgId: client.orgId, properties, logins: [DEMO_HOTEL_EMAIL, DEMO_CLIENT_EMAIL] };
}

/** Deletes the demo companies and everything that belongs to them (nothing else). */
export async function removeDemoData() {
  const orgs = await OrganizationRecord.find({ statusReason: DEMO_MARK, legalName: /^Demo — / }, { type: 1 })
    .setOptions(SYSTEM)
    .lean();
  const ids = orgs.map((o) => String(o._id));
  if (ids.length === 0) return { removed: 0 };
  const hotelIds = orgs.filter((o) => o.type === 'HOTEL').map((o) => String(o._id));
  const clientIds = orgs.filter((o) => o.type === 'CLIENT').map((o) => String(o._id));
  const members = await MemberRecord.find({ orgId: { $in: ids } }, { userId: 1 })
    .setOptions(SYSTEM)
    .lean();
  const userIds = (await UserRecord.find({ _id: { $in: members.map((m) => m.userId) }, email: /@example\.com$/ }, { _id: 1 }).lean()).map(
    (u) => String(u._id),
  );
  const byHotel = { hotelOrgId: { $in: hotelIds } };
  await Promise.all([
    ...[
      PropertyRecord,
      RoomTypeRecord,
      RatePlanRecord,
      CancellationPolicyRecord,
      InventoryDayRecord,
      RateDayRecord,
      ChangeLogRecord,
      HoldRecord,
      BookingRecord,
      BookingStatusRecord,
    ].map((/** @type {import('mongoose').Model<any>} */ m) => m.deleteMany(byHotel).setOptions(SYSTEM)),
    OrderRecord.deleteMany({ hotelOrgIds: { $in: hotelIds } }).setOptions(SYSTEM),
    BookingRequestRecord.deleteMany({ clientOrgId: { $in: clientIds } }).setOptions(SYSTEM),
    ClientMarkupRecord.deleteMany({ clientOrgId: { $in: clientIds } }).setOptions(SYSTEM),
    InvitationRecord.deleteMany({ orgId: { $in: ids } }).setOptions(SYSTEM),
    MemberRecord.deleteMany({ orgId: { $in: ids } }).setOptions(SYSTEM),
    SessionRecord.deleteMany({ userId: { $in: userIds } }).setOptions(SYSTEM),
  ]);
  await UserRecord.deleteMany({ _id: { $in: userIds } });
  await OrganizationRecord.deleteMany({ _id: { $in: ids } }).setOptions(SYSTEM);
  await ClientCategoryRecord.updateOne({ key: DEMO_CATEGORY }, { $set: { active: false } });
  return { removed: ids.length, users: userIds.length };
}
