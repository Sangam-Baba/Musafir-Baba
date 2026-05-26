import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { AuditLog } from './src/models/AuditLog.js';

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(10).lean();
  console.log("Recent Logs:", logs);
  
  process.exit(0);
}

test();
