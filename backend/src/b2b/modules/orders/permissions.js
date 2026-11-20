// @ts-check
/**
 * Permissions of the orders module. Website customers and guests own their orders without a permission (signed-in
 * account or the private order link). MusafirBaba: Operations (`orders.**`) sees and acts on orders, Finance and
 * Support read. B2B client roles already list `orders.**` / `orders.**.read` for Stage 12 part B.
 */
import { definePermissions } from '../../core/permissions.js';

export const { codes: PERMISSIONS, catalogue: PERMISSION_CATALOGUE } = definePermissions('Orders', {
  adminRead: {
    code: 'orders.admin.read',
    description: 'MusafirBaba admin: find orders and see their full timeline',
    orgTypes: ['PLATFORM'],
  },
  adminAct: {
    code: 'orders.admin.act',
    description: 'MusafirBaba admin: propose an action on an order (release rooms, refund); a second person approves',
    orgTypes: ['PLATFORM'],
  },
});
