// @ts-check
/** Event types (module.entity.pastVerb) this module emits. Payloads: ids + essentials only. */
export const EVENTS = /** @type {const} */ ({
  propertySubmitted: 'hotel-catalog.property.submitted',
  propertyChangesRequested: 'hotel-catalog.property.changes-requested',
  /** became LIVE (first approval, or reactivated after a suspension) — search and caches add it */
  propertyPublished: 'hotel-catalog.property.published',
  /** a LIVE property's content changed (direct edit or an approved revision) — search and caches refresh it */
  propertyUpdated: 'hotel-catalog.property.updated',
  propertySuspended: 'hotel-catalog.property.suspended',
  propertyArchived: 'hotel-catalog.property.archived',
  revisionSubmitted: 'hotel-catalog.revision.submitted',
  revisionDecided: 'hotel-catalog.revision.decided',
});
