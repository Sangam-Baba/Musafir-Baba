// @ts-check
/**
 * My Bookings for B2B clients (S12-T17): only the company's rows, newest first, with filters (reference, guest, status,
 * payment, destination, stay and booking dates, branch, booker); branch-limited and "own bookings only" people see
 * only theirs; CSV export (no formulas); other companies see nothing.
 */
import { describe, expect, it } from 'vitest';

import { BookingSummaryRecord, clientFilter } from '../../src/b2b/modules/reporting/index.js';
import { bookingsCsv } from '../../src/b2b/routes/client-bookings.js';
import { auth, useInventoryApp } from './helpers/inventory-app.js';
import { clientOwner } from './helpers/search-setup.js';

const clock = { now: () => new Date('2026-11-23T10:00:00Z') };
const app = useInventoryApp({ clock, models: [BookingSummaryRecord], env: { B2B_ORDERS_ENABLED: 'true' } });
let n = 0;

/** @param {string} clientOrgId @param {Record<string, unknown>} over */
const row = (clientOrgId, over = {}) => ({
  bookingRef: `MBH-T${(n += 1)}`,
  orderRef: `MBO-T${n}`,
  orderId: `65f00000000000000000${String(n).padStart(4, '0')}`,
  productType: 'HOTEL',
  channel: 'B2B_PORTAL',
  clientOrgId,
  branchId: null,
  createdBy: 'user:65f000000000000000000aa1',
  propertyName: 'Sea View',
  destination: 'Mumbai',
  leadGuest: 'Asha Verma',
  checkIn: '2026-12-01',
  checkOut: '2026-12-03',
  bookingStatus: 'CONFIRMED',
  orderStatus: 'CONFIRMED',
  paymentState: 'PAID',
  totalPaise: 178_500,
  refundedPaise: 0,
  orderCreatedAt: new Date(`2026-11-${String(10 + (n % 10)).padStart(2, '0')}T06:00:00Z`),
  projectedAt: clock.now(),
  ...over,
});

describe('My Bookings', () => {
  it("the company's rows only, newest first, with filters; another company sees none; CSV", async () => {
    const c = await clientOwner(app, 'mybookings@trips.in');
    const other = await clientOwner(app, 'other-mb@trips.in');
    await BookingSummaryRecord.insertMany([
      row(c.orgId),
      row(c.orgId, {
        leadGuest: 'Ravi Kumar',
        destination: 'Goa',
        bookingStatus: 'CANCELLED',
        paymentState: 'REFUNDED',
        refundedPaise: 178_500,
      }),
      row(c.orgId, { checkIn: '2027-01-10', checkOut: '2027-01-12', propertyName: '=cmd|calc' }),
      row(other.orgId),
    ]);
    const list = async (/** @type {string} */ q = '') => (await app.srv.get(`/api/v1/client/bookings${q}`, auth(c.token))).body.data;
    const all = await list();
    expect(all).toHaveLength(3);
    expect(all.every((/** @type {any} */ r) => r.clientOrgId === c.orgId)).toBe(true);
    expect(new Date(all[0].orderCreatedAt).getTime()).toBeGreaterThanOrEqual(new Date(all[2].orderCreatedAt).getTime());
    expect(all[0]).not.toHaveProperty('customerId');
    expect(await list('?q=ravi')).toHaveLength(1);
    expect(await list(`?q=${all[0].bookingRef.toLowerCase()}`)).toHaveLength(1);
    expect(await list('?status=CANCELLED&payment=REFUNDED')).toHaveLength(1);
    expect(await list('?destination=go')).toHaveLength(1);
    expect(await list('?checkInFrom=2027-01-01')).toHaveLength(1);
    expect((await app.srv.get('/api/v1/client/bookings', auth(other.token))).body.data).toHaveLength(1);
    const csv = await app.srv.get('/api/v1/client/bookings.csv', auth(c.token));
    expect(csv.status).toBe(200);
    expect(csv.headers.get('content-type')).toContain('text/csv');
  });

  it('branch-limited and "own bookings only" people see only theirs (the filter)', () => {
    const who = { clientOrgId: 'c1', branchIds: ['b1'], ownUser: null };
    expect(clientFilter(who, {})).toMatchObject({ clientOrgId: 'c1', branchId: { $in: ['b1'] } });
    expect(clientFilter(who, { branchId: 'b2' })).toMatchObject({ branchId: '__none__' }); // not their branch → nothing
    expect(clientFilter({ clientOrgId: 'c1', branchIds: [], ownUser: 'user:u1' }, { createdBy: 'user:u2' })).toMatchObject({
      createdBy: 'user:u1',
    });
    expect(clientFilter({ clientOrgId: 'c1', branchIds: [], ownUser: null }, { createdBy: 'user:u2' })).toMatchObject({
      createdBy: 'user:u2',
    });
  });

  it('CSV never starts a cell with a formula', () => {
    const csv = bookingsCsv([{ ...row('c1', { propertyName: '=HYPERLINK("x")', leadGuest: '+91 Ravi' }) }]);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain("'+91 Ravi");
    expect(csv.split('\n')[0]).toContain('booking,order,hotel');
  });
});
