import mongoose from "mongoose";
import { AuditLog } from "./backend/src/models/AuditLog.js";
import dotenv from "dotenv";

dotenv.config({ path: "./backend/.env" });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(5);
  console.log("Recent Logs:", logs);
  process.exit(0);
}
check();
