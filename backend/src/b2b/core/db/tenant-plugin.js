// @ts-check
/**
 * Tenant guard — the safety net behind the repository rule (docs/plan/01-architecture.md §6.2).
 * On a tenant model, every query, update, delete, count, distinct, aggregate and bulk write
 * must be scoped by one of the model's ownership fields (e.g. `orgId`, or for multi-party
 * documents `clientOrgId` / `customerId` / `hotelOrgId`) — otherwise it THROWS.
 * Cross-org work (booking engine, ledger, jobs) must opt out explicitly with a reason:
 *   Model.find(filter).setOptions(systemScope('hold-sweeper'))     — logged every time.
 * New documents must carry at least one ownership field.
 */
import { AppError } from '../errors.js';

/** @typedef {{ tenantScope?: 'SYSTEM', tenantReason?: string }} TenantOptions */
/** @typedef {{ fields: readonly string[], onSystemAccess?: (info: { model: string, op: string, reason: string }) => void }} TenantPluginOptions */

export class TenantScopeError extends AppError {
  /** @param {string} model @param {string} op */
  constructor(model, op) {
    super('TENANT_SCOPE_MISSING', 500, 'Internal error', {});
    this.message = `[b2b] ${model}.${op} has no ownership filter — scope it by tenant or use systemScope(reason)`;
  }
}

/** @param {string} reason @returns {TenantOptions} */
export function systemScope(reason) {
  if (!reason || !reason.trim()) throw new Error('[b2b] systemScope needs a reason');
  return { tenantScope: 'SYSTEM', tenantReason: reason };
}

const QUERY_OPS = [
  'find', 'findOne', 'countDocuments', 'distinct', 'updateOne', 'updateMany', 'replaceOne',
  'deleteOne', 'deleteMany', 'findOneAndUpdate', 'findOneAndDelete', 'findOneAndReplace', 'estimatedDocumentCount',
];

/** @param {unknown} v */
function isConcrete(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.length > 0;
  if (typeof v !== 'object') return false;
  if ('_bsontype' in v) return true; // ObjectId
  const ops = /** @type {Record<string, unknown>} */ (v);
  if ('$eq' in ops) return isConcrete(ops.$eq);
  if (Array.isArray(ops.$in)) return ops.$in.length > 0 && ops.$in.every(isConcrete);
  return false;
}

/**
 * Scoped = has an ownership field with a concrete value, or an `$and` containing a scoped
 * part, or an `$or` whose every branch is scoped (multi-party reads).
 * @param {unknown} filter @param {readonly string[]} fields @returns {boolean}
 */
export function isScoped(filter, fields) {
  if (!filter || typeof filter !== 'object') return false;
  const f = /** @type {Record<string, unknown>} */ (filter);
  if (fields.some((field) => isConcrete(f[field]))) return true;
  if (Array.isArray(f.$and) && f.$and.some((part) => isScoped(part, fields))) return true;
  if (Array.isArray(f.$or) && f.$or.length > 0 && f.$or.every((part) => isScoped(part, fields))) return true;
  return false;
}

/**
 * @param {import('mongoose').Schema} schema
 * @param {TenantPluginOptions} options
 */
export function tenantPlugin(schema, options) {
  const { fields, onSystemAccess } = options;
  if (!fields?.length) throw new Error('[b2b] tenantPlugin needs ownership fields');

  /** @param {string} model @param {string} op @param {TenantOptions} opts @param {() => boolean} scoped */
  const check = (model, op, opts, scoped) => {
    if (opts.tenantScope === 'SYSTEM' && opts.tenantReason) {
      onSystemAccess?.({ model, op, reason: opts.tenantReason });
      return;
    }
    if (op === 'estimatedDocumentCount' || !scoped()) throw new TenantScopeError(model, op);
  };

  schema.pre(/** @type {any} */ (QUERY_OPS), function () {
    const query = /** @type {import('mongoose').Query<unknown, unknown> & { op?: string }} */ (/** @type {unknown} */ (this));
    check(query.model.modelName, String(query.op), /** @type {TenantOptions} */ (query.getOptions()), () => isScoped(query.getFilter(), fields));
  });

  schema.pre('aggregate', function () {
    const first = this.pipeline()[0];
    const match = first && '$match' in first ? first.$match : undefined;
    check(this.model().modelName, 'aggregate', /** @type {TenantOptions} */ (this.options), () => isScoped(match, fields));
  });

  schema.pre('bulkWrite', function (next, ops) {
    const model = /** @type {import('mongoose').Model<unknown>} */ (/** @type {unknown} */ (this)).modelName;
    for (const op of /** @type {Record<string, any>[]} */ (ops)) {
      const [kind, body] = Object.entries(op)[0] ?? [];
      const target = kind === 'insertOne' ? body?.document : body?.filter;
      if (!isScoped(target, fields)) return next(new TenantScopeError(model, `bulkWrite.${kind}`));
    }
    next();
  });

  schema.pre('validate', function () {
    const doc = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (this));
    if (!fields.some((field) => isConcrete(doc[field]))) {
      throw new TenantScopeError(/** @type {any} */ (this).constructor.modelName, 'save (no ownership field)');
    }
  });
}
