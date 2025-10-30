import { ContactEnquiry } from "../models/ContactInquiry.js";
import sendEmail from "../services/email.service.js";

const createContact = async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || !phone) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }
    const contact = await ContactEnquiry.create({ ...req.body, name, phone });
    const subject = "New Contact Enquiry: " + name;
    const emailBody = `Name: ${name}\nPhone: ${phone}\nMessage: ${
      contact.message
    }\nEmail: ${contact.email}\n Source: ${contact.source
      .split("/")
      .join(" - ")}`;
    const emailResponse = await sendEmail(
      "care@musafirbaba.com",
      subject,
      emailBody
    );
    if (!emailResponse || emailResponse.error !== null) {
      console.error("Email sending failed:", emailResponse.error);
    }
    res.status(201).json({
      success: true,
      message: "Contact created successfully",
      data: contact,
    });
  } catch (error) {
    console.log("Contact creation failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getAllContact = async (req, res) => {
  try {
    const contacts = await ContactEnquiry.find({})
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({
      success: true,
      message: "Contact fetched successfully",
      data: contacts,
    });
  } catch (error) {
    console.log("Contact getting failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export { createContact, getAllContact };
