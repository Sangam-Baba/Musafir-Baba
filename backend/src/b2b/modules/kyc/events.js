// @ts-check
/** Event types (module.entity.pastVerb) this module emits. Payloads: ids + essentials only. */
export const EVENTS = /** @type {const} */ ({
  applicationSubmitted: 'kyc.application.submitted',
  applicationResubmitted: 'kyc.application.resubmitted',
  applicationAssigned: 'kyc.application.assigned',
  applicationApproved: 'kyc.application.approved',
  applicationRejected: 'kyc.application.rejected',
  applicationReminded: 'kyc.application.reminded',
  gstRegistrationAdded: 'kyc.gst-registration.added',
  gstRegistrationDecided: 'kyc.gst-registration.decided',
  sensitiveViewed: 'kyc.application.sensitive-viewed',
});
