// @ts-check
/**
 * A bus company's cancellation slabs (plan Stage 18 B7): read (the default when none is set), save whole with a version
 * check (every problem at once; the change log keeps the last 50 versions), and the slabs to copy into a new booking.
 */
import { systemScope } from '../../core/db/tenant-plugin.js';
import { ConflictError, DomainError } from '../../core/errors.js';
import { DEFAULT_BUS_SLABS, slabProblems, slabText } from './domain/cancellation.js';
import { CancellationPolicyRecord } from './models/cancellation-policy.model.js';

const SCOPE = systemScope('bus-catalog: cancellation slabs for a sale', { routine: true });

/** @param {Record<string, any> | null} p */
const dto = (p) => {
  const slabs = p ? p.slabs.map((/** @type {any} */ s) => ({ hoursBefore: s.hoursBefore, percent: s.percent })) : [...DEFAULT_BUS_SLABS];
  return { slabs, summary: slabText(slabs), isDefault: !p, version: p?.version ?? 0 };
};

/** @param {{ clock: import('../../core/clock.js').Clock }} deps */
export function createCancellationPolicies(deps) {
  return {
    /** @param {string} orgId */
    get: async (orgId) => dto(await CancellationPolicyRecord.findOne({ operatorOrgId: orgId }).lean()),
    /** @param {{ orgId: string, userId: string }} who @param {{ slabs: { hoursBefore: number, percent: number }[], expectedVersion: number }} a */
    async save(who, a) {
      const problems = slabProblems(a.slabs);
      if (problems.length) throw new DomainError('SLABS_INVALID', { problems });
      const entry = { at: deps.clock.now(), by: `user:${who.userId}`, slabs: a.slabs };
      if (a.expectedVersion === 0) {
        await CancellationPolicyRecord.create({ operatorOrgId: who.orgId, slabs: a.slabs, history: [entry] }).catch(
          (/** @type {any} */ e) => {
            throw e?.code === 11000 ? new ConflictError('VERSION_CONFLICT') : e;
          },
        );
      } else {
        const res = await CancellationPolicyRecord.updateOne(
          { operatorOrgId: who.orgId, version: a.expectedVersion },
          { $set: { slabs: a.slabs }, $inc: { version: 1 }, $push: { history: { $each: [entry], $slice: -50 } } },
        );
        if (res.modifiedCount !== 1) throw new ConflictError('VERSION_CONFLICT');
      }
      return dto(await CancellationPolicyRecord.findOne({ operatorOrgId: who.orgId }).lean());
    },
    /** The slabs a booking is sold with (system scope — the buyer isn't the operator). @param {string} orgId */
    forSale: async (orgId) => dto(await CancellationPolicyRecord.findOne({ operatorOrgId: orgId }).setOptions(SCOPE).lean()),
  };
}
