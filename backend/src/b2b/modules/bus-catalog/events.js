// @ts-check
/** Event types of the bus-catalog module. Payloads: ids + essentials only. */
export const EVENTS = /** @type {const} */ ({
  vehicleSubmitted: 'bus-catalog.vehicle.submitted',
  vehicleApproved: 'bus-catalog.vehicle.approved',
  vehicleChangesRequested: 'bus-catalog.vehicle.changes-requested',
  vehicleSuspended: 'bus-catalog.vehicle.suspended',
  routeSubmitted: 'bus-catalog.route.submitted',
  routeApproved: 'bus-catalog.route.approved',
  routeChangesRequested: 'bus-catalog.route.changes-requested',
  routeSuspended: 'bus-catalog.route.suspended',
  paperExpiring: 'bus-catalog.paper.expiring',
  paperExpired: 'bus-catalog.paper.expired',
});
