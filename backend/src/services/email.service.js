import { Resend } from 'resend';
import dotenv from  "dotenv"
dotenv.config();
console.log(process.env.Resend_API)
const resend = new Resend(process.env.Resend_API);

const sendEmail=async(email, subject, emailBody)=>{
    try {
    const data = await resend.emails.send({
      from: 'sangam.gupta@musafirbaba.com',
      to: email,
      subject: subject,
     text: emailBody,
    });
    console.log("email send successfully", data)
    // res.status(200).json(data);
  } catch(error) {
    console.log("email sending fail")
    // res.status(400).json(error);
  }
};

export default sendEmail;