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
    const allActiveCoupan = await Coupan.find({ isActive: true });
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

export { createCoupan, getAllCoupan, updateCoupan, getCoupanById };
