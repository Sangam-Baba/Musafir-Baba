# Stage 05 — Pricing & GST

| | |
| --- | --- |
| **Phase** | A — hotels + website (working system) |
| **Duration** | ~1.5 weeks |
| **Depends on** | Stage 04 |
| **Modules** | `pricing` (margins, client markups, tax, price tokens) |
| **Apps** | `admin` (rules, simulator) — client markup screens come in Stage 12 |
| **Closes** | D4, D10 (with CA) |

## 1. Goal

One deterministic engine turns a hotel's net rate into the exact price each buyer sees — different margins for website and B2B if wanted — with correct GST, a full breakdown, and a tamper-proof price token.

Brief example must hold: **₹10,000 hotel rate + ₹1,000 MusafirBaba margin = ₹11,000 to the B2B client**, plus GST.

## 2. Scope

**In:** margin rules with maker–checker, client markups (display only), tax rules as dated data, GST engine (slab per room-night, CGST/SGST vs IGST), price breakdown, signed price tokens, simulator, cache-invalidation events.
**Out:** promotions/coupons (later).

## 2a. Price formula — how admin controls what end users and B2B clients see (decided: D16)

Hotel listing is free; MusafirBaba earns by adding a margin. Admin manages this in **one place** in the admin panel: **Pricing → Margin rules**. Every price is calculated as:

```
Price shown = Hotel base rate + Margin (by channel)  + GST on that amount
```

**Margin types** (admin chooses per rule):

| Type | Formula | Example (base ₹700) |
| --- | --- | --- |
| Fixed amount per room per night | `base + X` | +₹250 → ₹950 |
| Percentage of base | `base + base × P%` | +20% → ₹840 |
| Percentage with minimum / maximum | `base + clamp(base × P%, min, max)` | 15%, min ₹100, max ₹1,500 → ₹805 |
| Fixed per booking (optional) | added once per booking | +₹99 per booking |

**Default rules (one per channel), editable by admin** — your example:

| Rule | Channel | Margin | Base ₹700 → price before GST | GST (5%, ≤ ₹7,500) | Final per night |
| --- | --- | --- | --- | --- | --- |
| Website default | `WEBSITE` (end users) | + ₹250 fixed | ₹950 | ₹47.50 | **₹997.50** |
| B2B default | `B2B_PORTAL` + `B2B_API` | + ₹150 fixed | ₹850 | ₹42.50 | **₹892.50** |

**Overrides** (optional, higher priority than defaults): admin can add rules for a specific city, star rating, hotel, room type, date range (e.g. New Year), client category (e.g. "Gold agents: +₹100") or a single client. The most specific active rule wins; ties go to the higher priority number. Admin sees **which rule applied** for any price.

**Safety:** a rule takes effect only after a second admin approves it (maker–checker). Before saving, the screen shows a **live preview**: "Base ₹700 → Website ₹997.50, B2B ₹892.50" for sample hotels, and how many hotels the rule affects. Every change is logged. Rules can be scheduled (start/end date). Existing bookings never change.

**Who sees what:** end users see only the final price (incl. GST). B2B clients see their price + GST breakdown (never the hotel base rate or MusafirBaba margin). Hotels see only their own base rate. Admin sees everything.

## 3. Work breakdown

