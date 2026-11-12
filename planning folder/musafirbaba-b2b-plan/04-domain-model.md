# 04 — Domain Model (MongoDB)

> Collections, key fields, indexes, state machines and core algorithms. Stage files add detail when they build each collection.
> All new collections carry `createdAt`, `updatedAt` (Mongoose timestamps) and, for mutable aggregates, `version`.

---

## 1. Organisations, users, access

| Collection | Key fields | Indexes |
| --- | --- | --- |
| `org_organizations` | `type (PLATFORM/CLIENT/HOTEL)`, `legalName`, `displayName`, `gstRegistered` (bool — hotels may be unregistered, D20), `gstin?`, `panEnc`, `panLast4`, `address`, `stateCode`, `status (ONBOARDING/ACTIVE/SUSPENDED/CLOSED)` (KYC progress lives on the KYC application), `category` (client tier), `settings`, `branding` | `{type, status}`, `{gstin}` **partial, not unique** (where `gstin` is a string) — duplicates flagged to the KYC reviewer |
| `org_branches` | `orgId`, `name`, `city`, `stateCode`, `gstin?`, `status` | `{orgId}` |
| `id_users` | `email` (lowercased), `phoneE164`, `passwordHash`, `status`, `emailVerifiedAt`, `phoneVerifiedAt`, `mfa {totpSecretEnc, enabledAt, recoveryCodeHashes[]}`, `failedLogins`, `lockedUntil`, `lastLoginAt` | unique `{email}`, unique sparse `{phoneE164}` |
| `org_members` | `orgId`, `userId`, `status (INVITED/ACTIVE/DISABLED)`, `roleIds[]`, `branchIds[]` (empty = all), `propertyIds[]` (hotel staff limits) | unique `{orgId, userId}` |
| `org_invitations` | `orgId`, `email`, `roleIds[]`, `branchIds[]`, `tokenHash`, `expiresAt`, `acceptedAt` | `{tokenHash}`, TTL on `expiresAt + 30d` |
| `acl_permissions` | `code`, `module`, `description`, `orgTypes[]`, `sensitive` | unique `{code}` (seeded from code) |
| `acl_roles` | `orgId` (null = system role), `orgType`, `name`, `permissions[]`, `isSystem` | `{orgId}` |
| `id_sessions` | `userId`, `orgId`, `refreshTokenHash`, `familyId`, `userAgent`, `ip`, `expiresAt`, `revokedAt` | TTL on `expiresAt` |

`id_users` holds **business users only** (client and hotel members). Website customers stay in the **existing `User` collection** with their existing login and dashboard; new code reaches them only through the `legacy/customers` adapter.

## 2. KYC & files

| Collection | Key fields |
| --- | --- |
| `kyc_applications` | `orgId`, `orgType`, `status (DRAFT/SUBMITTED/UNDER_REVIEW/APPROVED/REJECTED)`, `submissionCount`, `documents[] {type, fileId, reviewStatus, note}`, `bank {holder, accountNoEnc, last4, ifsc}`, `riskLevel`, `assignedTo`, `assignedUntil`, `reviews[] {by, action, note, at}`, `decidedBy`, `decidedAt`, `secondApproverId` |
| `file_files` | `orgId`, `purpose`, `originalName`, `mime`, `size`, `sha256`, `storageKey`, `status (QUARANTINED/CLEAN/REJECTED)` |
| `file_access_log` | `fileId`, `actorId`, `at`, `purpose` |

## 3. Hotels

