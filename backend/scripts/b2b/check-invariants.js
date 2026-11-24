// @ts-check
/**
 * Run the safety checks once against a database and print the result (plan Stage 16 §2.5) — read-only. Use it after
 * a restore (disaster-recovery drill) or whenever in doubt:
 *
 *   MONGO_URI=mongodb://…/test node scripts/b2b/check-invariants.js
 *
 * Exit 0 = every check clean; 1 = a check found problems (listed); 2 = could not run.
 */
import { b2bMongoose, connectB2BDatabase } from '../../src/b2b/core/db/connection.js';
import { createInvariantChecks } from '../../src/b2b/core/db/invariants.js';
import { systemClock } from '../../src/b2b/core/clock.js';
import { documentInvariants } from '../../src/b2b/modules/documents/index.js';
import { inventoryInvariants } from '../../src/b2b/modules/hotel-inventory/index.js';
import { orderInvariants } from '../../src/b2b/modules/orders/index.js';
import { ledgerInvariants } from '../../src/b2b/modules/wallet/index.js';

const quiet = { info: () => undefined, warn: () => undefined, error: () => undefined, child: () => quiet };

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('Set MONGO_URI (the database to check).');
    process.exit(2);
  }
  await connectB2BDatabase(uri, 'cli');
  const checks = createInvariantChecks();
  for (const inv of [
    ...inventoryInvariants({ clock: systemClock }),
    ...ledgerInvariants(),
    ...orderInvariants({ clock: systemClock }),
    ...documentInvariants({ clock: systemClock }),
  ])
    checks.register(inv);
  const reports = await checks.runAll(/** @type {any} */ (quiet));
  for (const r of reports)
    console.log(
      `${r.error ? '✗ could not run' : r.violations.length ? `✗ ${r.violations.length} problem(s)` : '✓'}  ${r.name}${r.error ? ` — ${r.error}` : ''}`,
    );
  for (const r of reports) for (const v of r.violations.slice(0, 10)) console.log(`    ${r.name}: ${v.id} — ${v.detail}`);
  await b2bMongoose.disconnect();
  process.exit(reports.some((r) => r.error || r.violations.length) ? 1 : 0);
}

main().catch(async (error) => {
  console.error(error);
  await b2bMongoose.disconnect().catch(() => undefined);
  process.exit(2);
});
