# Stage 05 — Pricing & GST · Progress

> Task list from `docs/plan/stages/stage-05-pricing-gst.md` §3, split so each task fits one reviewable change. Rules and status values: `docs/progress/README.md`. Formula: `docs/plan/04-domain-model.md` §8.2–8.3.

| | |
| --- | --- |
| **Status** | IN_PROGRESS |
| **Phase · Track** | A · hotels + website |
| **Owner(s)** | |
| **Started** | 2026-11-18 |
| **Finished** | — |
| **Plan file** | `docs/plan/stages/stage-05-pricing-gst.md` |
| **Depends on** | Stage 04 (awaiting owner sign-off) |
| **Modules** | `pricing` (new) · reads `hotel-inventory` (net prices via `checkAvailability`) and `hotel-catalog` (property state, city, stars) through their public interfaces |

## Defaults used for this stage (owner / CA can change any of them — all are data or settings, not code)

| Topic | Default until the CA answers |
| --- | --- |
| Principal or agent (D4 / Q1) | **Principal** (MusafirBaba buys at the hotel's rate and resells): GST is worked out on MusafirBaba's **sell price**; the hotel's own GST on its rate is recorded per night (`hotelGstPaise`) for margin reports. Switchable to agent by one setting |
| Issuing GSTIN (D10 / Q2) | One issuer: the existing **Delhi** registration (state `07`). Hotel in Delhi → CGST + SGST; any other state → IGST. More issuing GSTINs can be added as data |
| Hotels without GST (D20 / Q3) | Unchanged from Stage 02: they may register but are **not sellable** — the quote refuses them |
| Tax rates | Accommodation ≤ ₹7,500 per room per night → 5 % (no ITC); above → 18 % (ITC), from 22 Sep 2025, SAC 996311; older rates kept for history |
| Default margins | Website + ₹250 per room per night, B2B + ₹150 (plan §2a) — seeded as two ACTIVE rules; to be re-checked once D4 is answered |
| Money | Integer paise, INR only; rounding half-up per room per night, totals are sums |
| Changes to existing code | None. New module `pricing`, new `prc_` collections, new admin screens in the B2B admin area only |

## Tasks

| ID | Task | Plan ref | Status | Owner | PR | Tests | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S05-T01 | Stage setup: `pricing` module skeleton (permissions, events, README), permission catalogue + role matrix, D4 / D10 defaults recorded | §3 | DONE | AI (Claude) | | matrix ✅ | Permissions: MusafirBaba `pricing.rules.read` (Support via `**.read`, Hotels team), `pricing.rules.propose` and `pricing.simulator.use` (Hotels team via `pricing.**`), `pricing.rules.approve` and `pricing.tax.manage` (**sensitive** — wildcards never grant them: Super Admin today; the approver must also be a different person); clients `pricing.markup.read` (Admin, Booking Agent) / `.manage` (Owner). Finance has no pricing access by default (owner can add the exact codes to a custom role). Events `pricing.rule.activated / retired`, `pricing.taxRule.activated`. D4 / D10 defaults written into `09-…` |
| S05-T02 | Tax rules as dated data (`prc_tax_rules`, seeded) + pure GST engine: slab per room per night (₹7,500.00 inclusive in 5 %), CGST + SGST vs IGST from the property's state vs the issuing GSTIN, several issuers supported | §3.4, §3.5 | TODO | | | | |
| S05-T03 | Margin rules (`prc_margin_rules`) + pure evaluation: match fields, FIXED_PER_NIGHT / PERCENT (bps, min / max) / FIXED_PER_BOOKING, precedence (priority → specificity → oldest), no rule → not sellable; two default rules seeded | §3.1, §3.2 | TODO | | | | |
| S05-T04 | Margin rule lifecycle API: DRAFT → PENDING_APPROVAL → ACTIVE → RETIRED, approval by a different person (maker–checker), history (`prc_rule_history`, append-only), sell < net only with explicit allow, events `pricing.rule.activated / retired` | §3.1, §3.9, §5 | TODO | | | | |
| S05-T05 | `pricing.quote(context)`: net (from availability) → margin → sell → GST → totals; versioned `PriceBreakdown` with rule ids and `hotelGstPaise`; DTOs that never show net / margin to clients or the website | §3.6, §6 | TODO | | | | |
| S05-T06 | Price token: HMAC-SHA256, key id + rotation (`prc_signing_keys`), bound to channel + buyer, 15-minute expiry; `verifyAndReprice(token, ctx)` for Stage 08 | §3.7 | TODO | | | | |
| S05-T07 | Tax rules admin (maker–checker, dated, never edited in place) | §5 | TODO | | | | |
| S05-T08 | Client markups engine (`prc_client_markups`, display only — screens in Stage 12) + `GET / PUT /markups` | §3.3, §5 | TODO | | | | |
| S05-T09 | Simulator `POST /admin/pricing/simulate`: property / dates / occupancy / channel / client → full breakdown, including draft rules before approval; "which rule applied" | §3.8 | TODO | | | | |
| S05-T10 | Admin screens: Pricing → Margin rules (list, edit with live preview + hotels affected, submit, approve, retire, history), Tax rules, Simulator | §2a, §3.8 | TODO | | | | |
| S05-T11 | Mandatory test suite: ₹700 → ₹997.50 / ₹892.50, percent clamps, no rule → not sellable, slab boundaries 749999 / 750000 / 750001 paise, CGST / SGST vs IGST, precedence with shuffled input, totals = Σ parts (property test), brief example ₹10,000 + ₹1,000, token tamper / expiry / rotation; tenant isolation | §8 | TODO | | | | |

Status: `TODO` · `DOING` · `REVIEW` · `DONE` · `BLOCKED` · `DEFERRED` (needs a `DEF-…` row) · `DROPPED` (reason in Notes)

## Definition of Done (copied from the stage file)

- [ ] Simulator reproduces ₹10,000 + ₹1,000 = ₹11,000 with correct GST lines
- [ ] Base ₹700 shows ₹997.50 on website (+₹250) and ₹892.50 on B2B (+₹150); switching a rule to 20% shows ₹840 + GST
- [ ] Admin edits a rule → second admin approves → new prices visible on website and dashboard within a minute
- [ ] Website and B2B can have different margins for the same room
- [ ] Rule change needs approval and clears related caches
- [ ] CA has reviewed tax data and D4/D10

## Mandatory tests (copied from the stage file)

- [ ] Channel example tests (₹700 → ₹997.50 website / ₹892.50 B2B; percent with min/max clamps)
- [ ] No-matching-rule → not sellable
- [ ] Slab boundary tests (749999 / 750000 / 750001 paise), CGST/SGST vs IGST
- [ ] Rule precedence determinism (shuffled input)
- [ ] Totals = Σ parts (property test)
- [ ] Brief example test
- [ ] Token tamper / expiry / rotation
