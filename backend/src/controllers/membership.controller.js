import { Membership } from "../models/membership.js";

const createMembership = async (req, res) => {
  try {
    const { name, price, duration } = req.body;
    if (!name || !price || !duration) {
      return res
        .status(400)
        .json({ success: false, message: "Required things missing" });
    }
    const membership = new Membership({ ...req.body });
    await membership.save();
    res.status(201).json({ success: true, data: membership });
  } catch (error) {
    console.log("Membership creation failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getAllMembership = async (req, res) => {
  try {
    const membership = await Membership.find().lean();
    res.status(200).json({ success: true, data: membership });
  } catch (error) {
    console.log("Membership getting failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const updateMembership = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id)
      return res.status(400).json({ success: false, message: "Invalid Id" });
    const membership = await Membership.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!membership)
      return res
        .status(404)
        .json({ success: false, message: "Membership not found" });
    res
      .status(200)
      .json({ success: true, message: "Update successful", data: membership });
  } catch (error) {
    console.log("Membership update failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const deleteMembership = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id)
      return res.status(400).json({ success: false, message: "Invalid Id" });
    const membership = await Membership.findByIdAndDelete(id);
    if (!membership)
      return res
        .status(404)
        .json({ success: false, message: "Membership not found" });
    res.status(200).json({
      success: true,
      message: "Membership deleted successfully",
      data: membership,
    });
  } catch (error) {
    console.log("Membership delete failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export {
  createMembership,
  getAllMembership,
  updateMembership,
  deleteMembership,
};
