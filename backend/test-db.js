import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const invoiceSchema = new mongoose.Schema({}, { strict: false });
const Invoice = mongoose.model("Invoice", invoiceSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const inv = await Invoice.findOne().sort({ createdAt: -1 });
  console.log(JSON.stringify(inv, null, 2));
  process.exit(0);
}
run();
