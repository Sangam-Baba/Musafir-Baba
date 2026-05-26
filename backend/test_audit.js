import mongoose from "mongoose";
import auditEmitter from "./src/services/audit.service.js";
import { AuditLog } from "./src/models/AuditLog.js";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  auditEmitter.emit("log", {
    userId: new mongoose.Types.ObjectId(),
    userName: "Test User",
    role: "Admin",
    actionType: "CREATE",
    moduleName: "TestModule",
    description: "Testing audit log",
    changes: { oldValue: "A", newValue: "B" }
  });

  // wait a bit for async event
  setTimeout(async () => {
    const log = await AuditLog.findOne().sort({ createdAt: -1 });
    console.log("Latest log:", log);
    process.exit(0);
  }, 1000);
}

run();
