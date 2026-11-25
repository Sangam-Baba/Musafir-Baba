// @ts-check
/**
 * Stage 09 wiring for hotel payables and completed stays: payables follow every booking change (events), orders are
 * completed when all their stays are, and the hourly completion job.
 */
import { completeStays, payableState } from '../modules/hotel-booking/index.js';
import { ORDERS, OrderRecord, pushHistory } from '../modules/orders/index.js';
import { createPayables } from '../modules/wallet/index.js';
import { createBusPayables } from '../modules/bus-payouts/index.js';

export const COMPLETION_EVERY_MS = 60 * 60_000;
const BOOKING_EVENTS = [
  'hotel-booking.booking.confirmed',
  'hotel-booking.booking.cancelled',
  'hotel-booking.booking.completed',
  'hotel-booking.booking.hotel-failed',
  'hotel-booking.hotel-failure.resolved',
  'hotel-booking.no-show.marked',
  'hotel-booking.no-show.resolved',
];

/** @param {{ clock: import('../core/clock.js').Clock, logger: import('../core/logger.js').Logger }} deps */
export const payablesFor = (deps) => createPayables({ ...deps, stateOf: (id) => payableState(id) });

/**
 * An order whose every stay is completed → COMPLETED.
 * @param {import('../modules/orders/payment.service.js').PayDeps} ordersDeps
 * @param {string} orderId
 */
async function completeOrderIfDone(ordersDeps, orderId) {
  const o = /^[a-f0-9]{24}$/.test(orderId)
    ? /** @type {any} */ (await OrderRecord.findOne({ _id: orderId, status: 'CONFIRMED' }).setOptions(ORDERS).lean())
    : null;
  if (!o) return;
  for (const it of o.items) if ((await ordersDeps.handlers.get(it.type).view(it, 'BUYER')).status !== 'COMPLETED') return;
  const res = await OrderRecord.updateOne(
    { _id: o._id, status: 'CONFIRMED' },
    { $set: { status: 'COMPLETED', statusChangedAt: ordersDeps.clock.now() } },
  ).setOptions(ORDERS);
  if (res.modifiedCount === 1) await pushHistory(ordersDeps, o._id, { status: 'COMPLETED', by: 'system:completion' });
}

/** @param {import('../modules/orders/payment.service.js').PayDeps} ordersDeps */
export function payableJobs(ordersDeps) {
  const payables = payablesFor(ordersDeps);
  return {
    payables,
    consumers: [
      {
        consumer: 'wallet-hotel-payables',
        types: BOOKING_EVENTS,
        handler: async (/** @type {{ payload: any }} */ e) => {
          if (typeof e.payload?.bookingId === 'string') await payables.sync(e.payload.bookingId);
        },
      },
      {
        consumer: 'orders-completed',
        types: ['hotel-booking.booking.completed', 'bus-booking.booking.completed'], // Stage 18 B7: bus trips too
        handler: async (/** @type {{ payload: any }} */ e) => completeOrderIfDone(ordersDeps, String(e.payload.orderId)),
      },
      {
        consumer: 'bus-payables', // Stage 18 B7: bus company payables follow their bookings (separate from hotel payables)
        types: ['bus-booking.booking.confirmed', 'bus-booking.booking.cancelled', 'bus-booking.booking.completed'],
        handler: async (/** @type {{ payload: any }} */ e) => {
          if (typeof e.payload?.bookingId === 'string') await createBusPayables(ordersDeps).sync(e.payload.bookingId);
        },
      },
    ],
    completion: {
      name: 'hotel-booking-complete-stays',
      everyMs: COMPLETION_EVERY_MS,
      run: () => completeStays({ clock: ordersDeps.clock }),
    },
  };
}
