# Module: api-access (Stage 14)

API keys for a B2B client's own software.

| | |
| --- | --- |
| **Collections** | `api_keys` (prefix `api_`) — migration `0078` |
| **Tenant** | `orgId` (tenant guard on); the gateway's key lookup uses a logged system scope |
| **Public interface** | `index.js` only |

- Format `mb_live_<8>_<40>` / `mb_test_…`; stored: prefix + SHA-256(secret + pepper). Shown once.
- A key acts as the member who created it, cut down to its scopes (`SCOPE_RULES`), so it can never do more than
  that person can do now. At most 2 keys that don't expire; rotation gives the old key 24 h.
- IP allow-list: addresses or CIDR ranges (IPv4 / IPv6); empty = any.
- Events: `api-access.key.created`, `.revoked`, `.used-new-ip` (bell notice to the Owner).
