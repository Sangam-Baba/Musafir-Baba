import { HolidaysPage } from "../models/HolidaysPage.js";

// Public: returns the single settings document for the /holidays landing
// page, or null if the admin hasn't configured it yet (frontend falls
// back to its hardcoded defaults in that case).
const getHolidaysPage = async (req, res) => {
  try {
    const holidaysPage = await HolidaysPage.findOne().lean();
    res.status(200).json({ success: true, data: holidaysPage });
  } catch (error) {
    console.log("Holidays Page getting failed: ", error.message);
    res
      .status(500)
      .json({ success: false, message: `Server Error: ${error.message}` });
  }
};

// Admin: creates the settings document on first save, updates it after.
const upsertHolidaysPage = async (req, res) => {
  try {
    const holidaysPage = await HolidaysPage.findOneAndUpdate(
      {},
      req.body,
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    res.status(200).json({ success: true, data: holidaysPage });
  } catch (error) {
    console.log("Holidays Page update failed: ", error.message);
    res
      .status(500)
      .json({ success: false, message: `Server Error: ${error.message}` });
  }
};

export { getHolidaysPage, upsertHolidaysPage };
