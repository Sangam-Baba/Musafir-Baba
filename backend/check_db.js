import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ContactEnquiry } from './src/models/ContactInquiry.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const latest = await ContactEnquiry.find().sort({ createdAt: -1 }).limit(5);
  console.log("LATEST ENQUIRIES:");
  latest.forEach(e => console.log(e.name, e.email, e.source, e.createdAt));
  process.exit(0);
});
