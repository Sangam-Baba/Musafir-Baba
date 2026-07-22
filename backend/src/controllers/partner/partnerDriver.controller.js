import PartnerDriver from "../../models/partner/PartnerDriver.js";
import PartnerProfile from "../../models/partner/PartnerProfile.js";

// @route   POST /api/partner/driver
// @desc    Add a new Driver
export const addDriver = async (req, res) => {
  try {
    const authId = req.partnerId;
    const driverData = req.body;

    if (!driverData || !driverData.name || !driverData.mobile || !driverData.licenceNumber) {
      return res.status(400).json({ success: false, message: "Name, Mobile, and Licence Number are required." });
    }

    const profile = await PartnerProfile.findOne({ authId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found. Please complete personal details first." });
    }

    if (profile.partnerType === "Individual") {
      const driverCount = await PartnerDriver.countDocuments({ partnerId: profile._id, isDeleted: false });
      if (driverCount >= 1) {
        return res.status(400).json({ success: false, message: "Individual partners can register only one driver." });
      }
    }

    // Check if licence number already exists globally
    const existingDriver = await PartnerDriver.findOne({ licenceNumber: driverData.licenceNumber });
    if (existingDriver) {
      return res.status(400).json({ success: false, message: "Driver with this licence number already exists." });
    }

    const driver = new PartnerDriver({
      partnerId: profile._id,
      ...driverData,
    });
    await driver.save();

    return res.status(201).json({
      success: true,
      message: "Driver added successfully",
      data: driver,
    });
  } catch (error) {
    console.error("Add Driver Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   GET /api/partner/driver
// @desc    Get all drivers for a partner
export const getDrivers = async (req, res) => {
  try {
    const authId = req.partnerId;
    const profile = await PartnerProfile.findOne({ authId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    const drivers = await PartnerDriver.find({ partnerId: profile._id, isDeleted: false });

    return res.status(200).json({
      success: true,
      data: drivers,
    });
  } catch (error) {
    console.error("Get Drivers Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
