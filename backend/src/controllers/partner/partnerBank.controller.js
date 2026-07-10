import PartnerBank from "../../models/partner/PartnerBank.js";
import PartnerProfile from "../../models/partner/PartnerProfile.js";

// @route   POST /api/partner/bank
// @desc    Add or Update Bank Account
export const updateBankAccount = async (req, res) => {
  try {
    const authId = req.partnerId;
    const { bankData } = req.body;

    if (!bankData || !bankData.accountNumber || !bankData.ifsc || !bankData.accountHolderName) {
      return res.status(400).json({ success: false, message: "Account number, IFSC, and Holder Name are required" });
    }

    const profile = await PartnerProfile.findOne({ authId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found. Please complete personal details first." });
    }

    let bank = await PartnerBank.findOne({ partnerId: profile._id, isPrimary: true });

    if (bank) {
      // Prevent updating if already verified (or handle based on business logic)
      if (bank.status === "Verified") {
        return res.status(400).json({ success: false, message: "Cannot edit a verified bank account." });
      }

      bank = await PartnerBank.findOneAndUpdate(
        { _id: bank._id },
        { $set: { ...bankData, status: "Pending" } }, // Reset status on update
        { new: true }
      );
    } else {
      bank = new PartnerBank({
        partnerId: profile._id,
        isPrimary: true,
        ...bankData,
      });
      await bank.save();
    }

    return res.status(200).json({
      success: true,
      message: "Bank account saved successfully",
      data: bank,
    });
  } catch (error) {
    console.error("Update Bank Account Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
