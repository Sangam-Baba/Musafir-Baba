// @ts-check
/**
 * The full demo (local / test databases only — demo.js refuses production): on top of the demo hotel and client
 * (demo-data.js) it adds a second hotel company, two more B2B clients (one active with its own wallet, one waiting in
 * the verification queue), and runs the real flows through the real API and services:
 *   wallet top-ups and a markup → bookings paid from the wallet → one cancelled with a refund → one stay finished →
 *   payables → a hotel payout run (prepared by one person, approved by another, paid) → a plan with an invoice paid
 *   from the wallet → an API key and a webhook address → a booking request → a data request.
 * Steps that would also touch non-demo data are skipped with a note (finishing stays, the payout run, billing): each
 * checks first that only demo records would be affected. Everything is removed by `demo.js remove`.
 */
import { addDays, todayIn } from '../core/dates.js';
import { completeStays, BookingRecord } from '../modules/hotel-booking/index.js';
import { createPrivacy } from '../modules/identity/index.js';
import { ApplicationRecord } from '../modules/kyc/index.js';
import { OrderRecord } from '../modules/orders/index.js';
import { MemberRecord, OrganizationRecord } from '../modules/organizations/index.js';
import { PropertyRecord } from '../modules/hotel-catalog/index.js';
import { createSubscriptions, SubscriptionRecord } from '../modules/subscriptions/index.js';
import { createLedger, createLiveWallets, PayableRecord, PayoutRunRecord } from '../modules/wallet/index.js';
import { createEndpoints } from '../modules/webhooks/index.js';
import { apiKeysFor } from '../routes/api-keys-wiring.js';
import { payoutRunsFor } from '../routes/finance-wiring.js';
import { usageRecorder } from '../routes/metering-wiring.js';
import { payablesFor } from '../routes/payables-wiring.js';
import { billingFor, runBilling } from '../routes/subscriptions-wiring.js';
import { auth, company, DEMO_CATEGORY, DEMO_MARK, ok, property, SYSTEM } from './demo-data.js';

const HOTEL2 = [
  { city: 'manali', name: 'Demo — Snow Peak Lodge', type: 'hotel', stars: 3, deluxe: 320000, suite: 550000 },
  { city: 'rishikesh', name: 'Demo — Ganga View Retreat', type: 'resort', stars: 4, deluxe: 410000, suite: 690000 },
];
const OWNER_PERMS = [
  'api-access.key.manage',
  'hotel-search.search.use',
  'orders.order.create',
  'orders.order.read',
  'wallet.account.read',
  'webhooks.endpoint.manage',
];
const CONTACT = { name: 'Asha Verma', email: 'asha.guest@example.com', phone: '9800000001' };

/**
 * @typedef {import('./demo-data.js').DemoDeps & { env: NodeJS.ProcessEnv, logger: import('../core/logger.js').Logger }} FlowDeps
 * @typedef {{ hotelOrgId: string, clientOrgId: string, properties: string[] }} Base
 */

/** @param {FlowDeps} deps @param {string} clientOrgId @param {number} rupees */
async function topUp(deps, clientOrgId, rupees) {
  const ledger = createLedger({ clock: deps.clock });
  const wallets = createLiveWallets({ clock: deps.clock, ledger });
  await wallets.open(clientOrgId);
  await wallets.apply({
    clientOrgId,
    opId: `demo-top-${clientOrgId}-${rupees}`,
    type: 'TOPUP',
    amountPaise: rupees * 100,
    journal: {
      reference: { type: 'demo-topup', id: clientOrgId },
      purpose: 'wallet-topup',
      memo: 'Demo top-up (bank transfer)',
      lines: [{ accountId: await ledger.accountId('platform', 'BANK'), debitPaise: rupees * 100 }],
    },
    by: DEMO_MARK,
  });
}

