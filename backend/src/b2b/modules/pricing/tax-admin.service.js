// @ts-check
/**
 * MusafirBaba admin: GST rates and pricing settings (S05-T07). Holders of `pricing.tax.manage` only.
 * GST rates are never edited: a change is a new dated rule (PENDING_APPROVAL) that a **different** person approves
 * or rejects. A rule may follow (`replaces`) an ACTIVE rule; on approval the old rule is first closed the day before
 * the new one starts, then the new one becomes ACTIVE — if the second step is cut short those dates simply have no
 * rate (quotes are refused, never priced wrong) and approving again finishes it. Overlaps are refused.
 * Settings (issuing GSTINs, hotels without GST, principal / agent) change on the loaded version, with history.
 */
import { randomBytes } from 'node:crypto';

import { newEvent } from '../../core/db/events.js';
import { AppError, DomainError, NotFoundError } from '../../core/errors.js';
import { publishCacheEvict } from '../../core/realtime/signals.js';
import { GST_STATES, isValidGstin } from '../kyc/index.js';
import { EVENTS } from './events.js';
import { assertSecondPerson } from './domain/rule-lifecycle.js';
import { overlappingRules, taxRuleProblems } from './domain/tax.js';
import { PricingSettingsRecord, SETTINGS_ID } from './models/settings.model.js';
import { TaxRuleRecord } from './models/tax-rule.model.js';
import { PRICING_CACHE_PREFIX, readSettings } from './quote.service.js';
import { toRule } from './tax-rules.service.js';

/**
 * @typedef {{ clock: import('../../core/clock.js').Clock, logger: import('../../core/logger.js').Logger }} TaxAdminDeps
 * @typedef {{ staffId: string }} Staff
 * @typedef {Omit<import('./domain/tax.js').TaxRule, 'key'> & { replaces?: string | null }} TaxRuleInput
 * @typedef {import('./domain/quote.js').PricingSettings} PricingSettings
 */

const ID = /^[a-f0-9]{24}$/;
const by = (/** @type {Staff} */ who) => `staff:${who.staffId}`;
const conflict = () => new AppError('VERSION_CONFLICT', 412, 'Changed meanwhile — reload and try again');

/** @param {string} date @param {number} days */
const shift = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** @param {Record<string, any>} d */
export function taxRuleDto(d) {
  return {
    id: String(d._id),
    ...toRule(d),
    status: d.status,
    replaces: d.replaces ?? null,
    proposedBy: d.proposedBy,
    approvedBy: d.approvedBy ?? null,
    rejectedBy: d.rejectedBy ?? null,
    version: d.version ?? 1,
    history: d.history ?? [],
  };
}

/** @param {string} id */
async function load(id) {
  const doc = ID.test(id) ? await TaxRuleRecord.findById(id).lean() : null;
  if (!doc) throw new NotFoundError('TAX_RULE_NOT_FOUND');
  return doc;
}

/**
 * The rates that would be in force after approving `doc` (old rule closed) — must not overlap.
 * @param {Record<string, any>} doc
 */
async function assertNoOverlap(doc) {
  const active = (await TaxRuleRecord.find({ status: 'ACTIVE' }).lean()).map(toRule);
  const closeTo = shift(doc.effectiveFrom, -1);
  const after = [...active.map((r) => (r.key === doc.replaces ? { ...r, effectiveTo: closeTo } : r)), toRule(doc)];
  const clashes = overlappingRules(after.filter((r) => r.effectiveTo === null || r.effectiveTo >= r.effectiveFrom));
  if (clashes.length > 0) throw new DomainError('TAX_RULES_OVERLAP', { pairs: clashes });
}

/**
 * Close the followed rule the day before (repeat-safe), then activate.
 * @param {TaxAdminDeps} deps
 * @param {Record<string, any>} doc
 * @param {string} who
 */
async function activate(deps, doc, who) {
  const at = deps.clock.now();
  if (doc.replaces) {
    const closeTo = shift(doc.effectiveFrom, -1);
    await TaxRuleRecord.updateOne(
      { key: doc.replaces, status: 'ACTIVE', $or: [{ effectiveTo: null }, { effectiveTo: { $gt: closeTo } }] },
      {
        $set: { effectiveTo: closeTo },
        $push: { history: { at, action: 'closed', by: who, note: `Followed by ${doc.key}`, status: 'ACTIVE' } },
      },
    );
  }
  const payload = { orgId: 'platform', taxRuleKey: doc.key, appliesTo: doc.appliesTo, effectiveFrom: doc.effectiveFrom };
  const res = await TaxRuleRecord.updateOne(
    { _id: doc._id, status: 'PENDING_APPROVAL', version: doc.version ?? 1 },
    {
      $set: { status: 'ACTIVE', approvedBy: who, approvedAt: at, hasPendingEvents: true },
      $inc: { version: 1 },
      $push: {
        history: { at, action: 'approve', by: who, note: null, status: 'ACTIVE' },
        pendingEvents: newEvent(EVENTS.taxRuleActivated, payload, deps),
      },
    },
  );
  if (res.modifiedCount !== 1) throw conflict();
}

