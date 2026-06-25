import { Attendance } from "../models/Attendance.js";
import { Staff } from "../models/Staff.js";
import { AuditLog } from "../models/AuditLog.js";
import { Holiday } from "../models/Holiday.js";
import { uploadToR2 } from "../services/fileUpload.service.js";
import sendEmail from "../services/email.service.js";

const parseLocalDateStr = (dateStr) => {
  const dStr = dateStr.split('T')[0];
  return new Date(`${dStr}T00:00:00.000+05:30`);
};

const getISTEndOfDay = (dateStr) => {
  const dStr = dateStr.split('T')[0];
  return new Date(`${dStr}T23:59:59.999+05:30`);
};

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
  // Calculate current IST date string, then return its 00:00:00 equivalent
  const istDateStr = new Date(Date.now() + 5.5 * 3600000).toISOString().split('T')[0];
  return new Date(`${istDateStr}T00:00:00.000+05:30`);
};

const checkEligibility = async (userId) => {
  const staff = await Staff.findById(userId);
  if (staff && staff.attendanceEligible === false) {
    return false;
  }
  return true;
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
    const isEligible = await checkEligibility(req.user.sub);
    if (!isEligible) {
      return res.status(400).json({ success: false, message: "Attendance tracking is not applicable for you." });
    }

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
    // Determine if late (after 9:15 AM IST)
    const checkInTimeIST = new Date(attendance.checkInTime.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    const hours = checkInTimeIST.getHours();
    const minutes = checkInTimeIST.getMinutes();
    
    if (hours > 9 || (hours === 9 && minutes > 15)) {
      attendance.attendanceStatus = "Late";
    } else {
      attendance.attendanceStatus = "Present";
    }

    await attendance.save();

    return res.status(200).json({ success: true, attendance, message: "Checked in successfully" });
  } catch (error) {
    next(error);
  }
};

export const checkOut = async (req, res, next) => {
  try {
    const isEligible = await checkEligibility(req.user.sub);
    if (!isEligible) {
      return res.status(400).json({ success: false, message: "Attendance tracking is not applicable for you." });
    }

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
    const isEligible = await checkEligibility(req.user.sub);
    if (!isEligible) {
      return res.status(400).json({ success: false, message: "Attendance tracking is not applicable for you." });
    }

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
    const isEligible = await checkEligibility(req.user.sub);
    if (!isEligible) {
      return res.status(400).json({ success: false, message: "Attendance tracking is not applicable for you." });
    }

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
    
    let targetDateStart = getStartOfDay();
    let targetDateEnd = new Date(targetDateStart.getTime() + 86399999);
    
    if (date) {
      targetDateStart = parseLocalDateStr(date);
      targetDateEnd = getISTEndOfDay(date);
    }

    const startOfDay = targetDateStart;
    const endOfDay = targetDateEnd;

    const records = await Attendance.find({ date: { $gte: startOfDay, $lte: endOfDay } })
      .populate("staff", "name email role attendanceEligible")
      .sort({ createdAt: -1 });

    const allStaffRaw = await Staff.find({ isActive: true, role: { $in: ["staff", "admin", "superadmin"] } }).select("name email role attendanceEligible");

    // Exclude users who are not eligible for attendance or are the superadmin email
    const allStaff = allStaffRaw.filter(staff => staff.attendanceEligible !== false && staff.email !== "admin@musafirbaba.com");

    // Check if targetDateStart is Sunday or a registered public holiday
    const isSunday = targetDateStart.getDay() === 0;
    const holidayRecord = await Holiday.findOne({ date: targetDateStart });
    const isHoliday = isSunday || !!holidayRecord;

    const fullData = allStaff.map(staffMember => {
      const existingRecord = records.find(r => r.staff && r.staff._id.toString() === staffMember._id.toString());
      if (existingRecord) {
        return existingRecord;
      }
      return {
        _id: "absent_" + staffMember._id,
        staff: staffMember,
        date: targetDateStart,
        checkInTime: null,
        checkOutTime: null,
        breaks: [],
        totalOfficeHours: 0,
        totalWorkingHours: 0,
        leaveType: "none",
        leaveStatus: "none",
        attendanceStatus: isHoliday ? "Holiday" : "Absent"
      };
    });

    return res.status(200).json({ success: true, data: fullData });
  } catch (error) {
    next(error);
  }
};

