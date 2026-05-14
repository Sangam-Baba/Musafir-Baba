import mongoose from "mongoose";

const MONGO_URI="mongodb+srv://MusafirDB:1234%40sangam%23@cluster0.laeqxcp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const invoiceSchema = new mongoose.Schema({}, { strict: false });
const Invoice = mongoose.model("Invoice", invoiceSchema);

async function run() {
  await mongoose.connect(MONGO_URI);
  const inv = await Invoice.findOne({ invoiceNumber: "INVMB-00002" }).lean();
  console.log(JSON.stringify(inv, null, 2));
  process.exit(0);
}
run();
