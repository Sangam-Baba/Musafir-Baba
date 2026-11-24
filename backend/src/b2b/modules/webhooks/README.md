# Module: webhooks (Stage 14)

Signed booking updates sent to a B2B client's own HTTPS address.

| | |
| --- | --- |
| **Collections** | `whk_endpoints` (0079), `whk_deliveries` (0080) |
| **Tenant** | `orgId` |
| **Public interface** | `index.js` only |

- Endpoint URL: HTTPS, not a private / loopback / link-local / metadata address (checked on save and again on every send).
- Secret `whsec_…`: shown once, stored sealed (AES-256-GCM); rotation keeps the old secret signing for 24 h.
- Signature: `MB-Signature: t=<unix>,v1=<HMAC-SHA256(secret, t + "." + body)>` (one `v1` per valid secret).
- Outbound HTTP **only** through `guarded-client.js` (DNS checked, connection pinned to the checked address, no
  redirects, 10 s timeout, ≤ 1 KB response kept).
