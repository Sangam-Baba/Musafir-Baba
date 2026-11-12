# ADR-0014: Zero-impact guards

| | |
| --- | --- |
| **Status** | Accepted |
| **Date** | 2026-11-12 |
| **Deciders** | Owner + tech lead |
| **Stage** | Stage 00 |

## Context

The owner requires no risk to working logic; rules need enforcement, not just documentation.

## Decision

Prefix guard (B2B models only on allowed prefixes), migration runner (prefix-checked), own Mongoose instance with autoIndex/autoCreate off (no existing global plugins), read-only `legacy-read`, `npm run b2b:guards` (paths, app.js lines, package.json/lockfile additions only, code rules) in a B2B-only CI workflow on GitHub-hosted runners.

## Options considered

| Option | Pros | Cons |
| --- | --- | --- |
| Automated guards (chosen) | Mistakes blocked before merge | Some upkeep |
| Review only | No tooling | Relies on attention |

## Consequences

- Positive: violations fail CI.
- Trade-off: approved-edit list must be kept current.
- Follow-up: add frontend E1–E4 to the guard when frontend work starts.

## Validation

`tests/b2b/guards.test.js`, `prefix-guard.test.js`, `legacy-read.test.js`, `migrations.test.js`.
