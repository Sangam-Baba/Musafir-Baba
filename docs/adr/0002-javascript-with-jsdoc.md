# ADR-0002: JavaScript + JSDoc + // @ts-check for new backend code

| | |
| --- | --- |
| **Status** | Accepted |
| **Date** | 2026-11-12 |
| **Deciders** | Owner + tech lead |
| **Stage** | Stage 00 |

## Context

The existing backend is plain JavaScript with no build step. TypeScript would need a build and a Dockerfile change.

## Decision

New backend code is ES modules with JSDoc types and `// @ts-check`, checked by `npm run typecheck:b2b` (tsc --noEmit with `checkJs`, `strict`). Frontend code stays TypeScript.

## Options considered

| Option | Pros | Cons |
| --- | --- | --- |
| JS + JSDoc + checkJs (chosen) | No build/deploy change; strict type checking | Type syntax is more verbose |
| TypeScript with build | Best ergonomics | Changes the existing Dockerfile/start command |
| Plain JS | Nothing to set up | No type safety for money/dates/tenancy |

## Consequences

- Positive: zero deployment change.
- Trade-off: JSDoc verbosity.
- Follow-up: keep `typecheck:b2b` green in CI.

## Validation

`npm run typecheck:b2b` in `.github/workflows/b2b-guards.yml`.
