# Stage 14 — API Access & Webhooks for Clients

| | |
| --- | --- |
| **Phase** | C — API, finance, launch |
| **Duration** | ~2.5 weeks (can run in parallel with Stage 15) |
| **Depends on** | Stages 12–13 (B2B booking, usage, plans) |
| **Modules** | `api-access`, `webhooks` |
| **Apps** | Business area `/client/developers`, API docs page |
| **Closes** | D19 (API keys — decided: yes, built at the end) |

## 1. Goal

A client's developer connects their own software to MusafirBaba — search → book → pay → cancel — using API keys and public docs, and receives signed webhooks for booking changes, all self-service from the dashboard. The API is the **same** `/api/v1` the dashboard already uses; this stage adds machine access, not new business logic.

## 2. Scope

**In:** API keys (create, scope, IP allow-list, rotate, revoke), API-key auth in the gateway, usage attributed per key (into the client's one plan pool), test mode on staging (test keys + PayU test mode + seeded hotels), webhook endpoints, signing, delivery with retries, delivery log and replay, SSRF protection, API docs with guides and code samples.
**Out:** SDK packages, separate public sandbox environment, OAuth client credentials (DEF-008).

## 3. Work breakdown

1. **API keys**: per client org; name, scopes (`hotel:search`, `hotel:book`, `orders:read`, `wallet:read`, `webhooks:manage`) ⊆ owner's permissions ∩ plan features; IP allow-list (CIDR); format `mb_live_<prefix>_<secret>` / `mb_test_…`; store prefix + SHA-256(secret + pepper) only; shown once; 2 active keys max (rotation); `lastUsedAt/IP`; new-IP alerts; instant revoke (cache bust < 5 s). Creating a key needs owner/admin + step-up MFA.
2. **Gateway**: `Authorization: Bearer mb_…` → key → org → scopes; `channel = B2B_API`; per-key rate limits from plan; usage attributed to the key (same pool as the dashboard, D3); `X-MB-Refresh` never honoured for keys.
3. **Test mode**: staging environment with test keys, fake hotels, PayU test mode, auto-funded test wallet; magic guest names for scenarios (`SOLDOUT`, `PRICECHANGE`) to help client developers.
4. **Webhooks**: endpoints CRUD (HTTPS URL, events, description); secret shown once, rotation with 24 h dual signing; event (from the **outbox**) → public payload mapper (versioned) → `whk_deliveries` → sender through a **guarded HTTP client** (DNS resolve → block private/loopback/link-local/metadata IPs, no redirects, 10 s timeout) → retries per `06-api-and-events.md` §6 → auto-disable after 24 h failing + email.
5. **Developer area** (dashboard): keys, scopes, IP list, webhook endpoints, delivery log (filter, status/response code), replay, send test event, usage per key (adds the API split to the Stage 12 usage screens).
6. **Docs**: rendered OpenAPI (Scalar/Redoc) + guides: quick start (book in 15 minutes), authentication, idempotency, price tokens & price check, booking lifecycle, errors, webhooks (verification code in Node, PHP, Python, Java), rate limits & quotas.

## 4. Collections

`api_keys` (`orgId`, `name`, `prefix` unique, `secretHash`, `scopes`, `ipAllowList`, `env`, `lastUsedAt`, `lastUsedIp`, `revokedAt`), `whk_endpoints` (`orgId`, `url`, `events`, `secretEnc`, `previousSecretEnc`, `previousValidUntil`, `status`, `failingSince`), `whk_deliveries` (`endpointId`, `eventId`, `attempt`, `status`, `responseCode`, `responseSnippet ≤ 1 KB`, `nextAttemptAt`).

## 5. API

CRUD `/api-keys`, CRUD `/webhook-endpoints`, `POST /webhook-endpoints/{id}/rotate-secret`, `POST /webhook-endpoints/{id}/test`, `GET /webhook-deliveries`, `POST /webhook-deliveries/{id}/replay`.

## 6. Rules & edge cases

- Suspended org → keys stop working immediately.
- Webhook payloads carry ids + essentials; details fetched via API.
- Order of deliveries not guaranteed; payload includes `occurredAt` and resource version.

## 7. Security

| Threat | Control | Test |
| --- | --- | --- |
| Leaked key | Hashed, shown once, IP allow-list, new-IP alerts, instant revoke | Tests |
| SSRF via webhook URL | Guarded client blocks private/metadata IPs, DNS rebinding, redirects | `169.254.169.254`, `localhost`, rebinding tests |
| Spoofed webhooks to clients | HMAC + timestamp; docs show verification | Verification test |
| Scope escalation | Scope ⊆ permissions ∩ plan | Matrix test |
| Test/live mix-up | Prefix check per environment | Test |

## 8. Mandatory tests

Key lifecycle (create, use, rotate, revoke < 5 s); API bookings in the mixed-channel race suite; usage per key counted into the client pool; SSRF suite; webhook signature verifiable; retry schedule and auto-disable; replay keeps event id.

## 9. Definition of Done

- [ ] A sample external app integrates search → book → cancel on staging with test keys and verifies webhooks
- [ ] API usage appears in the client's usage screen next to dashboard usage (same pool)
- [ ] Key rotation without downtime
- [ ] SSRF suite green

## 10. AI editor prompt

```
Read: AGENTS.md, 10-coding-standards.md, 06-api-and-events.md §6, 03-security-baseline.md §5, this stage §3.1–3.4.
Task: API key auth in the gateway + webhook delivery (public payload mapper, deliveries, guarded HTTP sender, HMAC with timestamp, retries, auto-disable, replay, dual-secret rotation).
Constraints: modules/api-access, modules/webhooks + worker; outbound HTTP only via the guarded client.
Tests first: revoked key rejected within 5 s; scope enforcement; signature verifiable; private/metadata IP and redirect blocked; retry schedule; replay keeps event id.
```
