// @ts-check
/**
 * Data protection (DPDP — plan Stage 16 §2.8): record a consent; take a data request (one open request per email and
 * type — a repeat returns the open one); list and resolve requests (staff, with a note). Requests are due in 30 days.
 */
import { randomInt } from 'node:crypto';

import { NotFoundError } from '../../core/errors.js';
import { ConsentRecord, DataRequestRecord } from './models/privacy.model.js';

const DUE_MS = 30 * 24 * 60 * 60_000;
const LETTERS = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

/** @param {Record<string, any>} r */
export const dataRequestDto = (r) => ({
  id: String(r._id),
  ref: r.ref,
  type: r.type,
  name: r.name,
  email: r.email,
  phone: r.phone,
  details: r.details,
  status: r.status,
  dueAt: r.dueAt,
  createdAt: r.createdAt,
  resolvedBy: r.resolvedBy,
  resolvedAt: r.resolvedAt,
  resolution: r.resolution,
});

/** @param {{ clock: import('../../core/clock.js').Clock }} deps */
export function createPrivacy(deps) {
  return {
    /** @param {{ purpose: import('./models/privacy.model.js').CONSENT_PURPOSES[number], noticeVersion: string, subjectRef: string | null, ip: string | null }} a */
    async recordConsent(a) {
      await ConsentRecord.create({ ...a, at: deps.clock.now() });
      return { recorded: true };
    },
    /** @param {{ type: import('./models/privacy.model.js').DATA_REQUEST_TYPES[number], name: string, email: string, phone?: string | null, details?: string | null }} a */
    async request(a) {
      const email = a.email.trim().toLowerCase();
      const open = await DataRequestRecord.findOne({ email, type: a.type, status: 'OPEN' }).lean();
      if (open) return { ref: open.ref, dueAt: open.dueAt };
      const now = deps.clock.now();
      const ref = `DPR-${Array.from({ length: 8 }, () => LETTERS[randomInt(LETTERS.length)]).join('')}`;
      const r = await DataRequestRecord.create({
        ref,
        type: a.type,
        name: a.name.trim(),
        email,
        phone: a.phone ?? null,
        details: a.details ?? null,
        dueAt: new Date(now.getTime() + DUE_MS),
      });
      return { ref: r.ref, dueAt: r.dueAt };
    },
    /** @param {{ status?: string }} q */
    list: async (q) =>
      (
        await DataRequestRecord.find(q.status ? { status: q.status } : {})
          .sort({ dueAt: 1 })
          .limit(200)
          .lean()
      ).map(dataRequestDto),
    /** @param {string} by @param {string} id @param {{ done: boolean, note: string }} d */
    async resolve(by, id, d) {
      const r = /^[a-f0-9]{24}$/.test(id)
        ? await DataRequestRecord.findOneAndUpdate(
            { _id: id, status: 'OPEN' },
            { $set: { status: d.done ? 'DONE' : 'REJECTED', resolvedBy: by, resolvedAt: deps.clock.now(), resolution: d.note.trim() } },
            { new: true },
          ).lean()
        : null;
      if (!r) throw new NotFoundError('DATA_REQUEST_NOT_FOUND');
      return dataRequestDto(r);
    },
  };
}
