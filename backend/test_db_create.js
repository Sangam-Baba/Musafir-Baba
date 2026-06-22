import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ContactEnquiry } from './src/models/ContactInquiry.js';
import sendEmail from "./src/services/email.service.js";
import { thankYouEnquirySubmit } from "./src/utils/thankYouEnquirySubmit.js";

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const contact = await ContactEnquiry.create({
      name: "Test User Error",
      phone: "0000000000",
      email: "test@example.com",
      message: "Chatbot Enquiry",
      source: "chatbot",
    });
    console.log("Created contact:", contact._id);
  } catch(err) {
    console.error("CREATE ERROR:", err);
  }
  process.exit(0);
});
