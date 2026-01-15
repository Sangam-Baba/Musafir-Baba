import { Newsletter } from "../models/Newsletter.js";
import { Blog } from "../models/Blog.js";
import { News } from "../models/News.js";
import { thankYouEmail } from "../utils/thankYouEmail.js";
import sendEmail from "../services/email.service.js";
import { blogTemplate } from "../utils/blog.template.js";
import jwt from "jsonwebtoken";

export const generateUnsubToken = (email) => {
  return jwt.sign({ email }, process.env.JWT_SECRET_KEY, {
    expiresIn: "30d",
  });
};

export const verifyUnsubToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET_KEY);
};

const createNewsletter = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ success: false, message: "Email missing" });
    const isExist = await Newsletter.findOne({ email });
    if (isExist)
      return res.status(400).json({ success: false, message: "Email missing" });
    const sub = "MusafirBaba Newsletter Subscription Confirmation";
    const htmlBody = thankYouEmail(email);
    const emailResponse = await sendEmail(email, sub, htmlBody);
    if (!emailResponse || emailResponse.error !== null) {
      return res
        .status(500)
        .json({ success: false, message: "Email sending failed" });
    }
    const newsletter = await Newsletter.create({ email });
    res
      .status(201)
      .json({ success: true, message: "Successfully Created Newsletter" });
  } catch (error) {
    console.log("Newslatter creating failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getAllSubscribers = async (req, res) => {
  try {
    const allSubs = await Newsletter.find().sort({ createdAt: -1 }).lean();
    res.status(200).json({
      success: true,
      message: "Successfulley getting all subscribers",
      data: allSubs,
    });
  } catch (error) {
    console.log("Getting all subscribers failed", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

const sendNewsletter = async (req, res) => {
  try {
    const { type } = req.params;
    console.log(type);
    let content = [];
    let dataType = "";

    if (type === "blog") {
      const blogs = await Blog.find({ status: "published" })
        .sort({ createdAt: -1 })
        .limit(4)
        .lean();

      content = blogs;
      dataType = "blog";
    }

    if (type === "news") {
      const newsData = await News.find({ status: "published" })
        .sort({ createdAt: -1 })
        .limit(4)
        .lean();

      content = newsData;
      dataType = "news";
    }

    if (content.length < 4) {
      return res
        .status(400)
        .json({ success: false, message: "At least 4 items required" });
    }

    const subject = "MusafirBaba Weekly Newsletter";

    const allSubs = await Newsletter.find({ status: "active" }).lean();

    await Promise.all(
      allSubs.map((subs) => {
        const token = generateUnsubToken(subs.email);
        const body = blogTemplate(content, dataType, token);
        sendEmail(subs.email, subject, body).catch((err) => {
          console.error("Email failed:", subs.email, err);
        });
      })
    );

    res.status(200).json({
      success: true,
      message: "Newsletter sent successfully",
    });
  } catch (error) {
    console.error("Error sending newsletter", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

const unsubscribe = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send("Invalid request");

    const { email } = verifyUnsubToken(token);

    await Newsletter.findOneAndUpdate({ email }, { status: "inactive" });
    res
      .status(200)
      .json({ success: true, message: "Unsubscribed successfully" });
  } catch (error) {
    console.log("User unsubscribe failed");
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export { createNewsletter, getAllSubscribers, sendNewsletter, unsubscribe };
