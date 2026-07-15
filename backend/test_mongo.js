import mongoose from "mongoose";
import { Package } from "./src/models/Package.js";
import { Batch } from "./src/models/Batch.js";

async function run() {
  await mongoose.connect("mongodb://localhost:27017/musafir-baba"); // Assuming this is the DB URI
  const latestPackage = await Package.findOne().sort({ updatedAt: -1 }).populate("batch");
  console.log("Latest Package title:", latestPackage?.title);
  console.log("Batches count:", latestPackage?.batch?.length);
  if (latestPackage?.batch?.length) {
    console.log("Latest batch sample:", latestPackage.batch[latestPackage.batch.length - 1]);
  }
  process.exit(0);
}
run();
