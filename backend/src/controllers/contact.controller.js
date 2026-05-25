import { ContactEnquiry } from "../models/ContactInquiry.js";
import sendEmail from "../services/email.service.js";
import { EnquiryOtp } from "../models/OtpEnquiry.js";
import { thankYouEnquirySubmit } from "../utils/thankYouEnquirySubmit.js";
const createContact = async (req, res) => {
  try {
    const { name, phone, email } = req.body;
    if (!name || !phone || !email) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }
    const contact = await ContactEnquiry.create({ ...req.body, name, phone });
    const subject = "New Contact Enquiry: " + name;
    const emailBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333333; line-height: 1.6;">
        <!-- Header -->
        <div style="text-align: center; padding: 40px 0 30px; border-bottom: 1px solid #eaeaea;">
          <img src="https://cdn.musafirbaba.com/images/logo.png" alt="MusafirBaba" style="max-width: 180px; height: auto;" />
        </div>
        
        <!-- Intro -->
        <div style="padding: 40px 20px 20px;">
          <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 5px; color: #111111;">New Website Enquiry</h2>
          <p style="font-size: 14px; color: #666666; margin: 0 0 30px;">A new contact request has been submitted.</p>
          
          <!-- Details -->
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tbody>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #f2f2f2; font-weight: 500; width: 120px; color: #888888;">Name</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #f2f2f2; color: #111111;">${contact.name || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #f2f2f2; font-weight: 500; color: #888888;">Email</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #f2f2f2;">
                  <a href="mailto:${contact.email}" style="color: #111111; text-decoration: none;">${contact.email || "N/A"}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #f2f2f2; font-weight: 500; color: #888888;">Phone</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #f2f2f2; color: #111111;">
                  ${contact.phone || "N/A"} 
                  ${contact.whatsapp ? '<span style="color: #25D366; font-size: 12px; margin-left: 6px; font-weight: 500;">(WhatsApp)</span>' : ''}
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #f2f2f2; font-weight: 500; color: #888888;">Location</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #f2f2f2; color: #111111;">${[contact.city, contact.state].filter(Boolean).join(", ") || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #f2f2f2; font-weight: 500; color: #888888;">Source</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #f2f2f2; color: #111111;">
                  ${contact.source && contact.source.startsWith('http') 
                    ? `<a href="${contact.source}" style="color: #FE5300; text-decoration: underline;">${contact.source}</a>`
                    : (contact.source || 'Website')}
                </td>
              </tr>
            </tbody>
          </table>
          
          <!-- Message -->
          <div style="margin-top: 30px;">
            <p style="font-size: 14px; font-weight: 500; color: #888888; margin-bottom: 10px;">Interests & Message</p>
            <div style="font-size: 14px; color: #111111; line-height: 1.8; background-color: #fafafa; padding: 20px; border-radius: 6px;">
              ${contact.message ? contact.message.replace(/\n/g, '<br/>') : "<span style='color:#999;'>No additional details provided.</span>"}
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; padding: 30px 20px; border-top: 1px solid #eaeaea; margin-top: 20px;">
          <p style="font-size: 12px; color: #999999; margin: 0;">Automated notification from MusafirBaba Website</p>
        </div>
      </div>
    `;
    const toEmail = process.env.NODE_ENV === "development" ? "shubham.jauhari@musafirbaba.com" : "care@musafirbaba.com";
    const emailResponse = await sendEmail(
      toEmail,
      subject,
      emailBody
    );

    const clientSubject = "Thank you for reaching out to us.";
    const clientEmailBody = thankYouEnquirySubmit(name);
    const clientEmailResponse = await sendEmail(
      email,
      clientSubject,
      clientEmailBody
    );
    if (
      !emailResponse ||
      emailResponse.error !== null ||
      !clientEmailResponse ||
      clientEmailResponse.error !== null
    ) {
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
