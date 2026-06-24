import { Holiday } from "../models/Holiday.js";

export const getHolidays = async (req, res, next) => {
  try {
    const { year, month } = req.query;
    let query = {};

    if (year && month) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    } else if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const holidays = await Holiday.find(query).sort({ date: 1 });
    return res.status(200).json({ success: true, data: holidays });
  } catch (error) {
    next(error);
  }
};

export const addHoliday = async (req, res, next) => {
  try {
    const { name, date } = req.body;
    if (!name || !date) {
      return res.status(400).json({ success: false, message: "Name and date are required" });
    }

    const holidayDate = new Date(date);
    holidayDate.setHours(0, 0, 0, 0);

    const existing = await Holiday.findOne({ date: holidayDate });
    if (existing) {
      return res.status(400).json({ success: false, message: "A holiday already exists for this date." });
    }

    const holiday = new Holiday({ name, date: holidayDate });
    await holiday.save();

    return res.status(201).json({ success: true, data: holiday, message: "Holiday added successfully." });
  } catch (error) {
    next(error);
  }
};

export const removeHoliday = async (req, res, next) => {
  try {
    const { id } = req.params;
    const holiday = await Holiday.findByIdAndDelete(id);
    if (!holiday) {
      return res.status(404).json({ success: false, message: "Holiday not found." });
    }
    return res.status(200).json({ success: true, message: "Holiday removed successfully." });
  } catch (error) {
    next(error);
  }
};
