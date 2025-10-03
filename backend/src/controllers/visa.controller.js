import { Visa } from "../models/Visa.js";

const createVisa = async (req, res) => {
  try {
    const { country, duration, cost, visaType, title } = req.body;
    if (!country || !duration || !cost || !visaType || !title) {
      return res
        .status(400)
        .json({ success: false, message: "Required things missing" });
    }
    const visa = new Visa({ ...req.body });
    await visa.save();
    res.status(201).json({ success: true, data: visa });
  } catch (error) {
    console.log("Visa creation failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getAllVisa = async (req, res) => {
  try {
    const { filter = {} } = req.query;
    if (req.query?.country) filter.country = req.query.country;
    const visa = await Visa.find(filter).sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, data: visa });
  } catch (error) {
    console.log("All Visa getting failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
const getVisaById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id)
      return res.status(400).json({ success: false, message: "Invalid Id" });
    const visa = await Visa.findById(id);
    if (!visa)
      return res.status(404).json({ success: false, message: "Invalid Id" });
    res
      .status(200)
      .json({
        success: true,
        message: "Visa fetched successfully",
        data: visa,
      });
  } catch (error) {
    console.log("Visa getting by Id failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const updateVisa = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id)
      return res.status(400).json({ success: false, message: "Invalid Id" });
    const visa = await Visa.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!visa)
      return res.status(404).json({ success: false, message: "Invalid Id" });
    res
      .status(200)
      .json({ success: true, message: "Update successful", data: visa });
  } catch (error) {
    console.log("Visa update failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const deleteVisa = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id)
      return res.status(400).json({ success: false, message: "Invalid Id" });
    const visa = await Visa.findByIdAndDelete(id);
    if (!visa)
      return res.status(404).json({ success: false, message: "Invalid Id" });
    res
      .status(200)
      .json({ success: true, message: "Visa Delete successful", data: visa });
  } catch (error) {
    console.log("Visa delition failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export { createVisa, getAllVisa, updateVisa, deleteVisa, getVisaById };