/** Book one stay from the wallet; returns the order ref and booking ids. @param {FlowDeps} deps @param {string} token @param {{ propertyId: string, from: number, nights: number, guest: string, reference: string }} a */
async function book(deps, token, a) {
  const today = todayIn(deps.clock, 'Asia/Kolkata');
  const stay = { checkIn: addDays(today, a.from), checkOut: addDays(today, a.from + a.nights), rooms: [{ adults: 2, childrenAges: [] }] };
  const ref = String(/** @type {any} */ (await PropertyRecord.findById(a.propertyId).setOptions(SYSTEM).lean())?.publicRef);
  const offers = ok(await deps.api.post(`/api/v1/hotels/${ref}/offers`, stay, auth(token)), 'offers');
  const priceToken = offers.offers?.[0]?.priceToken;
  if (!priceToken) throw new Error(`demo flows: no offer for ${ref}`);
  const key = (/** @type {string} */ k) => ({ ...auth(token), 'idempotency-key': `demo-${a.reference}-${k}-${today}` });
  const created = ok(
    await deps.api.post(
      '/api/v1/client/orders',
      { priceToken, rooms: [{ leadGuest: a.guest }], contact: CONTACT, customerReference: a.reference, confirmDuplicate: true },
      key('order'),
    ),
    'order',
  );
  const orderRef = String(created.order?.ref ?? created.ref);
  ok(await deps.api.post(`/api/v1/client/orders/${orderRef}/pay`, { method: 'WALLET' }, key('pay')), 'pay');
  const o = /** @type {any} */ (await OrderRecord.findOne({ ref: orderRef }).setOptions(SYSTEM).lean());
  const bookings = await BookingRecord.find({ orderId: String(o._id) })
    .setOptions(SYSTEM)
    .lean();
  return { orderRef, bookingIds: bookings.map((b) => String(b._id)), bookingRefs: bookings.map((b) => String(b.ref)) };
}

/** @param {FlowDeps} deps @param {string} token @param {string} bookingRef */
async function cancel(deps, token, bookingRef) {
  const q = ok(await deps.api.post(`/api/v1/bookings/hotels/${bookingRef}/cancellation-quote`, {}, auth(token)), 'quote');
  ok(
    await deps.api.post(
      `/api/v1/bookings/hotels/${bookingRef}/cancel`,
      { quoteToken: q.quoteToken, reason: 'Guest changed plans (demo)' },
      { ...auth(token), 'idempotency-key': `demo-cancel-${bookingRef}` },
    ),
    'cancel',
  );
}

/** The demo hotel's KYC approved with bank details (through the real KYC route), bank saved days ago. @param {FlowDeps} deps @param {string} orgId @param {string} token */
async function approvedHotelKyc(deps, orgId, token) {
  await ApplicationRecord.create({
    orgId,
    orgType: 'HOTEL',
    createdBy: DEMO_MARK,
    details: { legalName: 'Demo — Sea Breeze Hotels Pvt Ltd' },
  });
  ok(
    await deps.api.put(
      '/api/v1/kyc/bank',
      { holderName: 'Demo Sea Breeze Hotels', accountNumber: '50100099990001', ifsc: 'HDFC0000001' },
      auth(token),
    ),
    'bank',
  );
  await ApplicationRecord.updateOne(
    { orgId },
    { $set: { status: 'APPROVED', bankChangedAt: new Date(deps.clock.now().getTime() - 5 * 86_400_000) } },
  ).setOptions(SYSTEM);
}

/** A client waiting in the verification queue. @param {FlowDeps} deps */
async function pendingClient(deps) {
  const c = await company(deps, {
    email: 'demo.client3@example.com',
    name: 'Demo Trailblazer Owner',
    type: 'CLIENT',
    legalName: 'Demo — Trailblazer Holidays',
  });
  await OrganizationRecord.updateOne({ _id: c.orgId }, { $set: { status: 'ONBOARDING', clientCategory: DEMO_CATEGORY } }).setOptions(
    SYSTEM,
  );
  await ApplicationRecord.create({
    orgId: c.orgId,
    orgType: 'CLIENT',
    status: 'SUBMITTED',
    submittedAt: deps.clock.now(),
    createdBy: DEMO_MARK,
    details: { legalName: 'Demo — Trailblazer Holidays' },
  });
  return c.orgId;
}

