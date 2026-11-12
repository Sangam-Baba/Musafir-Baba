# Task Prompt Template

One prompt = one task = one PR. Fill the `<…>` parts.

```
CONTEXT
Read first: AGENTS.md, docs/plan/01-architecture.md, docs/plan/02-engineering-standards.md,
docs/plan/03-security-baseline.md, docs/plan/stages/<stage-file>.md §<x.y>, docs/modules/<module>.md,
(rooms/bookings/money?) docs/plan/05-inventory-and-no-double-booking.md, docs/adr/ index.
Current state: <from docs/progress/STATUS.md and docs/progress/stages/stage-NN.md>. Task ID: <SNN-Txx>.

GOAL
Stage <NN> §<x.y> — <one sentence>.

SCOPE
Build: <bullets>
Do NOT build: <exclusions>
Allowed to change: src/modules/<a>/**, <ui path>/**
Must not change: other modules' internals, src/core, existing legacy code, ADRs.

DATA
Collections/fields/indexes/validators: <list>. Ownership fields: <orgId | clientOrgId+hotelOrgId…>.

INTERFACES
Service methods: <signatures>. Endpoints: <method path permission idempotent? billable?>.
Events emitted/consumed: <names + version>.

SECURITY
Threats: <from stage file>. Required controls: <list>.

TESTS FIRST
1. <happy path>
2. <failure path>
3. <permission + tenant isolation>
4. <concurrency / idempotency, if relevant>

PROCESS
1. Reply with a plan; wait for "go".
2. Failing tests → implementation.
3. Run lint, typecheck, test, test:arch until green.
4. Self-review against templates/pull-request-template.md.
5. Update progress: task status in docs/progress/stages/stage-NN.md, run `npm run progress`,
   add DEF-… rows for anything not built, append a SESSION-LOG.md entry.

OUTPUT
Summary · files changed · migrations · assumptions · open questions · risks.
```