export const getUserwiseAttendance = async (req, res, next) => {
  try {
    let { userId, month } = req.query; 

    if (req.user.role === "staff") {
      userId = req.user.sub;
    }

    if (!userId || !month) {
      return res.status(400).json({ success: false, message: "userId and month are required" });
    }

    // month is expected to be "YYYY-MM"
    const [year, m] = month.split('-');
    if (!year || !m) {
      return res.status(400).json({ success: false, message: "Invalid month format. Use YYYY-MM" });
    }

    const lastDay = new Date(year, m, 0).getDate();
    const startDate = new Date(`${year}-${m}-01T00:00:00.000+05:30`);
    const endDate = new Date(`${year}-${m}-${String(lastDay).padStart(2, '0')}T23:59:59.999+05:30`);

    const records = await Attendance.find({
      staff: userId,
      date: { $gte: startDate, $lte: endDate }
    })
      .populate("staff", "name email role")
      .sort({ date: -1, updatedAt: -1 });

    return res.status(200).json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
};

export const applyLeave = async (req, res, next) => {
  try {
    const { date, endDate, leaveType, reason } = req.body;
    if (!date || !leaveType || leaveType === "none") {
      return res.status(400).json({ success: false, message: "Date and valid leaveType are required." });
    }

    const start = parseLocalDateStr(date);
    const today = getStartOfDay();

    if (start < today) {
      return res.status(400).json({ success: false, message: "Cannot apply for leave on past dates." });
    }

    const end = endDate ? parseLocalDateStr(endDate) : parseLocalDateStr(date);

    if (end < start) {
      return res.status(400).json({ success: false, message: "End date cannot be before start date." });
    }

    const dates = [];
    let current = new Date(start);
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    const totalDays = dates.length;

    const staff = await Staff.findById(req.user.sub);
    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff not found" });
    }

    // Auto-replenish balance logic removed since we now allow low balances

    let actualLeaveType = leaveType;
    let actualLeaveStatus = "Pending";
    let appliedAttendanceStatus = "Absent";

    // Deduct balances based on leaveType (allowing negative balances since handled in working days)
    if (leaveType === "Leave") {
      staff.availableLeaveBalance -= totalDays;
    } else if (leaveType === "Half Day") {
      const deductAmt = totalDays * 0.5;
      staff.availableLeaveBalance -= deductAmt;
    } else if (leaveType === "Short Leave") {
      if (staff.availableShortLeaveBalance < totalDays) {
        return res.status(400).json({ success: false, message: "Insufficient short leave balance." });
      }
      staff.availableShortLeaveBalance -= totalDays;
    } else if (leaveType === "WFH") {
      // WFH has no balance deduction typically, and is generally requested or marked
      appliedAttendanceStatus = "WFH";
    }

    await staff.save();

    await AuditLog.create({
      userId: req.user.sub,
      userName: staff.name,
      role: staff.role,
      actionType: "UPDATE",
      moduleName: "Leave",
      description: `Applied for ${actualLeaveType} for ${totalDays} days.`,
    });

    const attendanceRecords = [];
    for (const d of dates) {
      let attendance = await Attendance.findOne({
        staff: req.user.sub,
        date: d,
      });

      if (!attendance) {
        attendance = new Attendance({
          staff: req.user.sub,
          date: d,
        });
      }

      attendance.leaveType = actualLeaveType;
      attendance.leaveStatus = "Pending";
      attendance.leaveReason = reason || "";
      if(actualLeaveType === "Half Day"){
        attendance.attendanceStatus = "Absent"; 
      }
      await attendance.save();
      attendanceRecords.push(attendance);
    }

    // Send Emails asynchronously without blocking the response
    const dateRangeStr = dates.length > 1 ? `${dates[0].toDateString()} to ${dates[dates.length - 1].toDateString()}` : dates[0].toDateString();
    
    const adminEmailHtml = `
      <h3>New Leave Application</h3>
      <p><strong>Staff Member:</strong> ${staff.name} (${staff.email})</p>
      <p><strong>Leave Type:</strong> ${actualLeaveType}</p>
      <p><strong>Dates:</strong> ${dateRangeStr} (${totalDays} days)</p>
      <p><strong>Reason:</strong> ${reason || "N/A"}</p>
      <br>
      <p>Please log in to the admin panel to approve or reject this request.</p>
    `;

    const userEmailHtml = `
      <h3>Leave Application Received</h3>
      <p>Hi ${staff.name},</p>
      <p>Your leave application has been successfully submitted and is currently pending approval.</p>
      <p><strong>Leave Type:</strong> ${actualLeaveType}</p>
      <p><strong>Dates:</strong> ${dateRangeStr} (${totalDays} days)</p>
      <p><strong>Reason:</strong> ${reason || "N/A"}</p>
      <br>
      <p>You will receive an email once it is processed.</p>
    `;

    const adminEmail = process.env.NODE_ENV === "production" ? "care@musafirbaba.com" : "shubham.jauhari@musafirbaba.com";
    sendEmail(adminEmail, `Leave Application - ${staff.name}`, adminEmailHtml).catch(e => console.error("Admin Email Error:", e));
    sendEmail(staff.email, "Leave Application Received", userEmailHtml).catch(e => console.error("User Email Error:", e));

    return res.status(200).json({ success: true, message: "Leave applied successfully.", attendanceRecords });
  } catch (error) {
    next(error);
  }
};

