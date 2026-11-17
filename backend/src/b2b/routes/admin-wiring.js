// @ts-check
/** Builds the staff-roles service with the permission catalogue (the access module never imports it). */
import { createStaffRolesService } from '../modules/access/index.js';
import { PERMISSION_CATALOGUE } from '../permission-catalogue.js';

/** @param {import('../core/clock.js').Clock} clock */
export const createStaffRoles = (clock) => createStaffRolesService({ clock, catalogue: PERMISSION_CATALOGUE });