| Collection | Key fields | Indexes |
| --- | --- | --- |
| `htl_properties` | `hotelOrgId`, `publicRef` (`MBHT-XXXXXX`), `name`, `slug`, `type`, `starRating`, `description`, `address`, `cityId`, `stateCode`, `location {type:'Point', coordinates:[lng,lat]}`, `timeZone`, `checkInTime`, `checkOutTime`, `policies`, `amenities[]`, `media[] {fileId, category, caption, variants, isCover, order}`, `status (DRAFT/SUBMITTED/LIVE/SUSPENDED/ARCHIVED)`, `visibility {website, b2b, clientCategories[]}`, `pendingRevision` | `{hotelOrgId}`, `{status, cityId}`, 2dsphere `{location}`, unique `{slug}`, text/Atlas Search on name |
| `htl_room_types` | `propertyId`, `hotelOrgId`, `name`, `description`, `sizeSqm`, `beds`, `maxAdults`, `maxChildren`, `maxOccupancy`, `amenities[]`, `media[]`, `status` | `{propertyId}` |
| `htl_cities`, `htl_amenities` | masters | |
| `inv_rate_plans` | `propertyId`, `hotelOrgId`, `roomTypeIds[]`, `name`, `mealPlan (EP/CP/MAP/AP)`, `cancellationPolicyId`, `pricingModel (PER_ROOM/PER_OCCUPANCY)`, `minAdvanceDays`, `maxAdvanceDays`, `status` | `{propertyId}` |
| `inv_cancellation_policies` | `propertyId`, `hotelOrgId`, `rules[] {hoursBeforeCheckIn, penaltyType (PERCENT/NIGHTS/FIXED), value}`, `noShow`, `nonRefundable`, `summary` | |
| `inv_inventory_days` | `hotelOrgId`, `propertyId`, `roomTypeId`, `date ('YYYY-MM-DD')`, `total`, `booked`, `held`, `stopSell`, `version` | **unique `{roomTypeId, date}`**, `{propertyId, date}` + validator (see `05-…`) |
| `inv_rate_days` | `ratePlanId`, `roomTypeId`, `propertyId`, `date`, `prices {occupancyKey: netPaise}` (e.g. `{"1A": 450000, "2A": 500000, "2A1C": 580000}`), `minLos`, `maxLos`, `closedToArrival`, `closedToDeparture`, `stopSell` | unique `{ratePlanId, roomTypeId, date}` |
| `inv_holds` | `orderId`, `propertyId`, `lines[] {roomTypeId, dates[], qty}`, `status (ACTIVE/CONFIRMED/RELEASED/EXPIRED)`, `expiresAt`, `extendedOnce` | `{status, expiresAt}`, unique `{orderId}` |

**Rates are always entered tax-exclusive** (fixes the GST dead zone).

## 4. Pricing & tax

| Collection | Key fields |
| --- | --- |
| `prc_margin_rules` | `name`, `priority`, `match {channel?, clientCategory?, clientOrgId?, hotelOrgId?, propertyId?, cityId?, starRating?, stayFrom?, stayTo?}`, `adjustment {type: FIXED_PER_NIGHT/PERCENT/FIXED_PER_BOOKING, value, minPaise?, maxPaise?}`, `effectiveFrom?`, `effectiveTo?`, `status (DRAFT/PENDING_APPROVAL/ACTIVE/RETIRED)`, `createdBy`, `approvedBy` |
| `prc_client_markups` | `clientOrgId`, `match`, `adjustment` — client's own markup for its customers (display/vouchers only) |
| `prc_tax_rules` | `appliesTo (ACCOMMODATION/SAAS)`, `sac`, `slabMinPaise`, `slabMaxPaise (null = no max)`, `rateBps`, `itcAllowed`, `effectiveFrom`, `effectiveTo`, `sourceNote` |
| `prc_signing_keys` | `kid`, `secretRef`, `status` |

## 5. Orders, bookings, money

