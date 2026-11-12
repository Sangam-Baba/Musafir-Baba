# Architecture Decision Records

Decisions for the B2B + hotel system (Stage 00, 2026-11-12). Template: `docs/plan/templates/ADR-template.md`. Never rewrite an accepted ADR — supersede it with a new one.

| ADR | Decision |
| --- | --- |
| [0001](0001-isolated-b2b-folder.md) | New code isolated in backend/src/b2b inside the existing backend |
| [0002](0002-javascript-with-jsdoc.md) | JavaScript + JSDoc + // @ts-check for new backend code |
| [0003](0003-no-multi-document-transactions.md) | No multi-document transactions or change streams — patterns P1–P5 |
| [0004](0004-tenant-guard.md) | Tenant guard: repository rule + Mongoose plugin |
| [0005](0005-events-outbox-job-queue.md) | Events in the document, outbox relay, MongoDB job queue (no Redis) |
| [0006](0006-money-paise-stay-dates.md) | Money in integer paise; stay dates as calendar strings |
| [0007](0007-public-references.md) | Random public references with a check character |
| [0008](0008-one-booking-engine.md) | One booking engine for all channels |
| [0009](0009-payu-flow.md) | PayU payment flow — own callbacks and txn prefixes, verify before confirm |
| [0010](0010-self-hosted-realtime.md) | Self-hosted Socket.IO via capped rt_signals |
| [0011](0011-business-area-path.md) | Business area as /business path; flagged frontend edits E1–E4 only |
| [0012](0012-derived-balances.md) | Derived balances for platform and hotel accounts |
| [0013](0013-no-global-sanitize-filter.md) | No global sanitizeFilter — key validation instead |
| [0014](0014-zero-impact-guards.md) | Zero-impact guards |
