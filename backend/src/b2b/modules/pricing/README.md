# Module: pricing

Turns a hotel's net rate (tax-exclusive, from `hotel-inventory`) into the exact price each buyer sees: margin by
channel → sell price → GST → totals, with a full breakdown and a signed price token (plan Stage 05,
`docs/plan/04-domain-model.md` §8.2–8.3).

| | |
| --- | --- |
| **Collections** | `prc_margin_rules`, `prc_rule_history` (append-only), `prc_tax_rules`, `prc_signing_keys`, `prc_client_markups` |
| **Tenant** | Margin and tax rules are platform-wide (MusafirBaba's own data); client markups belong to `clientOrgId` |
| **Public interface** | `index.js` only |
| **Permissions** | `pricing.rules.read / propose / approve`, `pricing.tax.manage`, `pricing.simulator.use` (MusafirBaba), `pricing.markup.read / manage` (clients) |
| **Events** | `pricing.rule.activated`, `pricing.rule.retired`, `pricing.tax-rule.activated` |

## Rules that never change without an ADR

- Money is integer paise. Each component is rounded half-up **per room per night**; totals are sums, never re-rounded.
- GST is data (`prc_tax_rules`), never `if` statements on rates. The slab is decided per room per night;
  ₹7,500.00 exactly is in the 5 % slab. Place of supply = the property's state.
- A margin rule or tax rate takes effect only after a **different person** approves it. Every change is in the history.
- No matching margin rule for a channel → **not sellable** (never sold at zero margin by accident).
- Hotel net rates and margins never appear in website or client responses.
- Issued price tokens and existing bookings never change when rules change (breakdown snapshot).
- Products (ADR-0017): a margin rule without `match.productType` is a hotel rule; bus rules say `BUS` and never price
  hotels (nor hotel rules buses). Tax kind `BUS_TRANSPORT` has no seeded rate — added by staff after the CA confirms.