| Collection | Key fields | Indexes |
| --- | --- | --- |
| `ord_orders` | `reference (MBO-XXXX-XXXX)`, `channel`, `clientOrgId?`, `branchId?`, `customerId?`, `createdBy`, `status`, `items[] {productType, bookingId, totalPaise}`, `totals {sellPaise, taxPaise, payablePaise}`, `paymentMode (WALLET/CREDIT/GATEWAY)`, `paymentIntentId`, `guestSessionId?`, `idempotencyKey`, `expiresAt`, `version` | unique `{reference}`; **partial** unique `{clientOrgId, idempotencyKey}` (where `clientOrgId` exists), `{customerId, idempotencyKey}` (where `customerId` exists), `{guestSessionId, idempotencyKey}` (guest checkout); `{clientOrgId, createdAt:-1}` |
| `hbk_bookings` | `reference (MBH-…)`, `orderId`, `channel`, `clientOrgId?`, `customerId?`, `hotelOrgId`, `propertyId`, `checkInDate`, `checkOutDate`, `rooms[] {roomTypeId, ratePlanId, occupancy, guests[], nights[] {date, netPaise, marginPaise, sellPaise, taxPaise, taxRuleId}}`, `holdId`, `status`, `policySnapshot`, `priceSnapshot`, `propertySnapshot {name, address, timeZone, checkInTime}`, `specialRequests`, `hotelAcknowledgedAt`, `version` | unique `{reference}`, `{hotelOrgId, checkInDate}`, `{clientOrgId, createdAt:-1}`, `{customerId}` |
| `hbk_cancellations` | `bookingId`, `quote`, `chargePaise`, `refundPaise`, `status`, `requestedBy` | |
| `hbk_amendments` | `bookingId`, `type`, `details`, `status`, `assignee`, `messages[]`, `slaDueAt` | |
| `wal_accounts` | `ownerType (CLIENT/HOTEL/PLATFORM)`, `ownerOrgId`, `type (WALLET/RECEIVABLE/PAYABLE/REVENUE/TAX_PAYABLE/GATEWAY_CLEARING/BANK)`, `balancePaise`, `heldPaise`, `creditLimitPaise`, `floorPaise`, `balanceMode (LIVE/DERIVED)`, `version` | unique `{ownerOrgId, type}` |
| `wal_balance_snapshots` | `accountId`, `balancePaise`, `asOfTransactionId`, `at` — worker-maintained balances for `DERIVED` accounts | `{accountId, at:-1}` |
| `wal_transactions` (journal) | `reference {type, id}`, `purpose`, `lines[] {accountId, debitPaise, creditPaise}`, `memo`, `createdBy`, `at` | unique `{reference.type, reference.id, purpose}` |
| `wal_holds` | `accountId`, `amountPaise`, `capturedPaise`, `reference`, `status`, `expiresAt` | `{status, expiresAt}` |
| `pay_intents` | `orderId?`, `purpose (ORDER/TOPUP/SUBSCRIPTION)`, `orgId?`, `customerId?`, `amountPaise`, `gateway: 'PAYU'`, `txnId` (our id sent to PayU), `gatewayPaymentId` (PayU `mihpayid`), `status (CREATED/PENDING/SUCCEEDED/FAILED/REFUNDED)`, `windowEndsAt`, `lastVerifiedAt` | unique `{txnId}` |
| `pay_refunds` | `intentId?`, `walletHoldId?`, `amountPaise`, `destination (SOURCE/WALLET)`, `status`, `gatewayRefundId`, `idempotencyKey` | |
| `pay_webhook_inbox` | `dedupeKey` (unique: `txnId` + status), `source (CALLBACK/WEBHOOK/POLL)`, `hashValid`, `receivedAt`, `processedAt` | |
| `doc_documents` | `type (VOUCHER/VOUCHER_CLIENT_BRANDED/TAX_INVOICE/RECEIPT/CREDIT_NOTE/STATEMENT)`, `ownerRef`, `number?`, `storageKey`, `sha256`, `version` | |
| `doc_number_series` | `_id: series` (e.g. `I2627DL`), `next` | |

**Balance modes:** only client `WALLET` (and `RECEIVABLE` for credit) accounts are `LIVE` — updated with a conditional update inside the transaction, because spending needs a floor check. Platform accounts (revenue, tax, gateway clearing, bank) and hotel `PAYABLE` accounts are `DERIVED`: transactions only append journal lines, and the worker rolls them into `wal_balance_snapshots`. This avoids one document that every booking would write (MongoDB transactions on the same document abort and retry, serialising all bookings).

