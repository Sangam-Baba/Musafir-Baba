# 08 — AI Code Editor Playbook

> How to get senior-quality code from your AI editor on this project: **small tasks, fixed rules, tests first, humans review the dangerous parts.**

---

## 1. One-time setup (Stage 00)

1. Copy this plan folder into the repo as `docs/plan/`.
2. Copy `templates/AGENTS.md` to the backend repo root (and as `CLAUDE.md` / `.cursor/rules/project.mdc` / your editor's rules file).
3. Create `docs/modules/`, `docs/adr/`, `docs/runbooks/`, and copy `docs/plan/templates/progress/` to `docs/progress/` (see §7).
4. Build the module generator (`npm run gen:module <name>`) so every module starts identical.
5. CI is the referee: "done" means lint, typecheck, tests and boundary rules all pass.

## 2. First session: let the editor map your existing code

```
Read AGENTS.md and docs/plan/stages/stage-00-foundations.md §3.1.
Task: produce docs/existing-system-map.md — do NOT change code.
Cover: Express app entry & middleware order; auth (website `User`, admin `Staff`); Mongo connection
(Atlas tier, region, Mongoose settings); PayU integration (hash, callbacks, verify/refund APIs);
file storage (R2/Cloudinary/S3); AuditLog model + audit plugin; the existing website bookings page;
how the Next.js app serves the website, /admin and proxy.ts; Dockerfile and deployment.
Also list the existing app notification code (`services/notification/*`, Ably, Expo push, `Notification` model) as **do-not-touch** — the new system does not use it.
Ignore the vehicle-partner module (MBGO/MBConnect) — it is unrelated to this system.
End with risks for adding src/modules/* and a list of reusable pieces.
```

## 3. Every work session

```
0. Read `docs/progress/STATUS.md`, the current `docs/progress/stages/stage-NN.md` and the last 3 entries of `docs/progress/SESSION-LOG.md`.
1. Pick ONE task (`SNN-Txx`) from the current stage progress file; set it to `DOING`.
2. Fill templates/stage-prompt-template.md.
3. Ask for a plan first (files, collections, endpoints, tests). Review it.
4. Tests first (failing), then implementation.
5. Run lint, typecheck, tests. Paste failures back verbatim.
6. Ask the editor to self-review against the PR template and list risks.
7. Human review → merge. The same PR sets the task to `DONE` (or `DEFERRED` with a `DEF-…` row) and `npm run progress` refreshes `STATUS.md`.
8. Add a `SESSION-LOG.md` entry before ending the session.
```

## 4. Task size

| Good | Too big |
| --- | --- |
| "Implement `holdRooms` with conditional updates in a transaction + its race test" | "Build the booking system" |
| "KYC review screen: approve/reject with notes" | "Build the admin panel" |
| "Margin rule evaluation + property tests" | "Do pricing" |

One task ≈ one PR ≈ < 400 changed lines.

## 5. Where AI code looks right but isn't — check by hand

| Area | Check |
| --- | --- |
| Inventory | Conditional `$expr` filter present; `modifiedCount` checked; inside `withTransaction`; no TTL index on holds; release guarded by status |
| Tenancy | Every query scoped by `ctx`; no `req.body.orgId`; plugin not bypassed without reason |
| Mongo safety | No raw `req.body`/`req.query` in filters/updates; `.strict()` zod; `$`-keys rejected; no global `sanitizeFilter`; no platform account documents written inside booking transactions; partial (not sparse) unique indexes |
| Money | Integer paise; `Money` used; rounding explicit; ledger lines balance |
| Time | Stay dates as strings; hotel time zone for deadlines; `clock.now()` not `new Date()` |
| Transactions | No HTTP/PayU/email calls inside; short; idempotent callback |
| Coding standards | Follows `10-coding-standards.md`: right file per role, function/file size, no `any`/enum/default export, `@core` helpers, frontend React Query + RHF patterns |
| Notifications / realtime | Only via the new `notifications` module and the self-hosted Socket.IO emitter; inbox row before push; no imports of existing `services/notification/*`, Ably, Expo or any third-party messaging SDK |
| Authorization | Object-level check after load; correct scope |
| Errors | Typed; no stack/Mongo errors leaked |
| Tests | Failure paths, permission and isolation tests exist; not just mocks asserting calls |
| Naming | "client" and "hotel", never "partner" in new code; nothing imported from the vehicle-partner module |

## 6. Keeping sessions consistent

- ADRs are the memory — point every session at `docs/adr/`.
- When the editor repeats a mistake twice, add a line to "Known mistakes" in `AGENTS.md`.
- Keep `AGENTS.md` short (< 300 lines); details stay in `docs/plan/`.
- Parallel sessions only on **different modules**; shared `core/` changes in their own PR.

## 7. Progress tracking (every session, every PR)

Files live in `docs/progress/` (templates and full rules: `docs/plan/templates/progress/README.md`).

| When | Do this |
| --- | --- |
| Session starts | Read `STATUS.md`, the current stage progress file, the last 3 `SESSION-LOG.md` entries. Tell the AI which task ID you're working on |
| Stage starts | Copy `stage-progress-template.md` → `stages/stage-NN.md`; list every work-breakdown item as `SNN-Txx` tasks; copy the Definition of Done and mandatory tests; set the stage `IN_PROGRESS` in `STATUS.md` |
| Task starts | Set it to `DOING` (with owner) |
| PR opens / merges | Task → `REVIEW` / `DONE` in the same PR as the code; run `npm run progress` |
| Something won't be built now | Add a `DEF-…` row to `DEFERRED.md` (why, who, revisit when) and mark the task `DEFERRED` — never skip silently |
| Something is stuck | Task → `BLOCKED`; add the blocker to `STATUS.md` → Blockers with an owner and next action |
| Plan and reality differ | Note it under "Changes from the plan" in the stage file; write an ADR if it changes a decision |
| Session ends | Add a `SESSION-LOG.md` entry: goal, done, not done and why, PR, tests run, next step |
| Stage ends | Only when every task is `DONE`/`DEFERRED`/`DROPPED`, every DoD box is ticked and mandatory tests are green — confirmed by a human reviewer |

Prompt line to add to every AI task: *"Before finishing, update the task status in `docs/progress/stages/stage-NN.md`, run `npm run progress`, record anything you didn't build in `DEFERRED.md`, and append a `SESSION-LOG.md` entry."*
