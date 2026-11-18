// @ts-check
/**
 * MusafirBaba admin: margin rules (S05-T04). Write a DRAFT → submit → a different person approves (or sends it
 * back) → ACTIVE; retire an ACTIVE rule; discard a DRAFT. Every change is one conditional update on the version the
 * screen loaded (412 otherwise) that also appends the history line and, on activation / retirement, the event.
 * A rule can replace an ACTIVE one: on approval it takes over at once (`inForce`), and the old rule is then marked
 * RETIRED (if that second step is cut short, prices are still right and approving again finishes it).
 */
import { newEvent } from '../../core/db/events.js';
import { AppError, DomainError, NotFoundError } from '../../core/errors.js';
import { logger } from '../../core/logger.js';
import { EVENTS } from './events.js';
import { marginRuleProblems } from './domain/margin.js';
import { assertSecondPerson, CHECKER_ACTIONS, isLargeChange, ruleTransition } from './domain/rule-lifecycle.js';
import { MarginRuleRecord } from './models/margin-rule.model.js';

/**
 * @typedef {{ clock: import('../../core/clock.js').Clock }} RuleAdminDeps
 * @typedef {{ staffId: string }} Staff
 * @typedef {Omit<import('./domain/margin.js').MarginRule, 'id' | 'createdAt'> & { note?: string | null }} RuleInput
 * @typedef {import('./domain/rule-lifecycle.js').RuleAction} RuleAction
 */

const ID = /^[a-f0-9]{24}$/;
const by = (/** @type {Staff} */ who) => `staff:${who.staffId}`;

/** @param {Record<string, any>} d */
export function ruleDto(d) {
  return {
    id: String(d._id),
    key: d.key ?? null,
    name: d.name,
    note: d.note ?? null,
    priority: d.priority,
    match: Object.fromEntries(Object.entries(d.match ?? {}).filter(([, v]) => v !== undefined && v !== null)),
    adjustment: {
      type: d.adjustment.type,
      value: d.adjustment.value,
      minPaise: d.adjustment.minPaise ?? null,
      maxPaise: d.adjustment.maxPaise ?? null,
    },
    allowBelowNet: d.allowBelowNet === true,
    effectiveFrom: d.effectiveFrom ?? null,
    effectiveTo: d.effectiveTo ?? null,
    status: d.status,
    replaces: d.replaces ?? null,
    createdBy: d.createdBy,
    submittedBy: d.submittedBy ?? null,
    approvedBy: d.approvedBy ?? null,
    approvedAt: d.approvedAt ?? null,
    retiredBy: d.retiredBy ?? null,
    retiredAt: d.retiredAt ?? null,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    version: d.version ?? 1,
  };
}

/** @param {RuleInput} input */
function checked(input) {
  const errors = marginRuleProblems(input);
  if (errors.length > 0) throw new DomainError('MARGIN_RULE_INVALID', { errors });
  const { name, note, priority, match, adjustment, allowBelowNet, effectiveFrom, effectiveTo, replaces } = input;
  return {
    name: name.trim(),
    note: note?.trim() || null,
    priority,
    match,
    adjustment: {
      type: adjustment.type,
      value: adjustment.value,
      minPaise: adjustment.minPaise ?? null,
      maxPaise: adjustment.maxPaise ?? null,
    },
    allowBelowNet: allowBelowNet === true,
    effectiveFrom: effectiveFrom ?? null,
    effectiveTo: effectiveTo ?? null,
    replaces: replaces ?? null,
  };
}

/** @param {string} id */
async function load(id) {
  const doc = ID.test(id) ? await MarginRuleRecord.findById(id).lean() : null;
  if (!doc) throw new NotFoundError('MARGIN_RULE_NOT_FOUND');
  return doc;
}

/** A replaced rule must be ACTIVE when the replacement is written. @param {string | null} replaces */
async function assertReplaceable(replaces) {
  if (!replaces) return;
  const target = ID.test(replaces) ? await MarginRuleRecord.findById(replaces, { status: 1 }).lean() : null;
  if (!target || target.status !== 'ACTIVE')
    throw new DomainError('MARGIN_RULE_INVALID', { errors: [{ code: 'REPLACES_NOT_ACTIVE', field: 'replaces' }] });
}

/**
 * One conditional update: status move + history line (+ event) on the loaded version.
 * @param {RuleAdminDeps} deps
 * @param {Record<string, any>} doc
 * @param {{ action: RuleAction | 'replaced', to: string, who: string, note?: string | null, set?: Record<string, unknown>, event?: string }} step
 */
