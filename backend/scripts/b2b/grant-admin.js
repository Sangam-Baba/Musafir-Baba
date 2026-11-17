// @ts-check
/**
 * `npm run b2b:grant-admin -- <staff email> <role>[,<role>…]`
 * Gives an existing MusafirBaba staff member B2B platform roles — used once to name the first
 * Super Admin; after that Super Admins do it in the admin pages. Reads the staff member through
 * legacy-read (read-only) and writes only `acl_staff_roles`. Roles: platform.superAdmin,
 * platform.operations, platform.finance, platform.hotels, platform.support. An empty role list
 * ("none") removes B2B admin access.
 * Example: npm run b2b:grant-admin -- abhishek@musafirbaba.com platform.superAdmin
 */
import 'dotenv/config';

import { systemClock } from '../../src/b2b/core/clock.js';
import { loadConfig } from '../../src/b2b/core/config.js';
import { connectB2BDatabase, disconnectB2BDatabase } from '../../src/b2b/core/db/connection.js';
import { findStaffByEmail } from '../../src/b2b/legacy-read/index.js';
import { createStaffRoles } from '../../src/b2b/routes/admin-wiring.js';

const [email, roleList] = process.argv.slice(2);

async function main() {
  if (!email || !roleList) throw new Error('usage: npm run b2b:grant-admin -- <staff email> <role>[,<role>…] (or "none")');
  const roles =
    roleList === 'none'
      ? []
      : roleList
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean);
  await connectB2BDatabase(loadConfig(process.env).MONGO_URI, 'cli');
  try {
    const staff = await findStaffByEmail(email);
    if (!staff) throw new Error(`no staff member with email ${email}`);
    if (!staff.isActive) throw new Error(`staff member ${email} is not active`);
    const result = await createStaffRoles(systemClock).setRoles(staff.id, roles, 'cli');
    console.log(`[b2b:grant-admin] ${email} (${staff.id}) → ${result.roles.join(', ') || 'no B2B admin access'}`);
  } finally {
    await disconnectB2BDatabase();
  }
}

main().catch((error) => {
  console.error('[b2b:grant-admin] failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