export const approveLeave = async (req, res, next) => {
  try {
    const { attendanceId, status } = req.body; // status: "Approved" or "Rejected"
    if (!attendanceId || !["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Attendance ID and valid status are required." });
    }

    const attendance = await Attendance.findById(attendanceId).populate("staff");
    if (!attendance) {
      return res.status(404).json({ success: false, message: "Attendance record not found." });
    }

    if (attendance.leaveStatus !== "Pending") {
      return res.status(400).json({ success: false, message: "Leave is already processed." });
    }

    attendance.leaveStatus = status;

    if (status === "Approved") {
      if (attendance.leaveType === "WFH") {
        attendance.attendanceStatus = "WFH";
      } else if (attendance.leaveType === "Leave") {
        attendance.attendanceStatus = "Leave";
      } else if (attendance.leaveType === "Half Day") {
        attendance.attendanceStatus = "Half Day";
      } else if (attendance.leaveType === "Short Leave") {
        attendance.attendanceStatus = "Short Leave";
      }
    } else if (status === "Rejected") {
      // Refund balance since it was deducted on apply
      const staff = await Staff.findById(attendance.staff._id);
      if (staff) {
        if (attendance.leaveType === "Leave") {
          staff.availableLeaveBalance += 1;
        } else if (attendance.leaveType === "Half Day") {
          staff.availableLeaveBalance += 0.5;
        } else if (attendance.leaveType === "Short Leave") {
          staff.availableShortLeaveBalance += 1;
        }
        await staff.save();
      }
      attendance.leaveType = "none";
      attendance.attendanceStatus = "Absent";
    }

    await attendance.save();

    await AuditLog.create({
      userId: req.user.sub,
      userName: "Admin", // Ideally fetch admin name
      actionType: "UPDATE",
      moduleName: "Leave",
      description: `Leave ${status} for ${attendance.staff.name}`,
    });

    const userEmailHtml = `
      <h3>Leave Application Update</h3>
      <p>Hi ${attendance.staff.name},</p>
      <p>Your leave application for <strong>${new Date(attendance.date).toDateString()}</strong> (${attendance.leaveType}) has been <strong>${status}</strong>.</p>
      <br>
      <p>Regards,<br>MusafirBaba Admin Team</p>
    `;
    
    try {
      console.log(`Attempting to send ${status} email to ${attendance.staff.email}`);
      await sendEmail(attendance.staff.email, `Leave Application ${status}`, userEmailHtml);
      console.log(`Email successfully sent to ${attendance.staff.email}`);
    } catch (e) {
      console.error("User Email Error on Approve/Reject:", e);
    }

    return res.status(200).json({ success: true, message: `Leave ${status.toLowerCase()} successfully.`, attendance });
  } catch (error) {
    next(error);
  }
};