/** Stays, payables and the payout run — only if nothing outside the demo would be touched. @param {FlowDeps} deps @param {Base & { hotel2: string }} b @param {string[]} log */
async function finishAndPay(deps, b, log) {
  const later = { now: () => new Date(deps.clock.now().getTime() + 4 * 86_400_000) };
  const demoHotels = [b.hotelOrgId, b.hotel2];
  const outside = await BookingRecord.countDocuments({
    status: 'CONFIRMED',
    hotelOrgId: { $nin: demoHotels },
    'stay.checkOut': { $lt: addDays(todayIn(later, 'Asia/Kolkata'), 1) },
  }).setOptions(SYSTEM);
  if (outside > 0) return log.push(`skipped finishing stays: ${outside} non-demo booking(s) would also be finished`);
  await completeStays({ clock: later });
  const payables = payablesFor({ clock: later, logger: deps.logger });
  for (const bk of await BookingRecord.find({ hotelOrgId: { $in: demoHotels } })
    .setOptions(SYSTEM)
    .lean())
    await payables.sync(String(bk._id));
  log.push('stay finished → payables ready for the hotel');
  const foreign = await PayableRecord.countDocuments({ status: 'ELIGIBLE', payoutId: null, hotelOrgId: { $nin: demoHotels } }).setOptions(
    SYSTEM,
  );
  if (foreign > 0 || (await PayoutRunRecord.exists({ status: { $in: ['DRAFT', 'APPROVED', 'FILE_READY'] } })))
    return log.push('skipped the payout run: other payables or an open run exist');
  const runs = payoutRunsFor(deps.env, later);
  const run = await runs.propose('staff:demo-finance-1', { cycleEnd: todayIn(later, 'Asia/Kolkata') });
  await runs.approve('staff:demo-finance-2', run.id);
  await runs.bankFile('staff:demo-finance-2', run.id);
  await runs.markPaid('staff:demo-finance-2', run.id, 'NEFT-DEMO-0001');
  return log.push(`payout run ${run.ref} prepared, approved by a second person, paid (NEFT-DEMO-0001)`);
}

/** A plan for Wanderlust with an invoice paid from the wallet — only if no non-demo subscription would be billed. @param {FlowDeps} deps @param {string} clientOrgId @param {string[]} log */
async function plan(deps, clientOrgId, log) {
  const subs = createSubscriptions({ clock: deps.clock });
  if (await SubscriptionRecord.exists({ clientOrgId: { $ne: clientOrgId } }).setOptions(SYSTEM))
    return log.push('skipped plan billing: other subscriptions exist');
  const s = await subs.start(clientOrgId);
  await subs.change({ clientOrgId, planKey: 'B', expectedVersion: s.version, by: 'user:demo' });
  const r = await runBilling(subs, billingFor(deps.clock, deps.env, subs));
  return log.push(`Plan B started; ${JSON.stringify(r)} (invoice paid from the wallet)`);
}

/** @param {FlowDeps} deps @param {Base} base */
/** Partners: hotel 1's KYC, a second hotel company, two more clients. @param {FlowDeps} deps @param {Base} base @param {string[]} log */
async function partners(deps, base, log) {
  const hotel1 = await deps.api.post(
    '/api/v1/auth/login',
    { identifier: 'demo.hotel@example.com', password: deps.password },
    { 'x-b2b-auth': '1' },
  );
  await approvedHotelKyc(deps, base.hotelOrgId, ok(hotel1, 'hotel sign in').accessToken);
  const h2 = await company(deps, {
    email: 'demo.hotel2@example.com',
    name: 'Demo Himalayan Owner',
    type: 'HOTEL',
    legalName: 'Demo — Himalayan Retreats Pvt Ltd',
  });
  const h2props = [];
  for (const p of HOTEL2) h2props.push(await property(deps, h2.token, p));
  log.push('second hotel company with 2 properties (Manali, Rishikesh) — no KYC yet, so its payouts would be held');
  const sky = await company(deps, {
    email: 'demo.client2@example.com',
    name: 'Demo Skyline Owner',
    type: 'CLIENT',
    legalName: 'Demo — Skyline Corporate Travel',
  });
  await OrganizationRecord.updateOne({ _id: sky.orgId }, { $set: { clientCategory: DEMO_CATEGORY } }).setOptions(SYSTEM);
  await pendingClient(deps);
  log.push('two more B2B clients: Skyline (active) and Trailblazer (waiting in the verification queue)');
  return { hotel2: h2.orgId, hotel2Props: h2props, sky };
}

