import { VisaApplication } from "../models/VisaApplication.js";
import { Visa } from "../models/Visa.js";

// Fetch an application by ID
export const getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    const application = await VisaApplication.findById(id).populate("visaId");
    
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    // Optional: check if application belongs to user if userId is set
    if (application.userId && req.user && application.userId.toString() !== req.user.userId) {
       // Wait, req.user structure varies, usually req.user.id or req.user.userId
    }

    res.status(200).json({ success: true, data: application });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch application", error: error.message });
  }
};

// Create or update a draft application (Steps 1 and 2)
export const saveDraftApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { visaId, travellers, documents, currentStep, email, phone } = req.body;

    let totalCost = 0;
    if (visaId) {
      const visa = await Visa.findById(visaId);
      if (visa) {
        // Calculate total cost based on number of travellers
        totalCost = visa.cost * (travellers ? travellers.length : 1);
      }
    }

    let application;

    if (id) {
      // Update existing
      application = await VisaApplication.findByIdAndUpdate(
        id,
        {
          ...(visaId && { visaId }),
          ...(travellers && { travellers }),
          ...(documents && { documents }),
          ...(currentStep && { currentStep }),
          ...(email && { email }),
          ...(phone && { phone }),
          totalCost
        },
        { new: true }
      );
    } else {
      // Create new
      application = new VisaApplication({
        visaId,
        travellers: travellers || [],
        documents: documents || [],
        currentStep: currentStep || 1,
        email,
        phone,
        totalCost
      });
      await application.save();
    }

    res.status(200).json({ success: true, data: application });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to save application", error: error.message });
  }
};

// Final submit before payment (Step 3) - Requires Auth
export const submitApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user.userId || req.user._id;

    if (!userId) {
       return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    const application = await VisaApplication.findById(id);
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    application.userId = userId;
    application.currentStep = 3;
    application.applicationStatus = "Submitted";
    
    await application.save();

    res.status(200).json({ success: true, data: application });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to submit application", error: error.message });
  }
};
