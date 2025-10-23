import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String, required: true },
    date: { type: Date },
    departureCity: { type: String },
    people: { type: String },
    whatsapp: { type: Boolean },
    message: { type: String },
    policy: { type: Boolean },
    source: { type: String },
  },
  { timestamps: true }
);

export const ContactEnquiry = mongoose.model("ContactEnquiry", contactSchema);