1. **Margin rules**: match on channel (`WEBSITE`/`B2B_PORTAL`/`B2B_API`), client category, client, hotel org, property, city, star, stay dates; adjustment `FIXED_PER_NIGHT`, `PERCENT` (bps) with optional `minPaise`/`maxPaise`, `FIXED_PER_BOOKING`; priority; `effectiveFrom`/`effectiveTo`. Two default rules seeded (website, B2B) — the system refuses to sell if no rule matches a channel, so a hotel is never sold at zero margin by accident. Statuses `DRAFT → PENDING_APPROVAL → ACTIVE → RETIRED`; approval by a different user.
2. **Evaluation**: active matching rules → sort by priority desc, then specificity (number of match fields) desc, then oldest → apply first. Pure function; output records rule id.
3. **Client markups** (rules engine now; client screens in Stage 12): a client sets its own markup for its customers (shown on client-branded vouchers / "my selling price" toggle); MusafirBaba never charges it.
4. **Tax rules** seeded as data: accommodation ≤ ₹7,500 → 5% (no ITC), > ₹7,500 → 18% (ITC), from 22 Sep 2025, SAC 996311; older rates kept for history; SaaS fee rule for Stage 13.
5. **GST engine**: per room per night on the sell value (or tariff, per D4); `₹7,500.00` inclusive in the 5% slab; property state vs issuing GSTIN state → CGST+SGST or IGST; multiple issuing GSTINs supported (D10).
6. **Quote** (`pricing.quote(context)`): net (from availability) → margin → sell → GST → totals; per-night rounding to paisa; returns `PriceBreakdown` (versioned) with rule ids.
7. **Price token**: HMAC-SHA256 signed (key id + rotation) payload `{ channel, clientOrgId|customerId, propertyId, roomTypeId, ratePlanId, checkIn, checkOut, occupancies, totalPaise, breakdownHash, exp: +15 min }`; `verifyAndReprice(token, ctx)` used by booking.
8. **Simulator** (admin): pick property/dates/occupancy/channel/client → full breakdown; test draft rules before approval.
9. **Events**: `pricing.rule.activated|retired` → search cache invalidation.

## 4. Collections

`prc_margin_rules`, `prc_client_markups`, `prc_tax_rules`, `prc_signing_keys`, `prc_rule_history` (append-only).

## 5. API

Client: `GET/PUT /markups`. Admin: CRUD `/admin/margin-rules` + `/submit`, `/approve`, `/retire`; CRUD `/admin/tax-rules` (maker–checker); `POST /admin/pricing/simulate`.

## 6. Rules & edge cases

- Hotel rates are tax-exclusive → no back-calculation, no GST dead zone.
- **Hotel's GST on the net rate** (principal model, GST-registered hotel): recorded per night as `hotelGstPaise`; it is a cost when no ITC applies (≤ ₹7,500 slab), so the default margins (+₹250 / +₹150) must be re-checked once the CA answers D4. In the agent model GST applies to the commission instead — the engine supports both via configuration.
- Margin can't make sell < net unless a rule explicitly allows (approval needed).
- Rule changes never affect issued tokens (until expiry) or existing bookings (snapshot).
- Net rates and margins never appear in client/website responses (field-level permission `hotel.rates.viewNet` is platform-only).
- INR only in v1; Money type ready for more currencies.

## 7. Security

| Threat | Control | Test |
| --- | --- | --- |
| Client tampers price | Signed token + server re-price | Tamper tests |
| Token reused by another org | Token bound to client/customer + channel | Test |
| Insider margin change | Maker–checker, history, alerts on large change | Tests |
| Net-rate leak | DTOs per permission; contract test | Test |

## 8. Mandatory tests

Channel example tests (₹700 → ₹997.50 website / ₹892.50 B2B; percent with min/max clamps); no-matching-rule → not sellable; slab boundary tests (749999 / 750000 / 750001 paise), CGST/SGST vs IGST, rule precedence determinism (shuffled input), totals = Σ parts (property test), brief example test, token tamper/expiry/rotation.

## 9. Definition of Done

- [ ] Simulator reproduces ₹10,000 + ₹1,000 = ₹11,000 with correct GST lines
- [ ] Base ₹700 shows ₹997.50 on website (+₹250) and ₹892.50 on B2B (+₹150); switching a rule to 20% shows ₹840 + GST
- [ ] Admin edits a rule → second admin approves → new prices visible on website and dashboard within a minute
- [ ] Website and B2B can have different margins for the same room
- [ ] Rule change needs approval and clears related caches
- [ ] CA has reviewed tax data and D4/D10

## 10. AI editor prompt

```
Read: AGENTS.md, 04-domain-model.md §8.2–8.3, this stage.
Task: §3.5–3.7 — GST engine + quote() + price token sign/verify.
Constraints: pure domain in modules/pricing/domain; rules via repository port; Money only.
Tests first: slab boundaries; intra vs inter-state split; totals property test; brief example; tampered/expired token rejected; old kid still verifies until exp.
```
