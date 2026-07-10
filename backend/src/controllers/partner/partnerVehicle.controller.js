import PartnerVehicle from "../../models/partner/PartnerVehicle.js";
import PartnerProfile from "../../models/partner/PartnerProfile.js";

// @route   POST /api/partner/vehicle
// @desc    Add a new Vehicle
export const addVehicle = async (req, res) => {
  try {
    const authId = req.partnerId;
    const { vehicleData } = req.body;

    if (!vehicleData || !vehicleData.registrationNumber || !vehicleData.brand) {
      return res.status(400).json({ success: false, message: "Registration number and Brand are required" });
    }

    const profile = await PartnerProfile.findOne({ authId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found. Please complete personal details first." });
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
