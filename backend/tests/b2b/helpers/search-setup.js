// @ts-check
/**
 * Stage 06 test setup: sellable LIVE hotels made through the real hotel API (location, room type, cancellation
 * policy, room-only plan, rooms and prices on the calendar), then published by a direct status change (the listing
 * review flow is tested in Stage 03). Pricing data seeded and its caches dropped.
 */
import { evictCachedPrefix } from '../../../src/b2b/core/cache.js';
import { CityRecord, PropertyRecord } from '../../../src/b2b/modules/hotel-catalog/index.js';
import { seedDefaultMarginRules, seedPricingSettings, seedTaxRules } from '../../../src/b2b/modules/pricing/index.js';
import { auth, SYSTEM } from './inventory-app.js';

let seq = 0;

/** @param {import('../../../src/b2b/core/clock.js').Clock} clock */
export async function seedPricing(clock) {
  await Promise.all([seedTaxRules(), seedDefaultMarginRules({ clock }), seedPricingSettings()]);
  evictCachedPrefix('pricing:');
  evictCachedPrefix('search:');
}

/**
 * @param {ReturnType<typeof import('./inventory-app.js').useInventoryApp>} app
 * @param {{ city?: string, name?: string, price?: number, rooms?: number, stars?: number, nonRefundable?: boolean,
 *   from?: string, to?: string, visibility?: Record<string, unknown> }} [o]
 */
export async function sellableHotel(app, o = {}) {
  seq += 1;
  const h = await app.hotelWithProperty(`owner${seq}@hotel${seq}.in`);
  const city = /** @type {any} */ (await CityRecord.findOne({ slug: o.city ?? 'mumbai' }).lean());
  const base = `/api/v1/hotel/properties/${h.propertyId}`;
  const v = (await app.srv.get(base, auth(h.token))).body.version;
  const loc = {
    cityId: String(city._id),
    line1: '12 Main Road',
    pin: '400020',
    lat: city.location.coordinates[1] + 0.001 * seq,
    lng: city.location.coordinates[0],
  };
  const put = await app.srv.put(`${base}/sections/location`, loc, { ...auth(h.token), 'if-match': `"${v}"` });
  if (put.status !== 200) throw new Error(`location: ${JSON.stringify(put.body)}`);
  const room = await app.roomType(h.token, h.propertyId);
  const policyBody = o.nonRefundable
    ? { name: 'Non-refundable', nonRefundable: true, rules: [], noShow: { type: 'PERCENT', value: 100 } }
    : { name: 'Flexible', nonRefundable: false, rules: [], noShow: { type: 'PERCENT', value: 100 } };
  const policy = (await app.srv.post(`${base}/cancellation-policies`, policyBody, auth(h.token))).body.id;
  const planBody = {
    name: 'Room only',
    mealPlanKey: 'ep',
    roomTypeIds: [room],
    cancellationPolicyId: policy,
    pricingModel: 'PER_OCCUPANCY',
    minAdvanceDays: 0,
    maxAdvanceDays: 365,
    derived: null,
  };
  const plan = (await app.srv.post(`${base}/rate-plans`, planBody, auth(h.token))).body.id;
  const price = o.price ?? 70000;
  const edit = {
    requestId: `req-${String(seq).padStart(6, '0')}`,
    from: o.from ?? '2026-12-01',
    to: o.to ?? '2026-12-06',
    weekdays: null,
    rooms: [{ roomTypeId: room, total: o.rooms ?? 5 }],
    rates: [
      {
        ratePlanId: plan,
        roomTypeId: room,
        prices: [
          { guests: 1, amount: price },
          { guests: 2, amount: price },
        ],
      },
    ],
  };
  const cal = await app.srv.put(`${base}/calendar`, edit, auth(h.token));
  if (cal.status !== 200) throw new Error(`calendar: ${JSON.stringify(cal.body)}`);
  await PropertyRecord.updateOne(
    { _id: h.propertyId },
    {
      $set: {
        status: 'LIVE',
        name: o.name ?? `Hotel ${seq}`,
        starRating: o.stars ?? 3,
        ...(o.visibility ? { visibility: o.visibility } : {}),
      },
    },
  ).setOptions(SYSTEM);
  const p = /** @type {any} */ (await PropertyRecord.findById(h.propertyId).setOptions(SYSTEM).lean());
  return {
    ...h,
    room,
    plan,
    policy,
    ref: /** @type {string} */ (p.publicRef),
    slug: /** @type {string} */ (p.slug),
    cityId: String(city._id),
    base,
  };
}

/** A B2B client company with its Owner signed in. @param {ReturnType<typeof import('./inventory-app.js').useInventoryApp>} app @param {string} email */
export async function clientOwner(app, email) {
  const { PASSWORD } = await import('./inventory-app.js');
  const owner = await app.users.create({ email, name: 'Owner', password: PASSWORD });
  const org = await app.orgs.createOrganization({
    type: 'CLIENT',
    legalName: 'Trips Co',
    ownerUserId: owner.id,
    status: 'ACTIVE',
    createdBy: 's',
  });
  return { orgId: org.id, token: await app.login(email) };
}