export const markLeave = async (req, res, next) => {
  try {
    const { staffId, date, endDate, leaveType, reason } = req.body;
    if (!staffId || !date || !leaveType) {
      return res.status(400).json({ success: false, message: "Staff ID, date, and leaveType are required." });
    }

    const start = parseLocalDateStr(date);
    const end = endDate ? parseLocalDateStr(endDate) : parseLocalDateStr(date);

    if (end < start) {
      return res.status(400).json({ success: false, message: "End date cannot be before start date." });
    }

    const dates = [];
    let current = new Date(start);
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    const attendanceRecords = [];
    for (const d of dates) {
      let attendance = await Attendance.findOne({
        staff: staffId,
        date: d,
      });

      if (!attendance) {
        attendance = new Attendance({
          staff: staffId,
          date: d,
        });
      }

      attendance.leaveType = leaveType;
      attendance.leaveStatus = "Approved"; // Directly approved by admin
      attendance.leaveReason = reason || "";
      if (leaveType === "WFH") attendance.attendanceStatus = "WFH";
      else if (leaveType === "Leave") attendance.attendanceStatus = "Leave";
      else if (leaveType === "Half Day") attendance.attendanceStatus = "Half Day";
      else if (leaveType === "Short Leave") attendance.attendanceStatus = "Short Leave";
      else attendance.attendanceStatus = "Absent";

      await attendance.save();
      attendanceRecords.push(attendance);
    }

    // Deduct balances without converting Short Leave (Admin override)
    const staff = await Staff.findById(staffId);
    if(staff) {
        if(leaveType === "Leave") staff.availableLeaveBalance -= dates.length;
        if(leaveType === "Half Day") staff.availableLeaveBalance -= dates.length * 0.5;
        if(leaveType === "Short Leave") staff.availableShortLeaveBalance -= dates.length;
        await staff.save();
    }

    await AuditLog.create({
      userId: req.user.sub,
      userName: "Admin",
      actionType: "UPDATE",
      moduleName: "Leave",
      description: `Admin marked ${leaveType} for ${dates.length} days for staff ${staffId}`,
    });

    return res.status(200).json({ success: true, message: "Leave marked successfully.", attendanceRecords });
  } catch (error) {
    next(error);
  }
};

export const adminMarkAttendance = async (req, res, next) => {
  try {
    const { staffId, date, status, reason } = req.body;
    // status should be Present, Absent, WFH, Holiday, Weekend
    if (!staffId || !date || !status) {
      return res.status(400).json({ success: false, message: "Staff ID, date, and status are required." });
    }

    const targetDateStart = parseLocalDateStr(date);
    const targetDateEnd = getISTEndOfDay(date);

    let attendances = await Attendance.find({
      staff: staffId,
      date: { $gte: targetDateStart, $lte: targetDateEnd },
    });

    if (attendances.length === 0) {
      let attendance = new Attendance({
        staff: staffId,
        date: targetDateStart,
      });
      attendance.attendanceStatus = status;
      if (reason) attendance.leaveReason = reason;
      
      if (["WFH", "Leave", "Short Leave", "Half Day"].includes(status)) {
        attendance.leaveType = status;
        attendance.leaveStatus = "Approved";
      } else {
        attendance.leaveType = "none";
        attendance.leaveStatus = "none";
      }
      await attendance.save();
    } else {
      for (let attendance of attendances) {
        attendance.attendanceStatus = status;
        if (reason) attendance.leaveReason = reason;
        
        if (["WFH", "Leave", "Short Leave", "Half Day"].includes(status)) {
          attendance.leaveType = status;
          attendance.leaveStatus = "Approved";
        } else {
          attendance.leaveType = "none";
          attendance.leaveStatus = "none";
        }
        await attendance.save();
      }
    }

    await AuditLog.create({
      userId: req.user.sub,
      userName: "Admin",
      actionType: "UPDATE",
      moduleName: "Attendance",
      description: `Admin marked attendance as ${status} for staff ${staffId} on ${date}`,
    });

    // Provide the first updated attendance just for the response format
    const returnedAttendance = attendances.length > 0 ? attendances[0] : await Attendance.findOne({ staff: staffId, date: targetDateStart });

    return res.status(200).json({ success: true, message: "Attendance marked successfully.", attendance: returnedAttendance });
  } catch (error) {
    next(error);
  }
};

