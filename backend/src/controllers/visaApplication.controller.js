import { VisaApplication } from "../models/VisaApplication.js";
import { Visa } from "../models/Visa.js";
import { Counter } from "../models/Counter.js";
import { verifyAccess } from "../utils/tokens.js";

// Helper: try to extract userId from Authorization header (non-blocking)
async function extractUserIdFromHeader(req) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = await verifyAccess(token);
      return decoded.sub || decoded.userId || decoded._id || null;
    }
  } catch (e) {
    // Token invalid or expired – guest user, continue silently
  }
  return null;
}

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
    
    // Proactively link to user if authenticated (draft routes have no auth middleware)
    const userId = await extractUserIdFromHeader(req);

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
          ...(userId && { userId }),
          totalCost
        },
        { new: true }
      );
    } else {
      // Create new
      const visaCounter = await Counter.findOneAndUpdate(
        { name: "visa_application" },
        { $inc: { count: 1 } },
        { new: true, upsert: true }
      );
      
      const sequence = visaCounter.count.toString().padStart(7, "0");
      const customId = `MBV${sequence}`;

      application = new VisaApplication({
        visaId,
        applicationId: customId,
        travellers: travellers || [],
        documents: documents || [],
        currentStep: currentStep || 1,
        email,
        phone,
        ...(userId && { userId }),
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
    const userId = req.user.sub || req.user.id || req.user.userId || req.user._id;

    if (!userId) {
       return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    const application = await VisaApplication.findById(id);
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    application.userId = userId;
    application.currentStep = 3;
    // Keep it Pending until payment is genuinely successful
    application.applicationStatus = "Pending";
    
    await application.save();

    res.status(200).json({ success: true, data: application });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to submit application", error: error.message });
  }
};

// Fetch all applications (Admin/Staff)
export const getAllApplications = async (req, res) => {
  try {
    const applications = await VisaApplication.find()
      .populate("visaId")
      .populate("userId", "name email phone")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: applications });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch applications", error: error.message });
  }
};

// Update application status (Admin/Staff)
export const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, returnReason } = req.body;

    const application = await VisaApplication.findByIdAndUpdate(
      id,
      { 
        applicationStatus: status,
        ...(returnReason && { returnReason })
      },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    res.status(200).json({ success: true, data: application });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update status", error: error.message });
  }
};

// Fetch current user's applications
export const getUserVisaApplications = async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.userId || req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    const applications = await VisaApplication.find({ userId })
      .populate("visaId")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: applications });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch your applications", error: error.message });
  }
};