### Notifications (contract: `11-notifications-and-realtime.md` §10)

| Collection | Key fields | Indexes |
| --- | --- | --- |
| `ntf_inbox` | `recipientType (USER/ORG)`, `recipientId`, `orgId`, `category`, `title`, `body`, `link`, `entityRef`, `critical`, `readAt?`, `readBy[]`, `actedAt?`, `eventId` | unique `{eventId, recipientId}`, `{recipientId, createdAt:-1}` |
| `ntf_preferences` | `userId`, `category`, `channels`, `quietHours` | unique `{userId, category}` |
| `ntf_escalations` | `inboxId`, `rule`, `dueAt`, `status`, `attempts` | `{status, dueAt}` |
| `ntf_email_templates`, `ntf_email_messages`, `ntf_email_attempts` | Email templates and delivery log (no WhatsApp/SMS in v1) | — |

## 6. Identifiers

| Object | Public reference | Rule |
| --- | --- | --- |
| Order | `MBO-XXXX-XXXX` | random Crockford base32 + check char |
| Hotel booking | `MBH-XXXX-XXXX` | same |
| Property | `MBHT-XXXXXX` | same |
| Client org | `MBC-XXXXXX` | same |
| **Tax invoice** | `I2627DL000123` (13 chars) | **≤ 16 chars, gap-free, per financial year + issuing state** (GST Rule 46). Allocated atomically: `findOneAndUpdate({_id: series}, {$inc: {next: 1}}, {upsert, session})` |
| Credit note | `C2627DL000045` | same rules |

## 7. State machines

### 7.1 Org / KYC

```
Organization:     ONBOARDING (registered) ──KYC approved──► ACTIVE ⇄ SUSPENDED (admin, with reason) → CLOSED
KYC application:  DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED
                                          └──► REJECTED ──resubmit──► SUBMITTED (submissionCount + 1)
```

### 7.2 Property listing

```
DRAFT → SUBMITTED → LIVE ⇄ SUSPENDED → ARCHIVED
            └─ changes requested → DRAFT
Edits to name/address/location/star on a LIVE property create a pendingRevision (needs approval); other edits go live directly.
```

### 7.3 Order

```
(order created with rooms held) AWAITING_PAYMENT ──payment verified with PayU──► CONFIRMED
        │                         └──PayU reports pending──► PAYMENT_PENDING ──verified success──► CONFIRMED
        │                                                           └──failed / unresolved──► EXPIRED
        ├──window ran out, no payment──► EXPIRED
        └──payment succeeded but rooms lost──► FAILED (automatic PayU refund)
CONFIRMED → CANCELLED (fully cancelled)   |   COMPLETED (stay finished)
```
Orders are created directly in `AWAITING_PAYMENT` (there is no `CREATED` state). Wallet/credit path: `AWAITING_PAYMENT → CONFIRMED` in one transaction (funds held and captured in the same confirm transaction). A gateway order is **never** `CONFIRMED` without a verified successful payment.

### 7.4 Hotel booking

| From | Event | To |
| --- | --- | --- |
| — | rooms held | `HELD` |
| `HELD` | payment ok + rooms converted | `CONFIRMED` |
| `HELD` | hold expired / payment failed | `EXPIRED` |
| `HELD` | payment succeeded after the rooms were lost | `FAILED` (refunded) |
| `CONFIRMED` | cancel | `CANCELLED` |
| `CONFIRMED` | check-out date passed | `COMPLETED` |
| `CONFIRMED` | hotel marks no-show | `NO_SHOW` (72 h dispute window) |
| `CONFIRMED` | hotel cannot honour | `HOTEL_FAILED` → relocated (new booking) or refunded |

### 7.5 Subscription

```
TRIAL → ACTIVE → PAST_DUE (wallet empty at renewal; retries day 0/3/7) → SUSPENDED (paid features off) → CANCELLED
PAST_DUE/SUSPENDED → ACTIVE when paid
```

## 8. Algorithms

