# Module: payments

PayU for the new system (plan Stage 07) — **the existing merchant account** (`PAYU_KEY`, `PAYU_SALT`, `PAYU_ENV`, read
only), with the new system's own return address and transaction prefixes. The existing PayU code and the PayU
dashboard are never changed.

| | |
| --- | --- |
| **Collections** | `pay_intents`, `pay_refunds`, `pay_webhook_inbox`, `pay_settlements`, `pay_recon_exceptions` |
| **Public interface** | `index.js` only |
| **Permissions** | `payments.payment.read`, `payments.recon.manage`, `payments.refund.create`, `payments.test.run` |
| **Transaction ids** | `B2BH…` hotel orders, `B2BW…` wallet top-ups, `B2BS…` subscriptions |

## Rules that never change without an ADR

- The amount always comes from our intent, never from the browser or the callback.
- A callback is trusted only after **both** the reverse hash (constant time) **and** PayU's verify API agree, with the
  same amount and transaction id. Duplicate or late callbacks never move a status backwards.
- No PayU call between database steps of a flow; the processor is repeat-safe.
- Refunds go to the source, carry our own refund id (repeat-safe at PayU) and are followed until final.
