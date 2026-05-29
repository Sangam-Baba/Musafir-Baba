import mongoose from "mongoose";
import { Attendance } from "./src/models/Attendance.js";
import dotenv from "dotenv";

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const records = await Attendance.find().sort({ createdAt: -1 }).limit(5);
  console.log(JSON.stringify(records, null, 2));
  process.exit(0);
});
