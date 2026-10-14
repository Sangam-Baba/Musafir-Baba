import PartnerDocument from "../../models/partner/PartnerDocument.js";
import PartnerProfile from "../../models/partner/PartnerProfile.js";
import PartnerVehicle from "../../models/partner/PartnerVehicle.js";
import PartnerDriver from "../../models/partner/PartnerDriver.js";
import { storeImageIfDataUrl } from "../../services/partnerAccount.service.js";

// @route   POST /api/partner/document
// @desc    Add a Document (Aadhaar, PAN, RC, etc.)
export const uploadDocument = async (req, res) => {
  try {
    const authId = req.partnerId;
    const { ownerType, ownerId, documentType } = req.body;
    let { fileUrl, fileUrlBack } = req.body;

    if (!ownerType || !ownerId || !documentType || !fileUrl) {
      return res.status(400).json({ success: false, message: "Missing required document fields" });
    }

    const profile = await PartnerProfile.findOne({ authId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    // The document must belong to this partner (their profile, vehicle or driver).
    const owns =
      ownerType === "PartnerProfile"
        ? String(ownerId) === String(profile._id)
        : ownerType === "PartnerVehicle"
          ? !!(await PartnerVehicle.exists({ _id: ownerId, partnerId: profile._id }))
          : ownerType === "PartnerDriver"
            ? !!(await PartnerDriver.exists({ _id: ownerId, partnerId: profile._id }))
            : false;
    if (!owns) {
      return res.status(403).json({ success: false, message: "You can only upload documents for your own account." });
    }

    // Keep photos in storage (CDN URL), not inline in the database.
    fileUrl = await storeImageIfDataUrl(fileUrl, "partner-docs");
    if (fileUrlBack) fileUrlBack = await storeImageIfDataUrl(fileUrlBack, "partner-docs");

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
        // New uploads wait for admin review (Approve/Reject in Fleet verification).
        document = new PartnerDocument({
          ownerType,
          ownerId,
          documentType,
          fileUrl,
          ...(fileUrlBack ? { fileUrlBack } : {}),
          status: "Pending",
        });
        await document.save();
      } else {
        // Pending documents can be replaced until admin reviews them.
        document.fileUrl = fileUrl;
        if (fileUrlBack) document.fileUrlBack = fileUrlBack;
        document.status = "Pending";
        await document.save();
      }
    } else {
      document = new PartnerDocument({
        ownerType,
        ownerId,
        documentType,
        fileUrl,
        ...(fileUrlBack ? { fileUrlBack } : {}),
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
