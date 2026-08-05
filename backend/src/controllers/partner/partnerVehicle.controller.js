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

    if (!vehicleData || !vehicleData.registrationNumber || !vehicleData.brand) {
      return res.status(400).json({ success: false, message: "Registration number and brand are required." });
    }

    const profile = await PartnerProfile.findOne({ authId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found. Please complete personal details first." });
    }

    let assignedDriverId = vehicleData.assignedDriverId;

    // Support atomic driver creation if "driver" sub-object is supplied
    if (!assignedDriverId && vehicleData.driver) {
      const { name, mobile, licenseNo, licenceNumber, licenceImageUrl } = vehicleData.driver;
      const driverLicence = licenseNo || licenceNumber;
      
      if (!name || !mobile || !driverLicence) {
        return res.status(400).json({ success: false, message: "Driver name, mobile, and license number are required." });
      }

      // Check if driver with this mobile already exists for this partner
      let driver = await PartnerDriver.findOne({ partnerId: profile._id, mobile, isDeleted: false });
      if (!driver) {
        driver = new PartnerDriver({
          partnerId: profile._id,
          name,
          mobile,
          licenceNumber: driverLicence,
          licenceImageUrl: licenceImageUrl || "",
          status: "Active"
        });
        await driver.save();
      }
      assignedDriverId = driver._id;
    }

    if (!assignedDriverId) {
      return res.status(400).json({ success: false, message: "Assigned driver is required." });
    }

    if (!mongoose.isValidObjectId(assignedDriverId)) {
      return res.status(400).json({ success: false, message: "Invalid driver selected." });
    }

    const assignedDriver = await PartnerDriver.findOne({
      _id: assignedDriverId,
      partnerId: profile._id,
      isDeleted: false,
    });
    if (!assignedDriver) {
      return res.status(400).json({ success: false, message: "Select a valid driver from your driver roster." });
    }

    // Check if registration number already exists globally
    const existingVehicle = await PartnerVehicle.findOne({ registrationNumber: vehicleData.registrationNumber });
    if (existingVehicle) {
      return res.status(400).json({ success: false, message: "Vehicle with this registration number already exists." });
    }

    const vehicle = new PartnerVehicle({
      partnerId: profile._id,
      ...vehicleData,
      assignedDriverId,
      verificationStatus: "Verified",
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

// @route   GET /api/partner/vehicle/:vehicleId
// @desc    Get a single vehicle with full driver data
export const getVehicleById = async (req, res) => {
  try {
    const authId = req.partnerId;
    const { vehicleId } = req.params;

    if (!mongoose.isValidObjectId(vehicleId)) {
      return res.status(400).json({ success: false, message: "Invalid vehicle ID." });
    }

    const profile = await PartnerProfile.findOne({ authId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    const vehicle = await PartnerVehicle.findOne({ _id: vehicleId, partnerId: profile._id, isDeleted: false })
      .populate("assignedDriverId", "name mobile licenceNumber licenceImageUrl status photoUrl");

    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found." });
    }

    return res.status(200).json({ success: true, data: vehicle });
  } catch (error) {
    console.error("Get Vehicle By ID Error:", error);
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

// @route   PUT /api/partner/vehicle/:vehicleId
// @desc    Update vehicle details
export const updateVehicle = async (req, res) => {
  try {
    const authId = req.partnerId;
    const { vehicleId } = req.params;
    const { vehicleData } = req.body;

    if (!mongoose.isValidObjectId(vehicleId)) {
      return res.status(400).json({ success: false, message: "Invalid vehicle ID." });
    }

    const profile = await PartnerProfile.findOne({ authId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    const vehicle = await PartnerVehicle.findOne({ _id: vehicleId, partnerId: profile._id, isDeleted: false });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found." });
    }

    // Optional: Only allow update if profile is not Approved, or allow it but keep status logic.
    // Assuming we just update fields provided
    Object.assign(vehicle, vehicleData);
    await vehicle.save();

    return res.status(200).json({
      success: true,
      message: "Vehicle updated successfully.",
      data: vehicle,
    });
  } catch (error) {
    console.error("Update Vehicle Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   GET /api/partner/vehicles
// @desc    Get all vehicles for the authenticated partner
export const getVehicles = async (req, res) => {
  try {
    const authId = req.partnerId;
    const profile = await PartnerProfile.findOne({ authId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    const vehicles = await PartnerVehicle.find({ partnerId: profile._id, isDeleted: false })
      .populate("assignedDriverId", "name mobile licenceNumber");

    return res.status(200).json({
      success: true,
      count: vehicles.length,
      data: vehicles,
    });
  } catch (error) {
    console.error("Get Vehicles Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   DELETE /api/partner/vehicle/:vehicleId
// @desc    Soft-delete a vehicle from the roster
export const deleteVehicle = async (req, res) => {
  try {
    const authId = req.partnerId;
    const { vehicleId } = req.params;

    if (!mongoose.isValidObjectId(vehicleId)) {
      return res.status(400).json({ success: false, message: "Invalid vehicle ID." });
    }

    const profile = await PartnerProfile.findOne({ authId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    const vehicle = await PartnerVehicle.findOneAndUpdate(
      { _id: vehicleId, partnerId: profile._id, isDeleted: false },
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Vehicle deleted successfully",
    });
  } catch (error) {
    console.error("Delete Vehicle Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