/** Money and bookings. @param {FlowDeps} deps @param {Base} base @param {{ hotel2Props: string[], sky: { orgId: string, token: string } }} p @param {string[]} log */
async function bookings(deps, base, p, log) {
  const { sky } = p;
  const h2props = p.hotel2Props;
  await topUp(deps, base.clientOrgId, 200_000);
  await topUp(deps, sky.orgId, 50_000);
  const w = ok(
    await deps.api.post('/api/v1/auth/login', { identifier: 'demo.client@example.com', password: deps.password }, { 'x-b2b-auth': '1' }),
    'client sign in',
  ).accessToken;
  ok(
    await deps.api.put(
      '/api/v1/markups',
      { enabled: true, adjustment: { type: 'PERCENT', value: 1000 }, overrides: [] },
      { ...auth(w), 'if-match': '"0"' },
    ),
    'markup',
  );
  log.push('wallets topped up (Wanderlust ₹2,00,000, Skyline ₹50,000); Wanderlust adds a 10 % markup');

  const [mumbai, goa, jaipur] = base.properties;
  const b1 = await book(deps, w, { propertyId: String(goa), from: 10, nights: 2, guest: 'Rohan Mehta', reference: 'WL-1001' });
  await book(deps, w, { propertyId: String(mumbai), from: 20, nights: 1, guest: 'Priya Nair', reference: 'WL-1002' });
  const b3 = await book(deps, w, { propertyId: String(jaipur), from: 6, nights: 1, guest: 'Karan Shah', reference: 'WL-1003' });
  await cancel(deps, w, String(b3.bookingRefs[0]));
  await book(deps, w, { propertyId: String(mumbai), from: 1, nights: 1, guest: 'Neha Gupta', reference: 'WL-1004' });
  await book(deps, sky.token, { propertyId: String(h2props[1]), from: 15, nights: 2, guest: 'Vikram Rao', reference: 'SKY-77' });
  log.push(`5 bookings paid from wallets (e.g. ${b1.orderRef}); 1 cancelled with a refund to the wallet`);
  return w;
}

/** API key, webhook address, booking request, data request. @param {FlowDeps} deps @param {Base} base @param {string} w @param {string[]} log */
async function extras(deps, base, w, log) {
  const goa = base.properties[1];
  await apiKeysFor(deps.env, deps.clock).create(
    {
      orgId: base.clientOrgId,
      userId: String(/** @type {any} */ (await MemberRecord.findOne({ orgId: base.clientOrgId }).setOptions(SYSTEM).lean())?.userId),
      permissions: OWNER_PERMS,
    },
    { name: 'Wanderlust booking website (demo)', scopes: ['hotel:search', 'hotel:book', 'orders:read'] },
  );
  await createEndpoints({ clock: deps.clock, sealKey: deps.env.B2B_AUTH_SECRET ?? '', planAllowsWebhooks: async () => true }).create(
    { orgId: base.clientOrgId, userId: 'demo', permissions: OWNER_PERMS },
    {
      url: 'https://example.com/musafirbaba-webhooks',
      events: ['booking.confirmed', 'booking.cancelled'],
      description: 'Demo endpoint (never receives anything)',
    },
  );
  log.push('Wanderlust: an API key and a webhook address (Business → Developers)');

  const today = todayIn(deps.clock, 'Asia/Kolkata');
  const stay = { checkIn: addDays(today, 30), checkOut: addDays(today, 31), rooms: [{ adults: 2, childrenAges: [] }] };
  const goaRef = String(/** @type {any} */ (await PropertyRecord.findById(goa).setOptions(SYSTEM).lean())?.publicRef);
  const offer = ok(await deps.api.post(`/api/v1/hotels/${goaRef}/offers`, stay, auth(w)), 'offers').offers?.[0]?.priceToken;
  if (offer)
    ok(
      await deps.api.post(
        '/api/v1/booking-requests',
        {
          priceToken: offer,
          customer: { name: 'Meera Iyer', email: 'meera@example.com', reference: 'WL-REQ-1' },
          notes: 'Honeymoon — sea view please',
        },
        auth(w),
      ),
      'booking request',
    );
  await createPrivacy({ clock: deps.clock }).request({
    type: 'ACCESS',
    name: 'Demo Guest',
    email: 'demo.guest@example.com',
    details: 'Please send me my booking data (demo)',
  });
  log.push('a booking request (Admin → Services → Booking requests) and a data request (Admin → Control → Privacy)');
}

/** @param {FlowDeps} deps @param {Base} base */
export async function addDemoFlows(deps, base) {
  /** @type {string[]} */
  const log = [];
  const p = await partners(deps, base, log);
  const w = await bookings(deps, base, p, log);
  await finishAndPay(deps, { ...base, hotel2: p.hotel2 }, log);
  await plan(deps, base.clientOrgId, log);
  await extras(deps, base, w, log);
  await usageRecorder(deps.clock).flush();
  return log;
}
