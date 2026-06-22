import mongoose from "mongoose";

const chatbotLeadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    destination: {
      type: String,
      trim: true,
    },
    inquiryType: {
      type: String,
      enum: ["visa", "package", "general", "custom"],
      default: "general",
    },
    source: {
      type: String,
      default: "chatbot",
    },
  },
  { timestamps: true }
);

export default mongoose.model("ChatbotLead", chatbotLeadSchema);
