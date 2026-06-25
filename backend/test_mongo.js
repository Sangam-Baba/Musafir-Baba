import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected");
  
  const staffId = "667676766767676767676767"; // dummy

  const date = "2026-06-01";
  
  const parseLocalDateStr = (dateStr) => {
    if (typeof dateStr === 'string' && dateStr.includes('-')) {
      const [y, m, d] = dateStr.split('T')[0].split('-');
      return new Date(y, m - 1, d);
    }
    return new Date(dateStr);
  };
  
  const targetDateStart = parseLocalDateStr(date);
  targetDateStart.setHours(0, 0, 0, 0);
  const targetDateEnd = parseLocalDateStr(date);
  targetDateEnd.setHours(23, 59, 59, 999);
  
  console.log("targetDateStart", targetDateStart);
  console.log("targetDateEnd", targetDateEnd);
  
  const startDate = new Date(2026, 5, 1);
  const endDate = new Date(2026, 6, 0, 23, 59, 59, 999);
  
  console.log("startDate", startDate);
  console.log("endDate", endDate);
  
  console.log(targetDateStart >= startDate);
  process.exit(0);
};

run().catch(console.error);