/**
 * @param {TaxAdminDeps} deps
 * @param {Record<string, any>} doc
 * @param {{ who: string, note: string | null }} r
 */
async function reject(deps, doc, r) {
  const res = await TaxRuleRecord.updateOne(
    { _id: doc._id, status: 'PENDING_APPROVAL', version: doc.version ?? 1 },
    {
      $set: { status: 'REJECTED', rejectedBy: r.who },
      $inc: { version: 1 },
      $push: { history: { at: deps.clock.now(), action: 'reject', by: r.who, note: r.note, status: 'REJECTED' } },
    },
  );
  if (res.modifiedCount !== 1) throw conflict();
}

/** @param {PricingSettings} s @returns {{ code: string, field: string }[]} */
export function settingsProblems(s) {
  const out = [];
  if (s.model !== 'PRINCIPAL') out.push({ code: 'PRICING_MODEL_NOT_BUILT', field: 'model' });
  if (s.issuers.length < 1 || s.issuers.filter((i) => i.isDefault).length !== 1) out.push({ code: 'ONE_DEFAULT_ISSUER', field: 'issuers' });
  s.issuers.forEach((i, n) => {
    if (!Object.prototype.hasOwnProperty.call(GST_STATES, i.stateCode))
      out.push({ code: 'STATE_INVALID', field: `issuers.${n}.stateCode` });
    if (i.gstin !== null && (!isValidGstin(i.gstin) || i.gstin.slice(0, 2) !== i.stateCode))
      out.push({ code: 'GSTIN_INVALID', field: `issuers.${n}.gstin` });
  });
  if (new Set(s.issuers.map((i) => i.stateCode)).size !== s.issuers.length) out.push({ code: 'STATE_REPEATED', field: 'issuers' });
  return out;
}

/** @param {TaxAdminDeps} deps */
export function createTaxAdminService(deps) {
  const evict = () =>
    publishCacheEvict(PRICING_CACHE_PREFIX, deps).catch((error) => deps.logger.warn({ err: error }, 'pricing: cache evict failed'));
  return {
    async list() {
      const docs = await TaxRuleRecord.find({}, { pendingEvents: 0 }).sort({ appliesTo: 1, effectiveFrom: -1, slabMinPaise: 1 }).lean();
      return docs.map(taxRuleDto);
    },

    /** @param {Staff} who @param {TaxRuleInput} input */
    async propose(who, input) {
      const key = `${input.appliesTo.toLowerCase()}-${input.effectiveFrom}-${randomBytes(3).toString('hex')}`;
      const rule = { ...input, key, replaces: input.replaces ?? null, sourceNote: input.sourceNote.trim() };
      const errors = taxRuleProblems(rule);
      if (errors.length > 0) throw new DomainError('TAX_RULE_INVALID', { errors });
      if (rule.replaces && !(await TaxRuleRecord.exists({ key: rule.replaces, status: 'ACTIVE', appliesTo: rule.appliesTo })))
        throw new DomainError('TAX_RULE_INVALID', { errors: [{ code: 'REPLACES_NOT_ACTIVE', field: 'replaces' }] });
      await assertNoOverlap(rule);
      const history = [{ at: deps.clock.now(), action: 'proposed', by: by(who), note: rule.sourceNote, status: 'PENDING_APPROVAL' }];
      const doc = await TaxRuleRecord.create({ ...rule, status: 'PENDING_APPROVAL', proposedBy: by(who), history });
      return taxRuleDto(doc.toObject());
    },

    /** @param {{ who: Staff, id: string, version: number, approve: boolean, note?: string | null }} a */
    async decide(a) {
      const doc = await load(a.id);
      if ((doc.version ?? 1) !== a.version) throw conflict();
      if (doc.status !== 'PENDING_APPROVAL') throw new DomainError('RULE_STATUS', { status: doc.status });
      assertSecondPerson({ createdBy: doc.proposedBy }, by(a.who));
      if (a.approve) {
        await assertNoOverlap(doc);
        await activate(deps, doc, by(a.who));
      } else await reject(deps, doc, { who: by(a.who), note: a.note ?? null });
      return taxRuleDto(await load(a.id));
    },

    async settings() {
      const doc = await PricingSettingsRecord.findById(SETTINGS_ID).lean();
      return { ...(await readSettings()), version: doc?.version ?? 0, history: doc?.history ?? [] };
    },

    /** @param {Staff} who @param {number} version @param {PricingSettings & { note: string }} next */
    async updateSettings(who, version, next) {
      const { note, ...settings } = next;
      const errors = settingsProblems(settings);
      if (errors.length > 0) throw new DomainError('PRICING_SETTINGS_INVALID', { errors });
      const before = await readSettings();
      const at = deps.clock.now();
      const res = await PricingSettingsRecord.updateOne(
        { _id: SETTINGS_ID, version },
        { $set: settings, $inc: { version: 1 }, $push: { history: { at, by: by(who), note, before, after: settings } } },
      );
      if (res.modifiedCount !== 1) throw conflict();
      await evict();
      return this.settings();
    },
  };
}
