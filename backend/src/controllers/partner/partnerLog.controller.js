import PartnerActionLog from "../../models/partner/PartnerActionLog.js";
import PartnerAuth from "../../models/partner/PartnerAuth.js";
import sendEmail from "../../services/email.service.js";

// @route   GET /api/admin/partner-verification/:partnerId/logs
// @desc    Get action and comment logs for a partner
export const getPartnerLogs = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const logs = await PartnerActionLog.find({ partnerId }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: logs });
  } catch (error) {
    console.error("Get Partner Logs Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/admin/partner-verification/:partnerId/comment
// @desc    Add a manual comment to a partner's log
export const addPartnerComment = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { comment } = req.body;
    const adminId = req.user ? req.user.id : undefined;

    if (!comment) {
      return res.status(400).json({ success: false, message: "Comment is required." });
    }

    const partner = await PartnerAuth.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner not found" });
    }

    const actionLog = new PartnerActionLog({
      partnerId,
      adminId,
      actionType: "Comment",
      comment
    });
    await actionLog.save();

    // Trigger email notification for new comment
    const subject = "MusafirBaba - New Comment on Your Verification Application";
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">New Update from Admin</h2>
        <p>An administrator has left a comment on your partner verification application:</p>
        <blockquote style="border-left: 4px solid #3b82f6; padding-left: 16px; color: #4b5563; font-style: italic;">
          "${comment}"
        </blockquote>
        <p>Please log in to your dashboard to review and take any necessary action.</p>
        <br/>
        <p>Thank you,<br/>The MusafirBaba Team</p>
      </div>
    `;
    await sendEmail(partner.email, subject, htmlBody);

    return res.status(201).json({
      success: true,
      message: "Comment added successfully.",
      data: actionLog
    });
  } catch (error) {
    console.error("Add Partner Comment Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
