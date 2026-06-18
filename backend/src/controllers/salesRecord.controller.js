import { SalesRecord } from "../models/SalesRecord.js";
import { SalesRecordComment } from "../models/SalesRecordComment.js";
import { Staff } from "../models/Staff.js";

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
