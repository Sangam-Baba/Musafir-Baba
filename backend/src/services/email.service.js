import { Resend } from "resend";
import dotenv from "dotenv";
dotenv.config();
const resend = new Resend(process.env.Resend_API);

const sendEmail = async (email, subject, htmlBody) => {
  try {
    const data = await resend.emails.send({
      from: "MusafirBaba <info@musafirbaba.com>",
      to: email,
      subject: subject,
      html: htmlBody,
    });
    console.log("email send successfully", data);
    return { success: true, id: data.id, error: data.error };
  } catch (error) {
    console.log("email sending fail: ", error);
    return { success: false, error };
  }
};

export default sendEmail;
