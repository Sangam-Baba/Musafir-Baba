// Temporary kill switch for wallet/earnings/bank-details features.
//
// Google Play classifies apps that collect bank account details and/or
// display a wallet balance under "Financial products and services", which
// requires the Play Console developer account to be an Organization account
// rather than a Personal one. This app is currently on a Personal account,
// so these features are hidden from the shipped build until that account
// conversion is complete.
//
// See /mobile/FINANCIAL_FEATURES_TOGGLE.md for the full list of files this
// flag gates and the steps to safely flip it back to `true`.
//
// Mirrored on the backend at backend/src/config/features.js -- keep both in
// sync when flipping this back on.
export const FINANCIAL_FEATURES_ENABLED = false;
