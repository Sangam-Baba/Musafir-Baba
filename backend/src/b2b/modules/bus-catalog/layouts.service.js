// @ts-check
/**
 * Seat layouts (plan Stage 18 B2): create from a template or from a drawn grid, change, copy, list. A layout used by
 * an approved (or submitted) bus is locked — copy it to make changes — so seats already on sale never move.
 */
import { ConflictError, DomainError, NotFoundError } from '../../core/errors.js';
import { checkLayout, LAYOUT_TEMPLATES, layoutSummary } from './domain/layout.js';
import { LayoutRecord } from './models/layout.model.js';
import { VehicleRecord } from './models/vehicle.model.js';

/** @typedef {{ orgId: string, userId: string }} Operator */

/** @param {Record<string, any>} l */
export const layoutDto = (l) => ({
  id: String(l._id),
  name: l.name,
  decks: l.decks,
  ...layoutSummary(/** @type {any} */ (l)),
  version: l.version,
  updatedAt: l.updatedAt,
});

/** @param {import('./domain/layout.js').Layout} layout */
function checked(layout) {
  const problems = checkLayout(layout);
  if (problems.length) throw new DomainError('LAYOUT_INVALID', { problems });
  return layout.decks.map((d) => ({
    deck: d.deck,
    rows: d.rows,
    cols: d.cols,
    seats: d.seats.map((s) => ({ no: s.no, row: s.row, col: s.col, type: s.type, ladies: Boolean(s.ladies), span: s.span ?? 1 })),
  }));
}

/** @param {string} orgId @param {string} id */
async function own(orgId, id) {
  const l = /^[a-f0-9]{24}$/.test(id) ? await LayoutRecord.findOne({ _id: id, operatorOrgId: orgId }).lean() : null;
  if (!l) throw new NotFoundError('LAYOUT_NOT_FOUND');
  return /** @type {Record<string, any>} */ (l);
}

/** Seat layout operations for an operator. */
export function createLayouts() {
  return {
    templates: () => Object.entries(LAYOUT_TEMPLATES).map(([key, t]) => ({ key, name: t.name, layout: t.build() })),
    /** @param {Operator} who @param {{ name: string, template?: string, decks?: import('./domain/layout.js').Deck[] }} a */
    async create(who, a) {
      const t = a.template ? LAYOUT_TEMPLATES[/** @type {import('./domain/layout.js').LayoutTemplate} */ (a.template)] : null;
      if (a.template && !t) throw new DomainError('TEMPLATE_UNKNOWN');
      const decks = checked(t ? t.build() : { decks: a.decks ?? [] });
      const l = await LayoutRecord.create({
        operatorOrgId: who.orgId,
        name: a.name.trim(),
        decks,
        seatCount: decks.reduce((s, d) => s + d.seats.length, 0),
        createdBy: `user:${who.userId}`,
      });
      return layoutDto(l.toObject());
    },
    /** @param {Operator} who @param {string} id @param {{ name?: string, decks?: import('./domain/layout.js').Deck[], expectedVersion: number }} a */
    async update(who, id, a) {
      const l = await own(who.orgId, id);
      if (await VehicleRecord.exists({ operatorOrgId: who.orgId, layoutId: id, status: { $in: ['SUBMITTED', 'APPROVED', 'SUSPENDED'] } }))
        throw new ConflictError('LAYOUT_IN_USE'); // copy it to change it
      /** @type {Record<string, unknown>} */
      const set = {};
      if (a.name !== undefined) set.name = a.name.trim();
      if (a.decks !== undefined) {
        const decks = checked({ decks: a.decks });
        Object.assign(set, { decks, seatCount: decks.reduce((s, d) => s + d.seats.length, 0) });
      }
      const res = await LayoutRecord.updateOne(
        { _id: l._id, operatorOrgId: who.orgId, version: a.expectedVersion },
        { $set: set, $inc: { version: 1 } },
      );
      if (res.modifiedCount !== 1) throw new ConflictError('VERSION_CONFLICT');
      return layoutDto(await own(who.orgId, id));
    },
    /** @param {Operator} who @param {string} id @param {string} name */
    async copy(who, id, name) {
      const l = await own(who.orgId, id);
      const c = await LayoutRecord.create({
        operatorOrgId: who.orgId,
        name: name.trim(),
        decks: l.decks,
        seatCount: l.seatCount,
        createdBy: `user:${who.userId}`,
      });
      return layoutDto(c.toObject());
    },
    /** @param {string} orgId */
    list: async (orgId) => (await LayoutRecord.find({ operatorOrgId: orgId }).sort({ createdAt: 1 }).lean()).map(layoutDto),
    /** @param {string} orgId @param {string} id */
    get: async (orgId, id) => layoutDto(await own(orgId, id)),
  };
}
