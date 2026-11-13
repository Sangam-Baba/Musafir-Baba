// @ts-check
/**
 * System roles of plan §4 (docs/plan/stages/stage-01-orgs-users-roles.md). Pure data + resolution.
 * Roles are defined as permission PATTERNS and resolved against the catalogue, limited to what the
 * org type may hold, so permissions added by later modules (hotel-*, orders, wallet, …) reach the
 * right roles without editing this file. System roles live in code (not in `acl_roles`) so every org
 * always has the current definition; `acl_roles` holds custom roles only.
 *
 * Wildcards never grant sensitive permissions (see resolvePatterns): roles that need one list its exact code.
 * Exact codes of later modules named here (front desk) must be used by those modules (Stage 08/09).
 */
import { resolvePatterns } from './patterns.js';

/** @typedef {'OWN' | 'BRANCH' | 'ORG' | 'PROPERTIES'} ScopeKind */
/**
 * @typedef {{ key: string, orgType: import('../../../core/permissions.js').OrgType, name: string, description: string,
 *   patterns: readonly string[], defaultScope: ScopeKind, maxHolders?: number }} SystemRole
 */

const SEE_ORG = 'organizations.org.read';

/** @type {readonly SystemRole[]} */
export const SYSTEM_ROLES = Object.freeze([
  // MusafirBaba staff
  {
    key: 'platform.superAdmin',
    orgType: 'PLATFORM',
    name: 'Super Admin',
    description: 'Everything (at most 2 people)',
    patterns: ['**'],
    defaultScope: 'ORG',
    maxHolders: 2,
  },
  {
    key: 'platform.operations',
    orgType: 'PLATFORM',
    name: 'Operations',
    description: 'Clients, hotels, KYC, bookings, amendments',
    patterns: [
      SEE_ORG,
      'platform.org.read',
      'platform.org.manage',
      'platform.user.read',
      'platform.audit.read',
      'admin.viewAs.read',
      'kyc.**',
      'hotel-booking.**',
      'orders.**',
      'hotel-catalog.**.read',
    ],
    defaultScope: 'ORG',
  },
  {
    key: 'platform.finance',
    orgType: 'PLATFORM',
    name: 'Finance',
    description: 'Wallets, payments, refunds (approve), payouts (approve), plans, reports',
    patterns: [
      SEE_ORG,
      'platform.org.read',
      'platform.audit.read',
      'wallet.**',
      'payments.**',
      'billing.**',
      'subscriptions.**',
      'reporting.**',
      'documents.**',
      'orders.**.read',
      'hotel-booking.**.read',
    ],
    defaultScope: 'ORG',
  },
  {
    key: 'platform.hotels',
    orgType: 'PLATFORM',
    name: 'Hotels / Contracting',
    description: 'Listings approval, margins (propose), hotel support',
    patterns: [SEE_ORG, 'platform.org.read', 'hotel-catalog.**', 'hotel-inventory.**.read', 'pricing.**', 'hotel-booking.**.read'],
    defaultScope: 'ORG',
  },
  {
    key: 'platform.support',
    orgType: 'PLATFORM',
    name: 'Support',
    description: 'Read most things, view as a client or hotel (read-only)',
    patterns: ['**.read', 'admin.viewAs.read'],
    defaultScope: 'ORG',
  },
  // B2B clients
  {
    key: 'client.owner',
    orgType: 'CLIENT',
    name: 'Owner',
    description: 'Everything in the organisation, incl. wallet, plan, API keys and roles',
    patterns: ['**'],
    defaultScope: 'ORG',
  },
  {
    key: 'client.admin',
    orgType: 'CLIENT',
    name: 'Admin',
    description: 'Team, branches, all bookings',
    patterns: ['organizations.**', 'access.**', 'audit.**', 'hotel-catalog.**.read', 'pricing.**.read', 'hotel-booking.**', 'orders.**'],
    defaultScope: 'ORG',
  },
  {
    key: 'client.bookingAgent',
    orgType: 'CLIENT',
    name: 'Booking Agent',
    description: 'Search, book and cancel own or branch bookings',
    patterns: [SEE_ORG, 'organizations.branch.read', 'hotel-catalog.**.read', 'pricing.**.read', 'hotel-booking.**', 'orders.**'],
    defaultScope: 'BRANCH',
  },
  {
    key: 'client.accountant',
    orgType: 'CLIENT',
    name: 'Accountant',
    description: 'Wallet, invoices, statements; read bookings',
    patterns: [
      SEE_ORG,
      'organizations.branch.read',
      'wallet.**',
      'billing.**',
      'documents.**',
      'reporting.**',
      'payments.**.read',
      'orders.**.read',
      'hotel-booking.**.read',
    ],
    defaultScope: 'ORG',
  },
  {
    key: 'client.viewer',
    orgType: 'CLIENT',
    name: 'Viewer',
    description: 'Read bookings of their branches',
    patterns: [SEE_ORG, 'orders.**.read', 'hotel-booking.**.read'],
    defaultScope: 'BRANCH',
  },
  // Hotels
  {
    key: 'hotel.owner',
    orgType: 'HOTEL',
    name: 'Owner',
    description: 'Everything for own properties, incl. bank details and payouts',
    patterns: ['**'],
    defaultScope: 'ORG',
  },
  {
    key: 'hotel.manager',
    orgType: 'HOTEL',
    name: 'Manager',
    description: 'Listings, rooms, rates, calendar, bookings (assigned properties)',
    patterns: [SEE_ORG, 'organizations.member.read', 'hotel-catalog.**', 'hotel-inventory.**', 'pricing.**', 'hotel-booking.**'],
    defaultScope: 'PROPERTIES',
  },
  {
    key: 'hotel.frontDesk',
    orgType: 'HOTEL',
    name: 'Front Desk',
    description: 'Bookings inbox, acknowledge, no-show (assigned properties)',
    patterns: [SEE_ORG, 'hotel-booking.**.read', 'hotel-booking.booking.acknowledge', 'hotel-booking.booking.markNoShow'],
    defaultScope: 'PROPERTIES',
  },
]);

/** @param {string} key @returns {SystemRole | undefined} */
export const systemRole = (key) => SYSTEM_ROLES.find((r) => r.key === key);

/** @param {import('../../../core/permissions.js').OrgType} orgType */
export const systemRolesFor = (orgType) => SYSTEM_ROLES.filter((r) => r.orgType === orgType);

/**
 * The permission codes a system role grants today.
 * @param {SystemRole} role
 * @param {readonly import('../../../core/permissions.js').PermissionDef[]} catalogue
 * @returns {string[]}
 */
export const resolveSystemRole = (role, catalogue) => resolvePatterns(role.patterns, role.orgType, catalogue);
