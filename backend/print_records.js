import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/musafirbaba");
  const Attendance = mongoose.model("Attendance", new mongoose.Schema({}, { strict: false }));
  
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const records = await Attendance.find({ date: { $gte: startOfDay } }).lean();
  console.log("TODAY RECORDS:");
  records.forEach(r => {
    console.log(`Staff: ${r.staff}, CheckIn: ${r.checkInTime}, Status: ${r.attendanceStatus}`);
  });
  
  process.exit(0);
};
run();
