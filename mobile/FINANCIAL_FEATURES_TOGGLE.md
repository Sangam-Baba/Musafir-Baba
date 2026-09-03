# Financial Features Toggle (Wallet / Earnings / Bank Details)

## Why this exists

Google Play classifies apps that collect bank account details and/or
display a wallet balance under **"Financial products and services"**.
Since 31 August 2024, Play Console requires apps in that category to be
published from an **Organization** developer account, not a **Personal**
one. MBConnect's Play Console account is currently Personal, so the
first Closed Testing submission (release 2, 1.0.0) was rejected with:

> "Some types of apps can only be distributed by organizations... Financial
> products and services including, but not limited to, banking, loans,
> ... cryptocurrency software wallets..."

Rather than removing the wallet/earnings/bank-details features, they are
**hidden behind a feature flag** so they can be switched back on with a
one-line change once the Play Console account is converted to an
Organization account (or MBConnect is published under an existing
Organization account).

**Nothing was deleted.** Every screen, form, and backend endpoint related
to wallet/bank features is untouched and fully functional — this only
controls whether the *shipped app build* can navigate to them.

## The two flags

- `mobile/src/config/features.ts` — `FINANCIAL_FEATURES_ENABLED = false`
- `backend/src/config/features.js` — `FINANCIAL_FEATURES_ENABLED = false`

**Both must be flipped back to `true` together** when re-enabling. The
backend flag exists because the partner-profile completion-percentage
calculation independently required bank details to reach 100% — with the
mobile UI hidden, that would otherwise permanently block new partner
registrations at 80% with no way to complete them.

## Exactly what was changed

### Mobile (`/mobile`)

| File | What changed |
|---|---|
| `src/config/features.ts` | **New file.** Defines `FINANCIAL_FEATURES_ENABLED`. |
| `src/navigation/MainTabNavigator.tsx` | The "Earnings" bottom tab (`<Tab.Screen name="Earnings" .../>`) is now wrapped in `{FINANCIAL_FEATURES_ENABLED && (...)}`. |
| `src/navigation/ProfileStack.tsx` | 1) `BankDetails`/`BankAccount` and `PayoutHistory`/`EarningsTrend` route registrations wrapped in `{FINANCIAL_FEATURES_ENABLED && (<>...</>)}`. 2) The "Payout & Bank Details" row is conditionally spread into the `accountItems` array only when the flag is on. 3) The wallet-balance card (₹ balance + "View Wallet" button) on the Menu screen is wrapped in `{FINANCIAL_FEATURES_ENABLED && (...)}`. 4) The onboarding walkthrough tooltip text for the profile card no longer mentions "add your bank details for payouts" when the flag is off. |
| `src/screens/PersonalDetailsScreen.tsx` | 1) The "Account and bank information" row is wrapped in `{FINANCIAL_FEATURES_ENABLED && (...)}`. 2) `isEverythingUploaded` (which gates the "Send For Approval" button) no longer requires `bank?.accountNumber` when the flag is off: `(!FINANCIAL_FEATURES_ENABLED || bank?.accountNumber)`. |
| `src/screens/VerifiedPartnerScreen.tsx` | Same two changes as above: the "Bank Account Details" checklist item is conditionally spread into `checklistItems`, and `isEverythingUploaded` has the same relaxed bank condition. |

**Untouched on purpose** (unreachable when the flag is off, but fully
intact so re-enabling requires no rework):
`src/screens/EarningsScreen.tsx`, `src/screens/BankAccountScreen.tsx`,
`src/screens/BankDetailsScreen.tsx`, `src/screens/PayoutHistoryScreen.tsx`,
`src/screens/EarningsTrendScreen.tsx`,
`src/components/ProfileForms/BankDetailsForm.tsx`.

Also untouched: `src/screens/HomeScreen.tsx`'s "Today's Overview" wallet
figure — it was already commented-out dead code before this change and
was left as-is.

### Backend (`/backend`)

| File | What changed |
|---|---|
| `src/config/features.js` | **New file.** Mirrors the mobile flag. |
| `src/controllers/partner/partnerProfile.controller.js` | In `calculateCompletion()`, the bank-details check (worth 20 of 100 points) is now gated: when the flag is off, those 20 points are awarded automatically instead of requiring a `PartnerBank` record. Everything else in this file, including wallet crediting in `partnerExtra.controller.js` (untouched, not part of this change), the admin wallet-management endpoints, and all `PartnerBank` CRUD routes, is unaffected. |

## How to flip it back on

1. Confirm the Play Console developer account has finished converting to
   an Organization account (or MBConnect is being published under an
   existing Organization account).
2. Set `FINANCIAL_FEATURES_ENABLED = true` in **both**
   `mobile/src/config/features.ts` and `backend/src/config/features.js`.
3. Re-run `npm run build:playstore` in `/mobile` to produce a new `.aab`.
4. In Play Console, update the "Financial features" declaration back to
   **Yes**, and re-check the "Other financial info" and wallet-related
   Data Safety boxes that were unchecked for this submission.
5. Test end-to-end before resubmitting:
   - New partner registration flow reaches "Send For Approval" only after
     genuinely adding bank details again (not auto-satisfied).
   - Earnings tab, Payout History, Bank Account/Details screens, and the
     Menu screen's wallet-balance card are all visible and working again.
6. Expect this next submission to go through review as a normal update —
   no special handling needed on Google's side once the account type
   matches the declared features.

## Known cosmetic side-effect

In `PersonalDetailsScreen.tsx`, the "Account and bank information" row
was the last item in its card and had `borderBottomWidth: 0` to avoid a
trailing border. With that row hidden, the row above it will show its
normal bottom border instead of the card ending cleanly — a minor visual
detail, not a functional issue. Worth a quick polish pass when
re-enabling, not required before then.
