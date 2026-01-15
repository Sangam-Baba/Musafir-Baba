import { Newsletter } from "../models/Newsletter.js";
import { Blog } from "../models/Blog.js";
import { News } from "../models/News.js";

const createNewsletter = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ success: false, message: "Email missing" });
    const newsletter = await Newsletter.create({ email });
    const sub = "MusafirBaba Newsletter Subscription Confirmation";
    const htmlBody = thankYouEmail(email);
    const emailResponse = await sendEmail(email, sub, htmlBody);
    if (!emailResponse || emailResponse.error !== null) {
      return res
        .status(500)
        .json({ success: false, message: "Email sending failed" });
    }
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
    const { blog, news } = req.query;
    let content = [];
    if (blog) {
      const blogs = await Blog.find({ status: "published" })
        .sort({ createdAt: -1 })
        .limit(4)
        .lean();
      content = [...blogs];
    }
    if (news) {
      const news = await News.find({ status: "published" })
        .sort({ createdAt: -1 })
        .limit(4)
        .lean();
      content = [...news];
    }
    const sub = "";
    const body = "";
    const allSubs = await find({ status: "active" }).lean();
    for (const subs of allSubs) {
      const emailResponse = await sendEmail(subs.email, sub, body);
      if (!emailResponse || emailResponse.error !== null) {
        console.error("Email sending failed:", emailResponse.error, subs.email);
      }
    }
    res
      .status(200)
      .json({ success: true, message: "Newsletter Send Successfully" });
  } catch (error) {
    console.log("Error sending newsletter", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

const unsubscribe = async (req, res) => {
  try {
    const { email } = req.params;
    if (!email)
      return res
        .status(400)
        .json({ success: false, message: "Missing required things" });

    const subs = await Newsletter.findOneAndUpdate(
      email,
      { status: "inactive" },
      {
        new: true,
      }
    );
    if (!subs)
      return res.status(400).json({ success: false, message: "Not Found" });
    res
      .status(200)
      .json({ success: true, message: "Unsubscribed successfully" });
  } catch (error) {
    console.log("User unsubscribe failed");
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export { createNewsletter, getAllSubscribers, sendNewsletter, unsubscribe };
