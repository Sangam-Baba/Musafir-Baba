import { AuditLog } from "../models/AuditLog.js";

/**
 * Get self activity history (For all authenticated staff)
 */
export const getMyHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = { userId: req.user._id };

    if (req.query.moduleName) query.moduleName = req.query.moduleName;
    if (req.query.actionType) query.actionType = req.query.actionType;
    if (req.query.search) {
      query.documentTitle = { $regex: req.query.search, $options: "i" };
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching my history:", error.message);
    res.status(500).json({ success: false, message: "Server Error fetching history" });
  }
};

/**
 * Get all activity history (Superadmin/Admin only)
 */
export const getAllHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.userId) query.userId = req.query.userId;
    if (req.query.moduleName) query.moduleName = req.query.moduleName;
    if (req.query.actionType) query.actionType = req.query.actionType;
    if (req.query.search) {
      query.documentTitle = { $regex: req.query.search, $options: "i" };
    }
    if (req.query.startDate && req.query.endDate) {
      query.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      };
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching all history:", error.message);
    res.status(500).json({ success: false, message: "Server Error fetching all history" });
  }
};
