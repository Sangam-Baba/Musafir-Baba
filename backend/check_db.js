import mongoose from "mongoose";

const run = async () => {
  await mongoose.connect("mongodb://localhost:27017/musafirbaba");
  const Attendance = mongoose.model("Attendance", new mongoose.Schema({}, { strict: false }));
  const records = await Attendance.find({ date: { $gte: new Date("2026-06-01") } }).lean();
  
  // Find duplicates by date
  const counts = {};
  for(let r of records) {
      if(!r.staff) continue;
      const d = r.date.toISOString().split("T")[0];
      const key = `${r.staff.toString()}_${d}`;
      counts[key] = (counts[key] || 0) + 1;
  }
  
  console.log("Duplicate counts:");
  for(let key in counts) {
      if(counts[key] > 1) {
          console.log(key, counts[key]);
          const dups = records.filter(r => `${r.staff.toString()}_${r.date.toISOString().split("T")[0]}` === key);
          console.log(dups.map(d => ({_id: d._id, date: d.date, status: d.attendanceStatus, checkIn: d.checkInTime})));
      }
  }
  process.exit(0);
};
run();
