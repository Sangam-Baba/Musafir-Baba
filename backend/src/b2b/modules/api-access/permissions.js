// @ts-check
/** Permissions of the api-access module (Stage 14): a client company manages its own API keys. */
import { definePermissions } from '../../core/permissions.js';

export const { codes: PERMISSIONS, catalogue: PERMISSION_CATALOGUE } = definePermissions('API access', {
  keyRead: {
    code: 'api-access.key.read',
    description: "See the company's API keys (never the secret) and their last use",
    orgTypes: ['CLIENT'],
  },
  keyManage: {
    code: 'api-access.key.manage',
    description: 'Create, rotate and revoke API keys for the company’s own software (each key shown once)',
    orgTypes: ['CLIENT'],
  },
});
