import { SalesRecord } from "../models/SalesRecord.js";
import { SalesRecordComment } from "../models/SalesRecordComment.js";
import { Staff } from "../models/Staff.js";
import sendEmail from "../services/email.service.js";

const getAdminEmail = () => process.env.NODE_ENV === "production" ? "care@musafirbaba.com" : "shubham.jauhari@musafirbaba.com";
const getFrontendUrl = () => process.env.FRONTEND_URL || "https://musafirbaba.com";

const getEmailTemplate = (title, content, link) => `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 40px auto; border: 1px solid #eaeaea; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.04); background-color: #ffffff;">
    <div style="padding: 24px 24px 16px; border-bottom: 1px solid #f0f0f0;">
      <h2 style="color: #111827; margin: 0; font-size: 18px; font-weight: 600; display: flex; align-items: center;">
        <span style="display: inline-block; width: 8px; height: 8px; background-color: #FE5300; border-radius: 50%; margin-right: 12px;"></span>
        ${title}
      </h2>
    </div>
    <div style="padding: 24px; color: #4b5563; line-height: 1.6; font-size: 15px;">
      ${content}
      <div style="margin-top: 32px;">
        <a href="${link}" style="display: inline-block; padding: 10px 20px; background-color: #111827; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px; transition: background-color 0.2s;">Review in Portal &rarr;</a>
      </div>
    </div>
    <div style="background-color: #f9fafb; padding: 16px 24px; color: #9ca3af; font-size: 12px; border-top: 1px solid #eaeaea;">
      MusafirBaba Admin Portal &bull; Automated Notification
    </div>
  </div>
`;

// Create a new Sales Record
export const createRecord = async (req, res) => {
  try {
    const { clientName, clientPhone, packageName, details, itinerary } = req.body;
    
    const record = new SalesRecord({
      clientName,
      clientPhone,
      packageName,
      details,
      itinerary,
      createdBy: req.user.sub,
    });

    await record.save();

    // Async Email Notification
    Staff.findById(req.user.sub).select("name").then(staff => {
      if (staff) {
        const adminEmail = getAdminEmail();
        const redirectionLink = `${getFrontendUrl()}/admin/sales-record`;
        const subject = `New Sales Record by ${staff.name}`;
        const content = `<p style="margin:0;">A new Sales Record was just created by <strong>${staff.name}</strong>.</p><p style="margin-top:10px;">Please log in to the admin portal to review it securely.</p>`;
        const body = getEmailTemplate(subject, content, redirectionLink);
        sendEmail(adminEmail, subject, body).catch(e => console.error("Sales Record Create Email Error:", e));
      }
    }).catch(console.error);

    res.status(201).json({
      success: true,
      message: "Sales record created successfully",
      data: record,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all Sales Records (Admin sees all, Staff sees their own)
export const getRecords = async (req, res) => {
  try {
    const role = req.user.role;
    let query = {};

    if (role === "staff") {
      query.createdBy = req.user.sub;
    }

    const records = await SalesRecord.find(query)
      .populate("createdBy", "name role avatar")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: records,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get a single Sales Record
export const getRecordById = async (req, res) => {
  try {
    const { id } = req.params;
    const role = req.user.role;

    const record = await SalesRecord.findById(id)
      .populate("createdBy", "name role avatar")
      .populate("approvedBy", "name role avatar")
      .populate("rejectedBy", "name role avatar");

    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    // Staff can only view their own records
    if (role === "staff" && record.createdBy._id.toString() !== req.user.sub.toString()) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.status(200).json({
      success: true,
      data: record,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Status (Admin only)
export const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminRemark } = req.body;

    const role = req.user.role;
    if (role !== "admin" && role !== "superadmin") {
      return res.status(403).json({ success: false, message: "Only admins can approve or reject records" });
    }

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const record = await SalesRecord.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    record.status = status;
    record.adminRemark = adminRemark || "";

    if (status === "Approved") {
      record.approvedBy = req.user.sub;
      record.approvedAt = new Date();
    } else {
      record.rejectedBy = req.user.sub;
      record.rejectedAt = new Date();
    }

    await record.save();

    // Async Email Notification
    const adminEmail = getAdminEmail();
    const redirectionLink = `${getFrontendUrl()}/admin/sales-record`;
    const subject = `Record marked as ${status}`;
    const content = `<p style="margin:0;">A Sales Record status was updated to <strong style="color: #FE5300;">${status}</strong>.</p><p style="margin-top:10px;">Please log in to the admin portal to review the changes securely.</p>`;
    const body = getEmailTemplate(subject, content, redirectionLink);
    sendEmail(adminEmail, subject, body).catch(e => console.error("Sales Record Status Email Error:", e));

    res.status(200).json({
      success: true,
      message: `Record ${status.toLowerCase()} successfully`,
      data: record,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add a comment
export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, parentId } = req.body;

    const record = await SalesRecord.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    const role = req.user.role;
    // Staff can only comment on their own records
    if (role === "staff" && record.createdBy.toString() !== req.user.sub.toString()) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const comment = new SalesRecordComment({
      recordId: id,
      authorId: req.user.sub,
      authorModel: role === "user" ? "User" : "Staff", // Fallback, though usually Staff
      content,
      parentId: parentId || null,
    });

    await comment.save();

    // Async Email Notification
    Staff.findById(req.user.sub).select("name").then(staff => {
      if (staff) {
        const adminEmail = getAdminEmail();
        const redirectionLink = `${getFrontendUrl()}/admin/sales-record`;
        const subject = `New Comment by ${staff.name}`;
        const content = `<p style="margin:0;"><strong>${staff.name}</strong> has added a new comment to a Sales Record.</p><p style="margin-top:10px;">Please log in to the admin portal to review it securely.</p>`;
        const body = getEmailTemplate(subject, content, redirectionLink);
        sendEmail(adminEmail, subject, body).catch(e => console.error("Sales Record Comment Email Error:", e));
      }
    }).catch(console.error);

    const populatedComment = await SalesRecordComment.findById(comment._id).populate(
      "authorId",
      "name role avatar"
    );

    res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: populatedComment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get comments for a record
export const getComments = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await SalesRecord.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    const role = req.user.role;
    // Staff can only view comments on their own records
    if (role === "staff" && record.createdBy.toString() !== req.user.sub.toString()) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const comments = await SalesRecordComment.find({ recordId: id })
      .populate("authorId", "name role avatar")
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: comments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
