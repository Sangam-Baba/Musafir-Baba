import { Coupan } from "../models/CoupanSchema.js";

const createCoupan = async (req, res) => {
  try {
    const { code, type, value, minAmount, maxDiscount, applicableItems } =
      req.body;
    if (!code || !type || !value || !minAmount || !applicableItems) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }
    const coupan = new Coupan({
      code,
      type,
      value,
      minAmount,
      maxDiscount,
      applicableItems,
      validFrom: req.body.validFrom,
      validTill: req.body.validTill,
    });
    await coupan.save();
    res.status(201).json({
      success: true,
      data: coupan,
      message: "Coupan created successfully",
    });
  } catch (error) {
    console.log("Error creating coupan", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const updateCoupan = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const coupan = await Coupan.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!coupan)
      return res.status(404).json({ success: false, message: "Invalid Id" });
    res
      .status(200)
      .json({ success: true, message: "Update successful", data: coupan });
  } catch (error) {
    console.log("Error updating coupan", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getAllCoupan = async (req, res) => {
  try {
    const allActiveCoupan = await Coupan.find({
      isActive: true,
      validTill: { $gte: new Date() },
    })
      .select(
        "-isActive -usedCount -createdAt -updatedAt -perUserLimit -validFrom -validTill",
      )
      .lean();
    res.status(200).json({
      success: true,
      data: allActiveCoupan,
      message: "Successfully got all active coupan",
    });
  } catch (error) {
    console.log("Error getting coupan", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getCoupanById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const coupan = await Coupan.findById(id);
    if (!coupan) {
      return res.status(404).json({ success: false, message: "Invalid Id" });
    }
    res.status(200).json({ success: true, data: coupan });
  } catch (error) {
    console.log("Error getting coupan", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const validateCoupan = async (req, res) => {
  try {
    const { id, amount, itemId, itemType } = req.body;
    if (!id || !itemId || !itemType || !amount) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }
    const coupan = await Coupan.findById(id);
    if (!coupan || !coupan.isActive) {
      return res.status(404).json({ success: false, message: "Invalid Id" });
    }
    if (
      new Date().getTime() > new Date(coupan.validTill).getTime() ||
      new Date().getTime() < new Date(coupan.validFrom).getTime()
    ) {
      return res.status(400).json({ success: false, message: "Code Expired" });
    }
    if (coupan.applicableItems.length > 0) {
      const applicableItems = coupan.applicableItems.some(
        (item) =>
          item.itemId.toString() === itemId.toString() &&
          item.itemType === itemType,
      );
      if (!applicableItems) {
        return res
          .status(400)
          .json({ success: false, message: "Package not applicable" });
      }
    }
    if (amount < coupan.minAmount) {
      return res
        .status(400)
        .json({ success: false, message: "Package not applicable" });
    }
    let discount = 0;
    if (coupan.type === "PERCENTAGE") {
      discount = (amount * coupan.value) / 100;
    } else {
      discount = coupan.value;
    }
    discount = Math.min(discount, coupan.maxDiscount);

    res.status(200).json({
      success: true,
      message: "Successfully applied coupon",
      data: {
        discount,
        code: coupan.code,
        finalAmount: amount - discount,
        _id: coupan._id,
      },
    });
  } catch (error) {
    console.log("Error in validating coupan", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

export {
  createCoupan,
  getAllCoupan,
  updateCoupan,
  getCoupanById,
  validateCoupan,
};
