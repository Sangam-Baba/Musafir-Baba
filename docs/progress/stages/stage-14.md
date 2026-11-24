# Stage 14 — API access & webhooks · Progress

> Task list from `docs/plan/stages/stage-14-api-access-webhooks.md` §3, split so each task fits one reviewable change. Rules and status values: `docs/progress/README.md`.

| | |
| --- | --- |
| **Status** | IN_PROGRESS |
| **Phase · Track** | C · integration |
| **Owner(s)** | |
| **Started** | 2026-11-24 |
| **Finished** | — |
| **Plan file** | `docs/plan/stages/stage-14-api-access-webhooks.md` |
| **Depends on** | Stages 12–13 (B2B booking, usage, plans) |
| **Modules** | `api-access` (keys, key sign-in), `webhooks` (endpoints, deliveries, guarded sender) |

## Defaults used for this stage (owner can change any of them)

| Topic | Default |
| --- | --- |
| Switch | **`B2B_API_ENABLED` — off by default.** Off: `mb_…` keys are not accepted (401), the key / webhook pages answer "not enabled" (503), no webhook is ever sent. The existing website and the dashboard are never affected |
| Who acts | A key acts as the client member who created it, limited to the key's scopes: its permissions = the creator's **current** permissions ∩ the scopes. Creator removed, company suspended or key revoked → the key stops at once (≤ 5 s cache) |
| Scopes | `hotel:search` (search, offers, price check) · `hotel:book` (book, pay, cancel, amend) · `orders:read` · `wallet:read` · `webhooks:manage` |
| Who manages keys | The client Owner (`api-access.key.manage`; custom roles can be given it); creating a key needs a recent second-factor check (step-up) when the person has MFA on |
| Format | `mb_live_<8 chars>_<40 chars>` (staging / test: `mb_test_…`); only the prefix and SHA-256(secret + server pepper) are stored; the full key is shown once; at most 2 active keys per company (rotation) |
| IP allow-list | Optional list of IPs / CIDR ranges per key; empty = any IP. A key used from a new IP → a bell notice to the Owner (once per IP) |
| Usage | API calls count into the company's one plan pool (D3), split per key on the usage screen; `X-MB-Refresh` is ignored for keys |
| Webhooks | HTTPS endpoints only; events per `06-api-and-events.md` §6; signature `MB-Signature: t=…,v1=HMAC-SHA256(secret, t + "." + body)`; retries 1 m, 5 m, 15 m, 1 h, 3 h, 6 h, 12 h; endpoint switched off after 24 h of failures (Owner told); secret rotation keeps the old secret signing too for 24 h |
| Sender safety | Every webhook call goes through a guarded client: DNS resolved first and private / loopback / link-local / cloud-metadata addresses refused (also on re-resolve), the call made to the checked address, no redirects, 10 s timeout, response kept ≤ 1 KB |
| Test mode | Test keys (`mb_test_`) work only where `B2B_API_ENV=test` (staging); live keys only on production — a key from the wrong place is refused |

## Tasks

| ID | Task | Plan ref | Status | Owner | PR | Tests | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S14-T01 | Setup: task list, defaults, switch | §3 | DONE | AI (Claude) | | — | |
| S14-T02 | API keys (`api_keys`): format, hashing with pepper, scopes ⊆ creator's permissions, IP allow-list, 2 active max, create (shown once) / list / revoke / rotate | §3.1 | DONE | AI (Claude) | | api-keys.test.js | new module `api-access`; migration 0078 `api_keys` (unique prefix); `mb_live_<8>_<40>` / `mb_test_…`, unbiased random text; stored: prefix + SHA-256(secret + pepper), constant-time check; scopes only when the creator holds each scope's permission (`SCOPE_RULES`) and the plan allows the API (caller decides — open while billing is off); at most 2 lasting keys (a race keeps 2); rotate → new key, old one stops after 24 h; revoke; allow-list of IPv4 / IPv6 addresses and CIDR ranges (≤ 20); last use at most once a minute; new IP → event (`api-access.key.used-new-ip`); permissions `api-access.key.read` / `.manage` (client Owner has them). Routes: T07 |
| S14-T03 | Key sign-in in the gateway: `Bearer mb_…` → key → member actor limited to scopes, channel B2B_API, revoke / suspend ≤ 5 s, IP check, last used, new-IP notice, per-key rate limit, usage per key into the client pool | §3.2 | DOING | AI (Claude) | |  |  |
| S14-T04 | Webhook endpoints (`whk_endpoints`): HTTPS URL, events, secret sealed and shown once, rotation with 24 h dual signing; signature | §3.4 | TODO | | | | |
| S14-T05 | Guarded HTTP client: DNS check (private, loopback, link-local, metadata, rebinding), HTTPS only, no redirects, 10 s timeout, 1 KB response | §3.4, security | TODO | | | | |
| S14-T06 | Deliveries (`whk_deliveries`): events → public payload (versioned) → deliveries → sender job; retries; auto-disable after 24 h + notice; replay keeps the event id; test event | §3.4 | TODO | | | | |
| S14-T07 | Routes: `/api-keys`, `/webhook-endpoints` (+ rotate-secret, test), `/webhook-deliveries` (+ replay) | §5 | TODO | | | | |
| S14-T08 | Developer screens in the business area: keys, scopes, IP list, endpoints, delivery log, replay, test event, usage per key | §3.5 | TODO | | | | |
| S14-T09 | API docs: OpenAPI of the client endpoints + guides (quick start, auth, idempotency, price check, lifecycle, errors, webhooks with verification code, limits) | §3.6 | TODO | | | | |
| S14-T10 | Test mode: test / live key separation per environment; magic guest names on staging | §3.3 | TODO | | | | |
| S14-T11 | Mandatory tests: key lifecycle (revoke < 5 s), API bookings in the mixed-channel race, usage per key in the pool, SSRF suite, signature verifiable, retry schedule and auto-disable, replay keeps event id | §8 | TODO | | | | |
