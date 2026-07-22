import PartnerVehicle from "../../models/partner/PartnerVehicle.js";
import PartnerProfile from "../../models/partner/PartnerProfile.js";
import PartnerDriver from "../../models/partner/PartnerDriver.js";
import mongoose from "mongoose";

// @route   POST /api/partner/vehicle
// @desc    Add a new Vehicle
export const addVehicle = async (req, res) => {
  try {
    const authId = req.partnerId;
    const { vehicleData } = req.body;

    if (!vehicleData || !vehicleData.registrationNumber || !vehicleData.brand || !vehicleData.assignedDriverId) {
      return res.status(400).json({ success: false, message: "Registration number, brand, and assigned driver are required." });
    }

    if (!mongoose.isValidObjectId(vehicleData.assignedDriverId)) {
      return res.status(400).json({ success: false, message: "Invalid driver selected." });
    }

    const profile = await PartnerProfile.findOne({ authId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found. Please complete personal details first." });
    }

    if (profile.partnerType === "Individual") {
      const vehicleCount = await PartnerVehicle.countDocuments({ partnerId: profile._id, isDeleted: false });
      if (vehicleCount >= 1) {
        return res.status(400).json({ success: false, message: "Individual partners can register only one vehicle." });
      }
    }

    const assignedDriver = await PartnerDriver.findOne({
      _id: vehicleData.assignedDriverId,
      partnerId: profile._id,
      isDeleted: false,
    });
    if (!assignedDriver) {
      return res.status(400).json({ success: false, message: "Select a valid driver from your driver roster." });
    }

    const driverAssignment = await PartnerVehicle.findOne({
      partnerId: profile._id,
      assignedDriverId: assignedDriver._id,
      isDeleted: false,
    });
    if (driverAssignment) {
      return res.status(400).json({ success: false, message: "This driver is already assigned to another vehicle." });
    }

    // Check if registration number already exists globally
    const existingVehicle = await PartnerVehicle.findOne({ registrationNumber: vehicleData.registrationNumber });
    if (existingVehicle) {
      return res.status(400).json({ success: false, message: "Vehicle with this registration number already exists." });
    }

    const vehicle = new PartnerVehicle({
      partnerId: profile._id,
      ...vehicleData,
    });
    await vehicle.save();

    return res.status(201).json({
      success: true,
      message: "Vehicle added successfully",
      data: vehicle,
    });
  } catch (error) {
    console.error("Add Vehicle Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   PUT /api/partner/vehicle/:vehicleId/driver
// @desc    Reassign a fleet or agency vehicle to one available driver
export const assignDriverToVehicle = async (req, res) => {
  try {
    const authId = req.partnerId;
    const { vehicleId } = req.params;
    const { driverId } = req.body;

    if (!driverId) {
      return res.status(400).json({ success: false, message: "Driver is required." });
    }

    if (!mongoose.isValidObjectId(vehicleId) || !mongoose.isValidObjectId(driverId)) {
      return res.status(400).json({ success: false, message: "Invalid vehicle or driver selected." });
    }

    const profile = await PartnerProfile.findOne({ authId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    if (!["Fleet Owner", "Travel Agency"].includes(profile.partnerType)) {
      return res.status(403).json({ success: false, message: "Driver reassignment is available for fleet owners and travel agencies only." });
    }

    const [vehicle, driver] = await Promise.all([
      PartnerVehicle.findOne({ _id: vehicleId, partnerId: profile._id, isDeleted: false }),
      PartnerDriver.findOne({ _id: driverId, partnerId: profile._id, isDeleted: false }),
    ]);

    if (!vehicle || !driver) {
      return res.status(404).json({ success: false, message: "Vehicle or driver was not found in your fleet." });
    }

    const existingAssignment = await PartnerVehicle.findOne({
      partnerId: profile._id,
      assignedDriverId: driver._id,
      isDeleted: false,
      _id: { $ne: vehicle._id },
    });
    if (existingAssignment) {
      return res.status(400).json({ success: false, message: "This driver is already assigned to another vehicle." });
    }

    vehicle.assignedDriverId = driver._id;
    await vehicle.save();

    return res.status(200).json({
      success: true,
      message: "Driver assigned to vehicle successfully.",
      data: vehicle,
    });
  } catch (error) {
    console.error("Assign Driver To Vehicle Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
