// @ts-check
/**
 * Every permission the B2B system knows, collected from each module's public interface.
 * Kept outside the modules so the access module never imports feature modules (01-architecture.md §5).
 * New modules add their PERMISSION_CATALOGUE here.
 */
import { mergeCatalogues } from './core/permissions.js';
import { PERMISSION_CATALOGUE as access } from './modules/access/index.js';
import { PERMISSION_CATALOGUE as audit } from './modules/audit/index.js';
import { PERMISSION_CATALOGUE as identity } from './modules/identity/index.js';
import { PERMISSION_CATALOGUE as files } from './modules/files/index.js';
import { PERMISSION_CATALOGUE as hotelCatalog } from './modules/hotel-catalog/index.js';
import { PERMISSION_CATALOGUE as hotelInventory } from './modules/hotel-inventory/index.js';
import { PERMISSION_CATALOGUE as kyc } from './modules/kyc/index.js';
import { PERMISSION_CATALOGUE as notifications } from './modules/notifications/index.js';
import { PERMISSION_CATALOGUE as organizations } from './modules/organizations/index.js';
import { PERMISSION_CATALOGUE as pricing } from './modules/pricing/index.js';

export const PERMISSION_CATALOGUE = mergeCatalogues([
  identity,
  organizations,
  access,
  audit,
  files,
  kyc,
  notifications,
  hotelCatalog,
  hotelInventory,
  pricing,
]);
