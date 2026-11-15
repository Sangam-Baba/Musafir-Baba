// @ts-check
/** The files module has no permissions of its own: the module that owns a file (kyc, …) decides who may see it. */
import { definePermissions } from '../../core/permissions.js';

export const { codes: PERMISSIONS, catalogue: PERMISSION_CATALOGUE } = definePermissions('Files', {});
