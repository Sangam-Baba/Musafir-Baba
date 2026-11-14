// @ts-check
/**
 * Platform roles of MusafirBaba staff (plan Stage 01 §3.6, §4). Rules:
 * - only platform system roles (`platform.*`);
 * - at most 2 Super Admins (set → count → undo if more, safe under concurrent grants);
 * - removing every role deletes the record (the staff member loses B2B admin access).
 */
import { ConflictError, DomainError } from '../../core/errors.js';
import { resolveSystemRole, systemRole } from './domain/system-roles.js';
import { StaffRoleRecord } from './models/staff-role.model.js';

const SUPER_ADMIN = 'platform.superAdmin';
const STAFF_ID = /^[a-f0-9]{24}$/;

/** @param {{ clock: import('../../core/clock.js').Clock, catalogue: readonly import('../../core/permissions.js').PermissionDef[] }} deps */
export function createStaffRolesService(deps) {
  return {
    /** @param {string} staffId @returns {Promise<{ roles: string[], firstGrantedAt: Date } | null>} */
    async get(staffId) {
      if (!STAFF_ID.test(staffId)) return null;
      const doc = await StaffRoleRecord.findById(staffId).lean();
      return doc && doc.roles.length > 0 ? { roles: doc.roles, firstGrantedAt: doc.firstGrantedAt } : null;
    },

    /** @param {readonly string[]} roles @returns {string[]} */
    permissionsOf(roles) {
      const out = new Set();
      for (const key of roles) {
        const role = systemRole(key);
        if (role?.orgType === 'PLATFORM') for (const code of resolveSystemRole(role, deps.catalogue)) out.add(code);
      }
      return [...out].sort();
    },

    /**
     * @param {string} staffId existing staff id
     * @param {string[]} roles platform role keys (empty = remove B2B admin access)
     * @param {string} updatedBy e.g. 'staff:<id>' or 'cli'
     */
    async setRoles(staffId, roles, updatedBy) {
      if (!STAFF_ID.test(staffId)) throw new DomainError('STAFF_ID_INVALID');
      const unique = [...new Set(roles)];
      for (const r of unique) if (systemRole(r)?.orgType !== 'PLATFORM') throw new DomainError('ROLE_UNKNOWN', { role: r });
      const previous = await StaffRoleRecord.findById(staffId).lean();
      if (unique.length === 0) {
        await StaffRoleRecord.deleteOne({ _id: staffId });
        return { staffId, roles: [] };
      }
      const now = deps.clock.now();
      await StaffRoleRecord.updateOne(
        { _id: staffId },
        { $set: { roles: unique, updatedBy }, $setOnInsert: { firstGrantedAt: now } },
        { upsert: true },
      );
      if (unique.includes(SUPER_ADMIN) && (await StaffRoleRecord.countDocuments({ roles: SUPER_ADMIN })) > 2) {
        if (previous) await StaffRoleRecord.updateOne({ _id: staffId }, { $set: { roles: previous.roles, updatedBy: previous.updatedBy } });
        else await StaffRoleRecord.deleteOne({ _id: staffId });
        throw new ConflictError('SUPER_ADMIN_LIMIT', { max: 2 });
      }
      return { staffId, roles: unique };
    },
  };
}
