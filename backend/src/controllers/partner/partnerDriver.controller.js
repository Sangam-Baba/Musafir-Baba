import PartnerDriver from "../../models/partner/PartnerDriver.js";
import PartnerProfile from "../../models/partner/PartnerProfile.js";
import { storeImageIfDataUrl } from "../../services/partnerAccount.service.js";

// Fields only the admin/system may change -- ignored if a partner sends them.
const PROTECTED_DRIVER_FIELDS = ["_id", "partnerId", "status", "isDeleted", "createdAt", "updatedAt"];
async function cleanDriverData(driverData = {}) {
  const data = { ...driverData };
  for (const key of PROTECTED_DRIVER_FIELDS) delete data[key];
  for (const key of ["licenceImageUrl", "photoUrl"]) {
    if (data[key]) data[key] = await storeImageIfDataUrl(data[key], "partner-drivers");
  }
  return data;
}

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
      ...(await cleanDriverData(driverData)),
      partnerId: profile._id,
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

// @route   PUT /api/partner/driver/:driverId
// @desc    Update driver details
export const updateDriver = async (req, res) => {
  try {
    const authId = req.partnerId;
    const { driverId } = req.params;
    const driverData = req.body;

    const profile = await PartnerProfile.findOne({ authId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    const driver = await PartnerDriver.findOne({ _id: driverId, partnerId: profile._id, isDeleted: false });
    if (!driver) {
      return res.status(404).json({ success: false, message: "Driver not found." });
    }

    // Optional: add checks for existing licenceNumber if it's changing
    if (driverData.licenceNumber && driverData.licenceNumber !== driver.licenceNumber) {
      const existingDriver = await PartnerDriver.findOne({ licenceNumber: driverData.licenceNumber });
      if (existingDriver) {
        return res.status(400).json({ success: false, message: "Driver with this licence number already exists." });
      }
    }

    Object.assign(driver, await cleanDriverData(driverData));
    await driver.save();

    return res.status(200).json({
      success: true,
      message: "Driver updated successfully.",
      data: driver,
    });
  } catch (error) {
    console.error("Update Driver Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
