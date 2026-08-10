import RiderProfile from "../../models/rider/RiderProfile.js";
import RiderDocument from "../../models/rider/RiderDocument.js";
import { uploadToR2 } from "../../services/fileUpload.service.js";

// @route   GET /api/rider/documents
// @desc    Fetch the logged-in rider's submitted ID document (front/back + status)
export const getMyDocument = async (req, res) => {
  try {
    const riderProfile = await RiderProfile.findOne({ authId: req.riderId }).select("_id");
    if (!riderProfile) {
      return res.status(404).json({ success: false, message: "Rider profile not found" });
    }

    const document = await RiderDocument.findOne({ riderProfileId: riderProfile._id });

    return res.status(200).json({
      success: true,
      data: document
        ? {
            documentType: document.documentType,
            documentName: document.documentName,
            documentIdNumber: document.documentIdNumber,
            fileUrlFront: document.fileUrlFront,
            fileUrlBack: document.fileUrlBack,
            status: document.status,
            remarks: document.remarks,
          }
        : null,
    });
  } catch (error) {
    console.error("Get Rider Document Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/rider/documents
// @desc    Upload/replace the logged-in rider's ID document (front and/or back).
//          Any change resets status back to "Pending" for re-review.
export const uploadMyDocument = async (req, res) => {
  try {
    const riderProfile = await RiderProfile.findOne({ authId: req.riderId }).select("_id");
    if (!riderProfile) {
      return res.status(404).json({ success: false, message: "Rider profile not found" });
    }

    const frontFile = req.files?.front?.[0];
    const backFile = req.files?.back?.[0];
    const { documentName, documentIdNumber } = req.body;

    if (!frontFile && !backFile) {
      return res.status(400).json({ success: false, message: "At least one of front/back images is required" });
    }
    if (!documentName || !documentIdNumber) {
      return res.status(400).json({ success: false, message: "Document name and document ID are required" });
    }

    const update = { status: "Pending", remarks: undefined, documentName, documentIdNumber };
    if (frontFile) {
      update.fileUrlFront = await uploadToR2(frontFile.buffer, "rider/documents", frontFile.mimetype);
    }
    if (backFile) {
      update.fileUrlBack = await uploadToR2(backFile.buffer, "rider/documents", backFile.mimetype);
    }

    const document = await RiderDocument.findOneAndUpdate(
      { riderProfileId: riderProfile._id },
      { $set: update, $setOnInsert: { riderProfileId: riderProfile._id } },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "Document uploaded",
      data: {
        documentType: document.documentType,
        documentName: document.documentName,
        documentIdNumber: document.documentIdNumber,
        fileUrlFront: document.fileUrlFront,
        fileUrlBack: document.fileUrlBack,
        status: document.status,
      },
    });
  } catch (error) {
    console.error("Upload Rider Document Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
