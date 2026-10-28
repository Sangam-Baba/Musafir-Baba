// One-off, additive seed for attendance shifts.
//
// Creates a "General Shift" (09:00 start, 15 min grace -> late after 9:15 AM,
// the same rule check-in used before shifts existed) and assigns it to every
// active, attendance-eligible staffer who has NO shift yet.
//
// Safe to run multiple times: an existing "General Shift" is reused as-is
// (never overwritten), and staff who already have a shift are never touched.
//
// Usage:
//   node scripts/seedDefaultShift.js --dry-run            (print only, no DB writes)
//   node scripts/seedDefaultShift.js                      (end time 18:00)
//   node scripts/seedDefaultShift.js --end=18:30          (custom end time)

import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import { Shift } from "../src/models/Shift.js";
import { Staff } from "../src/models/Staff.js";

const SHIFT_NAME = "General Shift";
const isDryRun = process.argv.includes("--dry-run");
const endArg = process.argv.find((a) => a.startsWith("--end="));
const endTime = endArg ? endArg.split("=")[1] : "18:00";

async function main() {
  const seedDoc = new Shift({ name: SHIFT_NAME, startTime: "09:00", endTime, graceMinutes: 15 });
  const validationError = seedDoc.validateSync();
  if (validationError) throw validationError;
  if (endTime <= "09:00") throw new Error("End time must be after 09:00.");

  await mongoose.connect(process.env.MONGO_URI);
  try {
    const staffQuery = {
      isActive: true,
      role: { $in: ["staff", "admin", "superadmin"] },
      attendanceEligible: { $ne: false },
      email: { $ne: "admin@musafirbaba.com" },
      $or: [{ shift: null }, { shift: { $exists: false } }],
    };
    const unassigned = await Staff.find(staffQuery).select("name email").lean();

    const existing = await Shift.findOne({ name: SHIFT_NAME }).lean();

    if (isDryRun) {
      console.log(existing
        ? `[dry-run] "${SHIFT_NAME}" already exists (${existing.startTime}-${existing.endTime}, grace ${existing.graceMinutes}) -- would reuse it.`
        : `[dry-run] Would create "${SHIFT_NAME}" 09:00-${endTime}, grace 15 min.`);
      console.log(`[dry-run] Would assign it to ${unassigned.length} staff:`);
      unassigned.forEach((s) => console.log(`  - ${s.name} <${s.email}>`));
      return;
    }

    const shift = existing || (await seedDoc.save());
    console.log(existing ? `Reusing existing "${SHIFT_NAME}".` : `Created "${SHIFT_NAME}" 09:00-${endTime}, grace 15 min.`);

    const result = await Staff.updateMany(
      { _id: { $in: unassigned.map((s) => s._id) } },
      { $set: { shift: shift._id } }
    );
    console.log(`Assigned "${SHIFT_NAME}" to ${result.modifiedCount} staff member(s).`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error("Seed Default Shift Error:", error.message);
  process.exit(1);
});
