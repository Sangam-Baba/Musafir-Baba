import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Define Attendance schema (matching the model)
const attendanceSchema = new mongoose.Schema({}, { strict: false });
const Attendance = mongoose.model("Attendance", attendanceSchema);

const runMigration = async () => {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/musafirbaba");
    console.log("Connected successfully.");

    console.log("Fetching all attendance records...");
    const records = await Attendance.find({});
    console.log(`Found ${records.length} records. Beginning migration...`);

    let updatedCount = 0;

    for (let record of records) {
      let newStatus = record.attendanceStatus;
      let needsUpdate = false;

      // 1. If it's an approved leave, ensure attendanceStatus matches leaveType
      if (record.leaveStatus === "Approved" && ["Leave", "Short Leave", "Half Day", "WFH"].includes(record.leaveType)) {
        if (newStatus !== record.leaveType) {
          newStatus = record.leaveType;
          needsUpdate = true;
        }
      } 
      // 2. If it's a check-in and wasn't explicitly overridden by an admin leave/WFH
      else if (record.checkInTime) {
        const checkInTimeIST = new Date(new Date(record.checkInTime).toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
        const hours = checkInTimeIST.getHours();
        const minutes = checkInTimeIST.getMinutes();
        
        let calculatedStatus = "Present";
        if (hours > 9 || (hours === 9 && minutes > 15)) {
          calculatedStatus = "Late";
        }

        // Only update if it currently says "Absent" (the old default), "Present" incorrectly, or is missing
        // Don't overwrite if an admin explicitly set it to WFH or Holiday manually
        if (!record.attendanceStatus || ["Present", "Absent"].includes(record.attendanceStatus)) {
          if (newStatus !== calculatedStatus) {
            newStatus = calculatedStatus;
            needsUpdate = true;
          }
        }
      } 
      // 3. Blank records without a check-in and no approved leave
      else {
        if (!record.attendanceStatus || !["Absent", "Holiday", "Weekend", "WFH"].includes(record.attendanceStatus)) {
          newStatus = "Absent";
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await Attendance.updateOne({ _id: record._id }, { $set: { attendanceStatus: newStatus } });
        updatedCount++;
      }
    }

    console.log(`Migration complete! Successfully updated ${updatedCount} legacy records to the new standardized format.`);
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

runMigration();
