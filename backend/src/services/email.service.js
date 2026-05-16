import { Resend } from "resend";
import dotenv from "dotenv";
dotenv.config();
const resend = new Resend(process.env.Resend_API);

const sendEmail = async (email, subject, htmlBody, attachments = []) => {
  try {
    const payload = {
      from: "MusafirBaba <info@musafirbaba.com>",
      to: email,
      subject: subject,
      html: htmlBody,
    };

    if (attachments && attachments.length > 0) {
      payload.attachments = attachments;
    }

    const data = await resend.emails.send(payload);
    console.log("email send successfully", data);
    return { success: true, id: data.id, error: data.error };
  } catch (error) {
    console.log("email sending fail: ", error);
    return { success: false, error };
  }
};

export default sendEmail;
