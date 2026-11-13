// @ts-check
/**
 * Writes the permission catalogue into `acl_permissions` (one bulk upsert; repeat-safe, so several
 * backend processes may run it at the same time). Run once when background work starts.
 */
import { PermissionRecord } from './models/permission.model.js';

/**
 * @param {readonly import('../../core/permissions.js').PermissionDef[]} catalogue
 * @param {{ clock: import('../../core/clock.js').Clock }} deps
 * @returns {Promise<{ upserted: number, retired: number }>}
 */
export async function syncPermissionCatalogue(catalogue, deps) {
  const now = deps.clock.now();
  const codes = catalogue.map((p) => p.code);
  const result = await PermissionRecord.bulkWrite(
    catalogue.map((p) => ({
      updateOne: {
        filter: { _id: p.code },
        update: {
          $set: {
            group: p.group,
            description: p.description,
            orgTypes: [...p.orgTypes],
            sensitive: p.sensitive,
            retired: false,
            syncedAt: now,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );
  const retired = await PermissionRecord.updateMany({ _id: { $nin: codes }, retired: false }, { $set: { retired: true, syncedAt: now } });
  return { upserted: result.upsertedCount, retired: retired.modifiedCount };
}
