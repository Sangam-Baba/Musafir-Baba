import { Attendance } from "../models/Attendance.js";
import { Staff } from "../models/Staff.js";

// Utility function to calculate distance using Haversine formula (returns distance in km)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

// Default office location if not provided in env
const OFFICE_LAT = process.env.OFFICE_LAT || 26.770197; // Default to New Delhi lat
const OFFICE_LNG = process.env.OFFICE_LNG || 80.9282652; // Default to New Delhi lng

const getStartOfDay = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
};

export const getTodayAttendance = async (req, res, next) => {
  try {
    const startOfDay = getStartOfDay();
    const attendance = await Attendance.findOne({
      staff: req.user.sub,
      date: startOfDay,
    });
    return res.status(200).json({ success: true, attendance });
  } catch (error) {
    next(error);
  }
};

export const checkIn = async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    const startOfDay = getStartOfDay();
    
    let attendance = await Attendance.findOne({
      staff: req.user.sub,
      date: startOfDay,
    });

    if (attendance && attendance.checkInTime) {
      return res.status(400).json({ success: false, message: "Already checked in today." });
    }

    const distance = calculateDistance(lat, lng, OFFICE_LAT, OFFICE_LNG);

    if (!attendance) {
      attendance = new Attendance({
        staff: req.user.sub,
        date: startOfDay,
      });
    }

    attendance.checkInTime = new Date();
    attendance.checkInLocation = { lat, lng, distance };
    await attendance.save();

    return res.status(200).json({ success: true, attendance, message: "Checked in successfully" });
  } catch (error) {
    next(error);
  }
};

export const checkOut = async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    const startOfDay = getStartOfDay();
    
    let attendance = await Attendance.findOne({
      staff: req.user.sub,
      date: startOfDay,
    });

    if (!attendance || !attendance.checkInTime) {
      return res.status(400).json({ success: false, message: "You must check in first." });
    }

    if (attendance.checkOutTime) {
      return res.status(400).json({ success: false, message: "Already checked out today." });
    }

    // Check if there is an active break and end it automatically
    const openBreak = attendance.breaks.find((b) => !b.end);
    const now = new Date();
    if (openBreak) {
      openBreak.end = now;
    }

    const distance = calculateDistance(lat, lng, OFFICE_LAT, OFFICE_LNG);

    attendance.checkOutTime = now;
    attendance.checkOutLocation = { lat, lng, distance };

    // Calculate hours
    const totalOfficeMs = attendance.checkOutTime - attendance.checkInTime;
    
    let totalBreakMs = 0;
    attendance.breaks.forEach((b) => {
      if (b.start && b.end) {
        totalBreakMs += (b.end - b.start);
      }
    });

    const totalWorkingMs = totalOfficeMs - totalBreakMs;

    attendance.totalOfficeHours = parseFloat((totalOfficeMs / (1000 * 60 * 60)).toFixed(2));
    attendance.totalWorkingHours = parseFloat((totalWorkingMs / (1000 * 60 * 60)).toFixed(2));

    await attendance.save();

    return res.status(200).json({ success: true, attendance, message: "Checked out successfully" });
  } catch (error) {
    next(error);
  }
};

export const startBreak = async (req, res, next) => {
  try {
    const startOfDay = getStartOfDay();
    
    let attendance = await Attendance.findOne({
      staff: req.user.sub,
      date: startOfDay,
    });

    if (!attendance || !attendance.checkInTime) {
      return res.status(400).json({ success: false, message: "You must check in first." });
    }

    if (attendance.checkOutTime) {
      return res.status(400).json({ success: false, message: "Already checked out today." });
    }

    const hasOpenBreak = attendance.breaks.some((b) => !b.end);
    if (hasOpenBreak) {
      return res.status(400).json({ success: false, message: "You are already on a break." });
    }

    attendance.breaks.push({ start: new Date() });
    await attendance.save();

    return res.status(200).json({ success: true, attendance, message: "Break started" });
  } catch (error) {
    next(error);
  }
};

export const endBreak = async (req, res, next) => {
  try {
    const startOfDay = getStartOfDay();
    
    let attendance = await Attendance.findOne({
      staff: req.user.sub,
      date: startOfDay,
    });

    if (!attendance || !attendance.checkInTime) {
      return res.status(400).json({ success: false, message: "You must check in first." });
    }

    const openBreak = attendance.breaks.find((b) => !b.end);
    if (!openBreak) {
      return res.status(400).json({ success: false, message: "No active break found." });
    }

    openBreak.end = new Date();
    await attendance.save();

    return res.status(200).json({ success: true, attendance, message: "Break ended" });
  } catch (error) {
    next(error);
  }
};

export const getAllAttendance = async (req, res, next) => {
  try {
    const { date } = req.query; // Optional date filter (YYYY-MM-DD)
    
    let targetDate = new Date();
    if (date) {
      targetDate = new Date(date);
    }
    targetDate.setHours(0, 0, 0, 0);

    const records = await Attendance.find({ date: targetDate })
      .populate("staff", "name email role")
      .sort({ createdAt: -1 });

    const allStaff = await Staff.find({ isActive: true, role: { $in: ["staff", "admin", "superadmin"] } }).select("name email role");

    const fullData = allStaff.map(staffMember => {
      const existingRecord = records.find(r => r.staff && r.staff._id.toString() === staffMember._id.toString());
      if (existingRecord) {
        return existingRecord;
      }
      return {
        _id: "absent_" + staffMember._id,
        staff: staffMember,
        date: targetDate,
        checkInTime: null,
        checkOutTime: null,
        breaks: [],
        totalOfficeHours: 0,
        totalWorkingHours: 0
      };
    });

    return res.status(200).json({ success: true, data: fullData });
  } catch (error) {
    next(error);
  }
};
