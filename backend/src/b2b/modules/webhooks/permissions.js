// @ts-check
/** Permissions of the webhooks module (Stage 14): a client company manages where its booking updates are sent. */
import { definePermissions } from '../../core/permissions.js';

export const { codes: PERMISSIONS, catalogue: PERMISSION_CATALOGUE } = definePermissions('Webhooks', {
  endpointManage: {
    code: 'webhooks.endpoint.manage',
    description: 'Add, change, test and remove webhook addresses; rotate their signing secret (shown once)',
    orgTypes: ['CLIENT'],
  },
  deliveryRead: { code: 'webhooks.delivery.read', description: 'See webhook deliveries and send one again', orgTypes: ['CLIENT'] },
});
