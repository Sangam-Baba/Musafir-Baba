import PartnerAuth from "../../models/partner/PartnerAuth.js";
import PartnerProfile from "../../models/partner/PartnerProfile.js";
import PartnerVehicle from "../../models/partner/PartnerVehicle.js";
import PartnerDriver from "../../models/partner/PartnerDriver.js";
import PartnerDocument from "../../models/partner/PartnerDocument.js";
import PartnerAddress from "../../models/partner/PartnerAddress.js";
import PartnerBank from "../../models/partner/PartnerBank.js";
import PartnerActionLog from "../../models/partner/PartnerActionLog.js";
import sendEmail from "../../services/email.service.js";

// @route   GET /api/admin/partner-verification/pending
// @desc    Get all partners with their aggregated stats (vehicles, documents)
export const getPendingPartners = async (req, res) => {
  try {
    const { status } = req.query;
    
    // Fetch partners based on status, default to all if not specified
    let filter = {};
    if (status) {
      filter.status = status;
    }

    const partners = await PartnerAuth.find(filter).select("-password -refreshToken -resetPasswordToken").sort({ createdAt: -1 });

    // Aggregate data for each partner
    const aggregatedPartners = await Promise.all(
      partners.map(async (partner) => {
        const authId = partner._id;

        const profile = await PartnerProfile.findOne({ authId });
        
        let vehicleCount = 0;
        let driverCount = 0;
        let documents = [];
        let profileDocuments = [];
        let vehicleDocuments = [];
        let driverDocuments = [];
        let pendingDocsCount = 0;
        let rejectedDocsCount = 0;
        
        let address = null;
        let bank = null;
        let vehiclesList = [];
        let driversList = [];

        if (profile) {
          address = await PartnerAddress.findOne({ partnerId: profile._id });
          bank = await PartnerBank.findOne({ partnerId: profile._id, isPrimary: true });
          
          vehiclesList = await PartnerVehicle.find({ partnerId: profile._id, isDeleted: false });
          const PartnerDriver = (await import("../../models/partner/PartnerDriver.js")).default;
          driversList = await PartnerDriver.find({ partnerId: profile._id, isDeleted: false });
          
          vehicleCount = await PartnerVehicle.countDocuments({ partnerId: profile._id });
          driverCount = driversList.length;
          profileDocuments = await PartnerDocument.find({
            ownerType: "PartnerProfile",
            ownerId: profile._id,
            status: { $ne: "Archived" },
          });
          vehicleDocuments = await PartnerDocument.find({
            ownerType: "PartnerVehicle",
            ownerId: { $in: vehiclesList.map((vehicle) => vehicle._id) },
            status: { $ne: "Archived" },
          });
          driverDocuments = await PartnerDocument.find({
            ownerType: "PartnerDriver",
            ownerId: { $in: driversList.map((driver) => driver._id) },
            status: { $ne: "Archived" },
          });
          
          pendingDocsCount = await PartnerDocument.countDocuments({
            ownerType: "PartnerProfile",
            ownerId: profile._id,
            status: "Pending",
          });
          rejectedDocsCount = await PartnerDocument.countDocuments({
            ownerType: "PartnerProfile",
            ownerId: profile._id,
            status: "Rejected",
          });
        }

        return {
          auth: partner,
          profile: profile || null,
          address: address,
          bank: bank,
          vehicles: vehiclesList,
          drivers: driversList,
          stats: {
            vehicles: vehicleCount,
            drivers: driverCount,
            pendingDocuments: pendingDocsCount,
            rejectedDocuments: rejectedDocsCount,
          },
          documents: profileDocuments.concat(vehicleDocuments, driverDocuments),
          documentSummary: {
            profile: profileDocuments.length,
            vehicle: vehicleDocuments.length,
            driver: driverDocuments.length,
          },
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: aggregatedPartners,
    });
  } catch (error) {
    console.error("Get Pending Partners Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   PUT /api/admin/partner-verification/:partnerId/status
// @desc    Update partner status (Approved, Hold, Rejected, In-Active, Active, Blacklisted)
export const updatePartnerStatus = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { status, reasons, comment } = req.body;
    const adminId = req.user ? req.user.id : undefined;

    const validStatuses = ["Draft", "PendingVerification", "Approved", "Hold", "Rejected", "In-Active", "Active", "Blacklisted"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status provided." });
    }

    const partner = await PartnerAuth.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner not found" });
    }

    const oldStatus = partner.status;
    partner.status = status;
    await partner.save();

    if (status === "Rejected") {
      await PartnerProfile.findOneAndUpdate(
        { authId: partnerId },
        { $set: { isSubmittedForApproval: false } }
      );
    }

    // Log the action
    const actionLog = new PartnerActionLog({
      partnerId,
      adminId,
      actionType: "StatusChange",
      oldStatus,
      newStatus: status,
      reasons: reasons || [],
      comment: comment || ""
    });
    await actionLog.save();

    // Trigger email notification
    let subject = "";
    let htmlBody = "";
    let shouldSend = false;

    if (status === "Approved" || status === "Active") {
      subject = "MusafirBaba - Your Partner Account is Approved!";
      htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Account Approved</h2>
          <p>Congratulations!</p>
          <p>Your MusafirBaba partner account has been successfully verified and approved.</p>
          <p>You can now log in to the partner dashboard and start managing your fleet.</p>
          ${comment ? `<p><strong>Note from Admin:</strong> ${comment}</p>` : ''}
          <br/>
          <p>Thank you,<br/>The MusafirBaba Team</p>
        </div>
      `;
      shouldSend = true;
    } else if (status === "Hold") {
      subject = "MusafirBaba - Your Partner Account is on Hold";
      htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f59e0b;">Account on Hold</h2>
          <p>Your MusafirBaba partner account verification has been placed on hold.</p>
          <p><strong>Reasons:</strong> ${reasons && reasons.length > 0 ? reasons.join(', ') : 'Further review required.'}</p>
          ${comment ? `<p><strong>Note from Admin:</strong> ${comment}</p>` : ''}
          <p>Please log in to your dashboard to resolve these issues.</p>
          <br/>
          <p>Thank you,<br/>The MusafirBaba Team</p>
        </div>
      `;
      shouldSend = true;
    } else if (status === "Rejected") {
      subject = "MusafirBaba - Partner Account Application Rejected";
      htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">Application Rejected</h2>
          <p>Unfortunately, your application to become a MusafirBaba partner has been rejected.</p>
          <p><strong>Reasons:</strong> ${reasons && reasons.length > 0 ? reasons.join(', ') : 'Does not meet requirements.'}</p>
          ${comment ? `<p><strong>Note from Admin:</strong> ${comment}</p>` : ''}
          <br/>
          <p>Thank you,<br/>The MusafirBaba Team</p>
        </div>
      `;
      shouldSend = true;
    }

    if (shouldSend) {
      await sendEmail(partner.email, subject, htmlBody);
    }

    return res.status(200).json({
      success: true,
      message: `Partner status updated to ${status} successfully.`,
      data: partner,
    });
  } catch (error) {
    console.error("Update Partner Status Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   PUT /api/admin/partner-verification/document/:documentId
// @desc    Verify a specific document (Approve or Reject)
export const verifyDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { status, remarks } = req.body; // status should be 'Verified' or 'Rejected'

    if (!["Verified", "Rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status. Must be Verified or Rejected." });
    }

    if (status === "Rejected" && !remarks) {
      return res.status(400).json({ success: false, message: "Remarks are required when rejecting a document." });
    }

    const document = await PartnerDocument.findById(documentId);
    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    document.verificationStatus = status;
    if (remarks) {
      document.remarks = remarks;
    }
    await document.save();

    return res.status(200).json({
      success: true,
      message: `Document ${status.toLowerCase()} successfully.`,
      data: document,
    });
  } catch (error) {
    console.error("Verify Document Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   PUT /api/admin/partner-verification/:partnerId/profile
// @desc    Update partner profile from admin panel
export const updatePartnerProfile = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { fullName, mobileNumber, city, state, partnerType, agencyName, addressLine, pincode } = req.body;

    const profile = await PartnerProfile.findOne({ authId: partnerId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Partner profile not found" });
    }

    if (fullName) profile.fullName = fullName;
    if (mobileNumber) profile.mobileNumber = mobileNumber;
    if (city) profile.city = city;
    if (state) profile.state = state;
    if (partnerType) profile.partnerType = partnerType;
    if (agencyName !== undefined) profile.agencyName = agencyName;

    await profile.save();

    let address = await PartnerAddress.findOne({ partnerId: profile._id });
    if (address) {
      if (addressLine !== undefined) address.addressLine = addressLine;
      if (pincode !== undefined) address.pincode = pincode;
      if (city !== undefined) address.city = city;
      if (state !== undefined) address.state = state;
      await address.save();
    }

    return res.status(200).json({
      success: true,
      message: "Partner profile updated successfully.",
      data: { profile, address },
    });
  } catch (error) {
    console.error("Update Partner Profile Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
