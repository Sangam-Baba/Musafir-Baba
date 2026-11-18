// @ts-check
/**
 * A B2B client's own markup (S05-T08): read for the client's people, changed by holders of `pricing.markup.manage`
 * on the loaded version (`If-Match`; 0 = never saved). The org always comes from the signed-in member, never the
 * request. Display only — nothing here is used by quotes, tokens or invoices.
 */
import { AppError, DomainError, ForbiddenError } from '../../core/errors.js';
import { markupProblems } from './domain/markup.js';
import { ClientMarkupRecord } from './models/client-markup.model.js';

/** @typedef {import('./domain/markup.js').Markup} Markup */

/** @type {Markup} */
const NONE = { enabled: false, adjustment: { type: 'PERCENT', value: 0, minPaise: null, maxPaise: null }, overrides: [] };

/** @param {import('../../core/context.js').RequestContext} ctx */
function orgOf(ctx) {
  if (ctx.actor.type !== 'member') throw new ForbiddenError();
  return { orgId: ctx.actor.orgId, by: `user:${ctx.actor.userId}` };
}

/** @param {Record<string, any> | null} d */
function dto(d) {
  if (!d) return { ...NONE, version: 0 };
  /** @param {Record<string, any>} a */
  const adj = (a) => ({ type: a.type, value: a.value, minPaise: a.minPaise ?? null, maxPaise: a.maxPaise ?? null });
  return {
    enabled: d.enabled,
    adjustment: adj(d.adjustment),
    overrides: (d.overrides ?? []).map((/** @type {any} */ o) => ({
      match: Object.fromEntries(Object.entries(o.match ?? {}).filter(([, v]) => v !== undefined && v !== null)),
      adjustment: adj(o.adjustment),
    })),
    version: d.version ?? 1,
  };
}

/** Client markups (display only). */
export function createMarkupService() {
  return {
    /** @param {import('../../core/context.js').RequestContext} ctx */
    async get(ctx) {
      return dto(await ClientMarkupRecord.findOne({ clientOrgId: orgOf(ctx).orgId }).lean());
    },

    /** For quote screens (Stage 12). @param {string} clientOrgId @returns {Promise<Markup | null>} */
    async forClient(clientOrgId) {
      const d = await ClientMarkupRecord.findOne({ clientOrgId }).lean();
      return d ? dto(d) : null;
    },

    /** @param {import('../../core/context.js').RequestContext} ctx @param {number} version @param {Markup} next */
    async put(ctx, version, next) {
      const { orgId, by } = orgOf(ctx);
      const errors = markupProblems(next);
      if (errors.length > 0) throw new DomainError('MARKUP_INVALID', { errors });
      const fields = { enabled: next.enabled, adjustment: next.adjustment, overrides: next.overrides, updatedBy: by };
      if (version === 0) {
        await ClientMarkupRecord.create({ clientOrgId: orgId, ...fields }).catch((error) => {
          if (error?.code === 11000) throw new AppError('VERSION_CONFLICT', 412, 'Changed meanwhile — reload and try again');
          throw error;
        });
      } else {
        const res = await ClientMarkupRecord.updateOne({ clientOrgId: orgId, version }, { $set: fields, $inc: { version: 1 } });
        if (res.modifiedCount !== 1) throw new AppError('VERSION_CONFLICT', 412, 'Changed meanwhile — reload and try again');
      }
      return this.get(ctx);
    },
  };
}
