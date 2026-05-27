import { Attendance } from "../models/Attendance.js";
import { Staff } from "../models/Staff.js";
import { uploadToR2 } from "../services/fileUpload.service.js";

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
const OFFICE_LAT = process.env.OFFICE_LAT || 28.611123809619; // Exact office Lat
const OFFICE_LNG = process.env.OFFICE_LNG || 76.9749109459618; // Exact office Lng

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
    const { lat, lng, photo } = req.body;
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

    let checkInPhotoUrl = null;
    if (photo) {
      try {
        const base64Data = photo.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        checkInPhotoUrl = await uploadToR2(buffer, "attendance");
      } catch (err) {
        console.error("Check-in photo upload failed", err);
      }
    }

    attendance.checkInTime = new Date();
    attendance.checkInLocation = { lat, lng, distance };
    if (checkInPhotoUrl) attendance.checkInPhotoUrl = checkInPhotoUrl;
    await attendance.save();

    return res.status(200).json({ success: true, attendance, message: "Checked in successfully" });
  } catch (error) {
    next(error);
  }
};

export const checkOut = async (req, res, next) => {
  try {
    const { lat, lng, photo } = req.body;
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

    let checkOutPhotoUrl = null;
    if (photo) {
      try {
        const base64Data = photo.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        checkOutPhotoUrl = await uploadToR2(buffer, "attendance");
      } catch (err) {
        console.error("Check-out photo upload failed", err);
      }
    }

    attendance.checkOutTime = now;
    attendance.checkOutLocation = { lat, lng, distance };
    if (checkOutPhotoUrl) attendance.checkOutPhotoUrl = checkOutPhotoUrl;

    // Calculate hours
    const totalOfficeMs = attendance.checkOutTime - attendance.checkInTime;
    
    let totalBreakMs = 0;
    attendance.breaks.forEach((b) => {
      if (b.start && b.end) {
        totalBreakMs += (b.end - b.start);
      }
    });

    const totalWorkingMs = totalOfficeMs - totalBreakMs;

    const formatMsToHHMM = (ms) => {
      if (ms < 0) return 0;
      const totalMins = Math.floor(ms / 60000);
      const hours = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      return parseFloat(`${hours}.${mins.toString().padStart(2, '0')}`);
    };

    attendance.totalOfficeHours = formatMsToHHMM(totalOfficeMs);
    attendance.totalWorkingHours = formatMsToHHMM(totalWorkingMs);

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

export const getUserwiseAttendance = async (req, res, next) => {
  try {
    const { userId, month } = req.query; 

    if (!userId || !month) {
      return res.status(400).json({ success: false, message: "userId and month are required" });
    }

    // month is expected to be "YYYY-MM"
    const [year, m] = month.split('-');
    if (!year || !m) {
      return res.status(400).json({ success: false, message: "Invalid month format. Use YYYY-MM" });
    }

    const startDate = new Date(year, m - 1, 1);
    const endDate = new Date(year, m, 0, 23, 59, 59, 999);

    const records = await Attendance.find({
      staff: userId,
      date: { $gte: startDate, $lte: endDate }
    })
      .populate("staff", "name email role")
      .sort({ date: -1 });

    return res.status(200).json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
};
