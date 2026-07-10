import PartnerDocument from "../../models/partner/PartnerDocument.js";
import PartnerProfile from "../../models/partner/PartnerProfile.js";

// @route   POST /api/partner/document
// @desc    Add a Document (Aadhaar, PAN, RC, etc.)
export const uploadDocument = async (req, res) => {
  try {
    const authId = req.partnerId;
    const { ownerType, ownerId, documentType, fileUrl } = req.body;

    if (!ownerType || !ownerId || !documentType || !fileUrl) {
      return res.status(400).json({ success: false, message: "Missing required document fields" });
    }

    const profile = await PartnerProfile.findOne({ authId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    // Optional: Add strict validation to ensure ownerId actually belongs to this partner
    // For now, assume ownerId is valid if passed from dashboard

    let document = await PartnerDocument.findOne({ ownerType, ownerId, documentType, status: { $ne: "Archived" } });

    if (document) {
      if (document.status === "Approved") {
        return res.status(400).json({ success: false, message: "Cannot replace an approved document." });
      }
      
      // If replacing a rejected document, we should archive it instead of overwriting (per PRD)
      if (document.status === "Rejected" || document.status === "Re-upload Required") {
        document.status = "Archived";
        await document.save();

        // Create new document
        document = new PartnerDocument({
          ownerType,
          ownerId,
          documentType,
          fileUrl,
          status: "Pending",
        });
        await document.save();
      } else {
        // Just update file URL for Pending documents
        document.fileUrl = fileUrl;
        await document.save();
      }
    } else {
      document = new PartnerDocument({
        ownerType,
        ownerId,
        documentType,
        fileUrl,
        status: "Pending",
      });
      await document.save();
    }

    return res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      data: document,
    });
  } catch (error) {
    console.error("Upload Document Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
