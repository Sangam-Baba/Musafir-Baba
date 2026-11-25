# Module: orders

The booking engine's order (plan Stage 08): what a buyer pays for at once. One engine for every channel — website now,
B2B dashboard (Stage 12) and API (Stage 14) later.

| | |
| --- | --- |
| **Collections** | `ord_orders` |
| **Public interface** | `index.js` only |
| **Permissions** | `orders.admin.read`, `orders.admin.act` (MusafirBaba). Buyers own their orders: signed-in account, or a guest's private link |
| **References** | `MBO-XXXX-XXXX` |
| **Plug-in points** | Item handlers (`HOTEL` → `hotel-booking`), payment modes (`GATEWAY` → PayU; `WALLET` / `CREDIT` at Stage 12) |

## Rules that never change without an ADR

- Prices come from the server's re-price of the price token, never from the browser.
- No transactions: every step is one conditional single-document update; `HOLDING` and `CONFIRMING` are finished by
  the reconciler (back for `HOLDING`, forward for `CONFIRMING` — money may be captured).
- A gateway order is **never** `CONFIRMED` before PayU's verify API confirmed the payment (amount + transaction id).
- The PayU window always ends before the room hold (`05-…` §6). Paid but the rooms are lost → refunded automatically.
- No PayU or email call between the database steps of a flow — events drive them.
- Orders never import hotel modules directly; they call item handlers registered at start-up.

## Products (Stage 18, ADR-0018)

- Item types `HOTEL` and `BUS`. A bus item names its company in `supplierOrgId` (never `hotelOrgIds`); the engine always
  uses the handler of the item's own type. Hotel behaviour is unchanged.
