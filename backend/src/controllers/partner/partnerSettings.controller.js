import { PartnerSettings } from "../../models/partner/PartnerSettings.js";

// GET /partner/settings
export const getSettings = async (req, res) => {
  try {
    const authId = req.partnerId; // from auth middleware
    
    let settings = await PartnerSettings.findOne({ authId });
    
    if (!settings) {
      // Return empty defaults if not yet created
      settings = {
        vehicleConfigs: []
      };
    }

    res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// POST /partner/settings
export const updateSettings = async (req, res) => {
  try {
    const authId = req.partnerId;
    const { vehicleConfigs } = req.body;

    let settings = await PartnerSettings.findOne({ authId });

    if (settings) {
      settings.vehicleConfigs = vehicleConfigs || settings.vehicleConfigs;
      await settings.save();
    } else {
      settings = await PartnerSettings.create({
        authId,
        vehicleConfigs: vehicleConfigs || [],
      });
    }

    res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      settings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