async function write(deps, doc, step) {
  const at = deps.clock.now();
  /** @type {Record<string, any>} */
  const update = {
    $set: { ...step.set, status: step.to },
    $inc: { version: 1 },
    $push: { history: { at, action: step.action, by: step.who, note: step.note ?? null, status: step.to } },
  };
  if (step.event) {
    const payload = { orgId: 'platform', ruleId: String(doc._id), name: doc.name, channels: doc.match?.channels ?? null };
    update.$push.pendingEvents = newEvent(step.event, payload, deps);
    update.$set.hasPendingEvents = true;
  }
  const res = await MarginRuleRecord.updateOne({ _id: doc._id, status: doc.status, version: doc.version ?? 1 }, update);
  if (res.modifiedCount !== 1) throw new AppError('VERSION_CONFLICT', 412, 'The rule was changed meanwhile — reload and try again');
  return at;
}

/**
 * After approving a replacement: mark the old rule RETIRED (repeat-safe; nothing to do if it is no longer ACTIVE).
 * @param {RuleAdminDeps} deps
 * @param {Record<string, any>} rule the approved replacement
 * @param {string} who
 */
async function retireReplaced(deps, rule, who) {
  if (!rule.replaces) return;
  const old = await MarginRuleRecord.findById(rule.replaces).lean();
  if (!old || old.status !== 'ACTIVE') return;
  if (isLargeChange(old.adjustment, rule.adjustment))
    logger.warn(
      { ruleId: String(rule._id), replaces: String(old._id), before: old.adjustment, after: rule.adjustment },
      'pricing: large margin change approved',
    );
  const at = deps.clock.now();
  await write(deps, old, {
    action: 'replaced',
    to: 'RETIRED',
    who,
    note: `Replaced by ${rule.name} (${String(rule._id)})`,
    set: { retiredBy: who, retiredAt: at },
    event: EVENTS.ruleRetired,
  }).catch(() => logger.warn({ ruleId: String(old._id) }, 'pricing: replaced rule changed meanwhile — prices already use the replacement'));
}

/**
 * Status move of an existing rule.
 * @param {RuleAdminDeps} deps
 * @param {{ who: Staff, id: string, version: number, action: Exclude<RuleAction, 'edit'>, note?: string | null }} a
 */
async function act(deps, a) {
  const doc = await load(a.id);
  if ((doc.version ?? 1) !== a.version)
    throw new AppError('VERSION_CONFLICT', 412, 'The rule was changed meanwhile — reload and try again');
  const to = ruleTransition(doc.status, a.action);
  const who = by(a.who);
  if (CHECKER_ACTIONS.includes(a.action)) assertSecondPerson(doc, who);
  const now = deps.clock.now();
  /** @type {Record<RuleAction, Record<string, unknown>>} */
  const sets = {
    edit: {},
    submit: { submittedBy: who, submittedAt: now },
    approve: { approvedBy: who, approvedAt: now },
    reject: { submittedBy: null, submittedAt: null },
    retire: { retiredBy: who, retiredAt: now },
    discard: { retiredBy: who, retiredAt: now },
  };
  const event = a.action === 'approve' ? EVENTS.ruleActivated : a.action === 'retire' ? EVENTS.ruleRetired : undefined;
  await write(deps, doc, { action: a.action, to, who, note: a.note ?? null, set: sets[a.action], event });
  if (a.action === 'approve') await retireReplaced(deps, doc, who);
  return ruleDto(await load(a.id));
}

/** @param {RuleAdminDeps} deps */
export function createRuleAdminService(deps) {
  return {
    /** @param {{ status?: string }} f */
    async list(f) {
      const filter = f.status ? { status: f.status } : {};
      const docs = await MarginRuleRecord.find(filter, { history: 0, pendingEvents: 0 })
        .sort({ status: 1, priority: -1, createdAt: 1 })
        .limit(500)
        .lean();
      return docs.map(ruleDto);
    },

    /** @param {string} id */
    async get(id) {
      const doc = await load(id);
      return { ...ruleDto(doc), history: doc.history ?? [] };
    },

    /** @param {Staff} who @param {RuleInput} input */
    async create(who, input) {
      const fields = checked(input);
      await assertReplaceable(fields.replaces);
      const history = [{ at: deps.clock.now(), action: 'created', by: by(who), note: fields.note, status: 'DRAFT' }];
      const doc = await MarginRuleRecord.create({ ...fields, status: 'DRAFT', createdBy: by(who), history });
      return ruleDto(doc.toObject());
    },

    /** Only a DRAFT. @param {Staff} who @param {string} id @param {number} version @param {RuleInput} input */
    async update(who, id, version, input) {
      const doc = await load(id);
      if ((doc.version ?? 1) !== version)
        throw new AppError('VERSION_CONFLICT', 412, 'The rule was changed meanwhile — reload and try again');
      ruleTransition(doc.status, 'edit');
      const fields = checked(input);
      await assertReplaceable(fields.replaces);
      await write(deps, doc, { action: 'edit', to: 'DRAFT', who: by(who), set: fields });
      return ruleDto(await load(id));
    },

    /** @param {{ who: Staff, id: string, version: number, action: Exclude<RuleAction, 'edit'>, note?: string | null }} a */
    act: (a) => act(deps, a),
  };
}
