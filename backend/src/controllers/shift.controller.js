import mongoose from "mongoose";
import { Shift } from "../models/Shift.js";
import { Staff } from "../models/Staff.js";
import { AuditLog } from "../models/AuditLog.js";

const HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

// Returns an error message, or null when the payload is valid
const validateShiftPayload = ({ name, startTime, endTime, graceMinutes }) => {
  if (!name || !String(name).trim()) return "Shift name is required.";
  if (!startTime || !HHMM_REGEX.test(startTime)) return "A valid start time (HH:mm) is required.";
  if (!endTime || !HHMM_REGEX.test(endTime)) return "A valid end time (HH:mm) is required.";
  if (toMinutes(endTime) <= toMinutes(startTime)) return "End time must be after start time.";
  if (graceMinutes !== undefined) {
    const g = Number(graceMinutes);
    if (!Number.isInteger(g) || g < 0 || g > 180) return "Grace minutes must be a whole number between 0 and 180.";
  }
  return null;
};

const logShiftAudit = (req, actionType, description, entityId, changes) =>
  AuditLog.create({
    userId: req.user.sub,
    userName: req.user.name || "Admin",
    role: req.user.role || "admin",
    actionType,
    moduleName: "Shift",
    entityId,
    description,
    changes,
  }).catch((e) => console.error("Shift audit log error:", e));

// Shifts plus the attendance-eligible staff list (same filter the attendance
// tables use) so the admin tab can show assignments and unassigned staff.
export const getShifts = async (req, res, next) => {
  try {
    const shifts = await Shift.find().sort({ startTime: 1, name: 1 });
    const staffRaw = await Staff.find({
      isActive: true,
      role: { $in: ["staff", "admin", "superadmin"] },
    }).select("name email designation attendanceEligible shift");
    const staff = staffRaw.filter((s) => s.attendanceEligible !== false && s.email !== "admin@musafirbaba.com");

    return res.status(200).json({ success: true, data: { shifts, staff } });
  } catch (error) {
    next(error);
  }
};

export const createShift = async (req, res, next) => {
  try {
    const error = validateShiftPayload(req.body || {});
    if (error) return res.status(400).json({ success: false, message: error });

    const { name, startTime, endTime, graceMinutes } = req.body;
    const existing = await Shift.findOne({ name: String(name).trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: "A shift with this name already exists." });
    }

    const shift = await Shift.create({
      name: String(name).trim(),
      startTime,
      endTime,
      graceMinutes: graceMinutes !== undefined ? Number(graceMinutes) : undefined,
    });

    logShiftAudit(req, "CREATE", `Created shift ${shift.name} (${startTime} - ${endTime})`, shift._id, { newValue: shift.toObject() });

    return res.status(201).json({ success: true, data: shift, message: "Shift created successfully." });
  } catch (error) {
    next(error);
  }
};

export const updateShift = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid shift id." });
    }

    const shift = await Shift.findById(id);
    if (!shift) return res.status(404).json({ success: false, message: "Shift not found." });

    const merged = {
      name: req.body?.name ?? shift.name,
      startTime: req.body?.startTime ?? shift.startTime,
      endTime: req.body?.endTime ?? shift.endTime,
      graceMinutes: req.body?.graceMinutes ?? shift.graceMinutes,
    };
    const error = validateShiftPayload(merged);
    if (error) return res.status(400).json({ success: false, message: error });

    const duplicate = await Shift.findOne({ name: String(merged.name).trim(), _id: { $ne: id } });
    if (duplicate) {
      return res.status(400).json({ success: false, message: "A shift with this name already exists." });
    }

    const oldValue = shift.toObject();
    shift.name = String(merged.name).trim();
    shift.startTime = merged.startTime;
    shift.endTime = merged.endTime;
    shift.graceMinutes = Number(merged.graceMinutes);
    await shift.save();

    logShiftAudit(req, "UPDATE", `Updated shift ${shift.name}`, shift._id, { oldValue, newValue: shift.toObject() });

    return res.status(200).json({ success: true, data: shift, message: "Shift updated successfully." });
  } catch (error) {
    next(error);
  }
};

export const deleteShift = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid shift id." });
    }

    const assignedCount = await Staff.countDocuments({ shift: id });
    if (assignedCount > 0) {
      return res.status(400).json({
        success: false,
        message: `This shift is assigned to ${assignedCount} staff member(s). Move them to another shift first.`,
      });
    }

    const shift = await Shift.findByIdAndDelete(id);
    if (!shift) return res.status(404).json({ success: false, message: "Shift not found." });

    logShiftAudit(req, "DELETE", `Deleted shift ${shift.name}`, shift._id, { oldValue: shift.toObject() });

    return res.status(200).json({ success: true, message: "Shift deleted successfully." });
  } catch (error) {
    next(error);
  }
};

// Body: { staffIds: string[], shiftId: string | null } -- null unassigns
export const assignShift = async (req, res, next) => {
  try {
    const { staffIds, shiftId } = req.body || {};
    if (!Array.isArray(staffIds) || staffIds.length === 0 || !staffIds.every((s) => mongoose.isValidObjectId(s))) {
      return res.status(400).json({ success: false, message: "staffIds must be a non-empty list of valid ids." });
    }

    let shift = null;
    if (shiftId) {
      if (!mongoose.isValidObjectId(shiftId)) {
        return res.status(400).json({ success: false, message: "Invalid shift id." });
      }
      shift = await Shift.findById(shiftId);
      if (!shift) return res.status(404).json({ success: false, message: "Shift not found." });
    }

    const result = await Staff.updateMany({ _id: { $in: staffIds } }, { $set: { shift: shift ? shift._id : null } });

    logShiftAudit(
      req,
      "UPDATE",
      shift
        ? `Assigned shift ${shift.name} to ${result.modifiedCount} staff member(s)`
        : `Removed shift from ${result.modifiedCount} staff member(s)`,
      shift?._id,
      { newValue: { staffIds, shiftId: shift ? shift._id : null } }
    );

    return res.status(200).json({ success: true, message: shift ? "Shift assigned successfully." : "Shift removed successfully." });
  } catch (error) {
    next(error);
  }
};
