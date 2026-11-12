# Pull Request

## What & why
<!-- Stage NN §x.y — link task and stage file -->

## Changes
- Modules:
- Collections / indexes / validators / migrations:
- New dependencies (+ why):
- Feature flag:

## Coding standards (`10-coding-standards.md`)
- [ ] Right file per role; controllers thin; domain pure; functions ≤ 40 lines, files ≤ 300
- [ ] No `any` / `!` / `enum` / default exports; exhaustive switches; `z.strictObject` with limits
- [ ] Money/dates/ids/errors/logging via `@core`; frontend uses React Query + generated client + RHF/zod
- [ ] Notifications/realtime only via the new notifications module and self-hosted Socket.IO; no third-party messaging SDK; existing app notification code untouched
- [ ] No legacy code reformatted

## Architecture
- [ ] Only other modules' `index.ts` imported; only own collections touched
- [ ] Logic in the right layer; controllers thin
- [ ] Events via outbox, versioned; consumers idempotent
- [ ] No network calls inside Mongo transactions
- [ ] No changes to legacy code (or explained)

## Security
- [ ] Every new route: permission + object-level check + rate limit
- [ ] Tenant isolation tests for new collections/endpoints
- [ ] zod `.strict()`; no raw request objects in queries
- [ ] No secrets/PII in logs, URLs, errors
- [ ] Abuse cases: replay, race, enumeration, automation

## Correctness
- [ ] Money via `Money` (paise); no floats
- [ ] Stay dates as strings; deadlines in hotel time zone; `Clock` used
- [ ] Inventory via conditional `$expr` updates in transactions; `modifiedCount` checked
- [ ] Idempotency on retried operations; optimistic `version` checks

## Tests
- [ ] Unit (incl. failure paths)  - [ ] Property  - [ ] Integration (MongoMemoryReplSet)  - [ ] API  - [ ] E2E (UI)
- Notable cases:

## Ops
- [ ] Logs/metrics; alert + runbook if it can page
- [ ] OpenAPI, module README, ADR updated
- [ ] Admin screen for anything configurable

## Progress
- Task ID(s): `SNN-Txx`
- [ ] Task status updated in `docs/progress/stages/stage-NN.md`; `npm run progress` run
- [ ] Anything not built is recorded in `DEFERRED.md` (`DEF-…`) and the task marked `DEFERRED`
- [ ] Blockers (if any) listed in `STATUS.md`

## Screenshots (UI) / Risks / Notes for reviewers
