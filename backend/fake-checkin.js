import mongoose from "mongoose";
import { Attendance } from "./src/models/Attendance.js";
import { Staff } from "./src/models/Staff.js";
import dotenv from "dotenv";

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const staff = await Staff.findOne({ role: "admin" });
  if (!staff) { console.log("No staff"); process.exit(1); }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const newAtt = new Attendance({
    staff: staff._id,
    date: now,
    checkInTime: new Date(),
    totalOfficeHours: 1.5,
    totalWorkingHours: 1.5
  });
  
  await newAtt.save();
  console.log("Successfully created test check-in for today:", now);
  process.exit(0);
});
