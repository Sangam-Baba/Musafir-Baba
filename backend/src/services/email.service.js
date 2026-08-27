import { Resend } from "resend";
import dotenv from "dotenv";
dotenv.config();
const resendApiKey =
  process.env.Resend_API ||
  process.env.RESEND_API_KEY ||
  process.env.RESEND_API;

const resend = new Resend(resendApiKey);

const sendEmail = async (
  email,
  subject,
  htmlBody,
  attachments = [],
  replyTo = null
) => {
  try {
    const toRecipients = Array.isArray(email)
      ? email
      : typeof email === "string" && email.includes(",")
      ? email.split(",").map((e) => e.trim()).filter(Boolean)
      : email;

    const payload = {
      from: "MusafirBaba <info@musafirbaba.com>",
      to: toRecipients,
      subject: subject,
      html: htmlBody,
    };

    if (replyTo) {
      payload.reply_to = replyTo;
    }

    if (attachments && attachments.length > 0) {
      payload.attachments = attachments;
    }

    const response = await resend.emails.send(payload);
    if (response.error) {
      console.error("Resend email delivery error:", response.error);
      return { success: false, id: undefined, error: response.error };
    }

    console.log("Email sent successfully, ID:", response.data?.id);
    return { success: true, id: response.data?.id, error: null };
  } catch (error) {
    console.error("Email sending fail: ", error);
    return { success: false, id: undefined, error };
  }
};

export default sendEmail;
