// Temporary kill switch mirrored from mobile/src/config/features.ts.
//
// While the MBConnect mobile app has its wallet/earnings/bank-details UI
// hidden (see /mobile/FINANCIAL_FEATURES_TOGGLE.md), this backend flag
// relaxes the partner-profile completion score so new partners aren't
// blocked from submitting for approval by a bank-details requirement they
// have no UI to satisfy. It does NOT disable any wallet crediting, admin
// wallet management, or PartnerBank CRUD logic -- those stay fully
// functional; only the completion-percentage requirement is affected.
//
// Flip back to true together with the mobile flag once the Play Console
// developer account is converted to an Organization account and the
// wallet/bank UI is re-enabled.
export const FINANCIAL_FEATURES_ENABLED = false;
