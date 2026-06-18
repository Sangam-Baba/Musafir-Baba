import mongoose from "mongoose";
import { SalesRecord } from "./src/models/SalesRecord.js";
import dotenv from "dotenv";
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const records = await SalesRecord.find({});
  console.log("Total records:", records.length);
  console.log(records);
  process.exit(0);
});