### 8.1 Availability for a stay — see `05-inventory-and-no-double-booking.md` §4.

### 8.2 Price build-up (per room, per night)

```
net        = inv_rate_days.prices[occupancyKey]          (tax-exclusive)
margin     = first matching margin rule (priority desc, then most specific, then oldest)
sell       = net + margin                                (price charged to client or website customer)
hotelGst   = GST the hotel charges MusafirBaba on net    (only if the hotel is GST-registered and MusafirBaba buys
                                                          as principal — CA decision D4; a cost when no ITC applies)
gst        = taxEngine(sell per room per night, stayDate, propertyState, issuer)   // see 8.3
total      = Σ rooms Σ nights (sell + gst)
clientMarkup (display only) = client's own markup on top, never charged by MusafirBaba
```

Hotel payable per night = `net` (+ `hotelGst` in the principal model). `hotelGstPaise` is recorded per night in the breakdown so margin reports show the true earning. Default margins (e.g. +₹250 website / +₹150 B2B) must be re-checked once D4 is decided.

Rounding: each component to the paisa (half-up) per night; totals are sums (never re-rounded). Breakdown (every night, rule ids, tax rule id) is snapshotted on the booking; later rule changes never change existing bookings.

### 8.3 GST on accommodation (data, not code)

- Up to ₹7,500 per room per night → **5%, no ITC**; above ₹7,500 → **18%, with ITC** (effective 22 Sep 2025). SAC 996311.
- Slab decided **per room per night** on the value of supply after discounts. ₹7,500.00 exactly → 5%.
- Place of supply = **property's state**: same state as the issuing GSTIN → CGST + SGST (half each); else IGST.
- Whether the taxable value is MusafirBaba's sell price or the hotel's tariff depends on principal vs agent model — **CA decision D4**; engine supports both.

### 8.4 Cancellation charge

```
deadline(rule) = hotel-local (checkInDate + checkInTime) − rule.hoursBeforeCheckIn − bufferHours
rule           = the strictest rule whose deadline has passed (none → free)
charge         = PERCENT → round(totalPaid × value) | NIGHTS → sum of first N nights (sell + gst) | FIXED → value
charge         = min(charge, totalPaid);  refund = totalPaid − charge
```
Shown as a signed **quote** (valid 5 min) before the user confirms.

### 8.5 Ledger postings (example: ₹10,000 net, ₹1,000 margin, wallet booking; GST lines added per CA)

| Event | Debit | Credit | Amount |
| --- | --- | --- | --- |
| Client tops up wallet (PayU) | Gateway clearing | Client wallet | 50,000 |
| Booking confirmed | Client wallet | Hotel payable | 10,000 (+ hotel's GST on net in the principal model — D4) |
| | Client wallet | Platform revenue (margin) | 1,000 |
| Cancelled with ₹2,000 charge (split per contract) | Hotel payable / Platform revenue | Client wallet | refund parts |
| Hotel payout | Hotel payable | Bank | payable balance |
| Monthly plan fee | Client wallet | Platform SaaS revenue | plan price |
| Usage overage | Client wallet | Platform SaaS revenue | overage |

Who keeps the cancellation charge (and its GST) when a buffer applies is decision D5.

## 9. Invariants (each has an automated test)

1. `booked + held ≤ total` for every inventory day — enforced by the update filter **and** a collection validator.
2. Every wallet transaction balances (Σ debits = Σ credits); account balance = Σ of its lines.
3. Wallet available (`balance − held + creditLimit`) never below 0.
4. Booking price snapshot total = order item total = amount paid − refunds.
5. Refund + charge = amount paid.
6. Invoice numbers gap-free per series, ≤ 16 chars.
7. No hold `ACTIVE` past `expiresAt + 2 min` (sweeper alert).
8. No order in a non-final state past its deadline (sweeper alert).
9. No gateway order is `CONFIRMED` without a verified successful PayU payment.
10. Every `DERIVED` account snapshot equals the sum of its journal lines up to `asOfTransactionId`.