export const getAllLeaves = async (req, res, next) => {
  try {
    const records = await Attendance.find({
      leaveType: { $in: ["Leave", "Short Leave", "Half Day", "WFH"] }
    })
      .populate("staff", "name email role")
      .sort({ date: -1, createdAt: -1 });

    return res.status(200).json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
};

export const getMyLeaves = async (req, res, next) => {
  try {
    const records = await Attendance.find({
      staff: req.user.sub,
      $or: [
        { leaveType: { $in: ["Leave", "Short Leave", "Half Day", "WFH"] } },
        { attendanceStatus: "Absent" }
      ]
    }).sort({ date: -1, createdAt: -1 });

    return res.status(200).json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
};

export const getMonthlyReport = async (req, res, next) => {
  try {
    const { month } = req.query; // YYYY-MM
    if (!month) {
      return res.status(400).json({ success: false, message: "Month is required (YYYY-MM)" });
    }

    const [yearStr, monthStr] = month.split("-");
    const year = parseInt(yearStr);
    const m = parseInt(monthStr);

    const lastDay = new Date(year, m, 0).getDate();
    const startDate = new Date(`${yearStr}-${monthStr}-01T00:00:00.000+05:30`);
    const endDate = new Date(`${yearStr}-${monthStr}-${String(lastDay).padStart(2, '0')}T23:59:59.999+05:30`);
    
    // Determine the end day for the loop
    const now = new Date();
    let daysToCalculate = new Date(year, m, 0).getDate(); // Default to last day of month

    // If the requested month is the current ongoing month, only calculate up to today's date
    // Note: Use IST date for today to match accurate days
    const nowIST = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    if (year === nowIST.getFullYear() && m === (nowIST.getMonth() + 1)) {
      daysToCalculate = nowIST.getDate();
    }

    // Fetch all staff eligible for attendance
    let staffQuery = {
      isActive: true,
      role: { $in: ["staff", "admin", "superadmin"] },
      attendanceEligible: { $ne: false },
      email: { $ne: "admin@musafirbaba.com" }
    };
    
    // If a normal staff member requests the report, only fetch their own data
    if (req.user.role === "staff") {
      staffQuery._id = req.user.sub;
    }

    const allStaff = await Staff.find(staffQuery).select("name email totalLeaveBalance");

    // Fetch all attendance records for the month
    const records = await Attendance.find({
      date: { $gte: startDate, $lte: endDate }
    }).populate("staff", "name");

    // Fetch holidays for the month
    const holidays = await Holiday.find({
      date: { $gte: startDate, $lte: endDate }
    });
    const holidayDates = holidays.map(h => h.date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));

    const reportData = allStaff.map(staffMember => {
      let presentCount = 0;
      let lateCount = 0;
      let halfDayCount = 0;
      let shortLeaveCount = 0;
      let leaveCount = 0;
      let absentCount = 0;
      let holidayCount = 0;
      let wfhCount = 0;

      for (let i = 1; i <= daysToCalculate; i++) {
        // Target IST date string (YYYY-MM-DD)
        const targetDateStr = `${year}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        
        const existingRecord = records.find(r => 
          r.staff && 
          r.staff._id.toString() === staffMember._id.toString() && 
          r.date && new Date(r.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === targetDateStr
        );

        let finalStatus = "Absent";

        if (existingRecord) {
          finalStatus = existingRecord.attendanceStatus || "Absent";
        } else {
          // Fallback logic
          // Determine if targetDateStr is a Sunday
          const isSunday = new Date(year, m - 1, i).getDay() === 0;
          const isPublicHoliday = holidayDates.includes(targetDateStr);
          if (isSunday || isPublicHoliday) {
            finalStatus = "Holiday";
          }
        }

        switch (finalStatus) {
          case "Present": presentCount++; break;
          case "Late": lateCount++; break;
          case "Half Day": halfDayCount++; break;
          case "Short Leave": shortLeaveCount++; break;
          case "Leave": leaveCount++; break;
          case "Absent": absentCount++; break;
          case "Holiday": 
          case "Weekend": holidayCount++; break;
          case "WFH": wfhCount++; break;
        }
      }

      return {
        staff: {
          _id: staffMember._id,
          name: staffMember.name,
          email: staffMember.email,
          totalLeaveBalance: staffMember.totalLeaveBalance || 0
        },
        presentCount,
        lateCount,
        halfDayCount,
        shortLeaveCount,
        leaveCount,
        absentCount,
        holidayCount,
        wfhCount,
        daysInMonth: daysToCalculate
      };
    });

    return res.status(200).json({ success: true, data: reportData });
  } catch (error) {
    next(error);
  }
};

