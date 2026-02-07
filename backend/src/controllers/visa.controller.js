import { Visa } from "../models/Visa.js";
import { verifyPreviewToken } from "../utils/tokens.js";

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
    if (req.query?.country)
      filter.country = { $regex: req.query.country, $options: "i" };
    if (req.query?.isActive) filter.isActive = req.query.isActive;
    if (req.query?.minPrice) filter.cost = { $gte: req.query.minPrice };
    if (req.query?.maxPrice) filter.cost = { $lte: req.query.maxPrice };
    if (req.query?.visaType) filter.visaType = req.query.visaType;
    const visa = await Visa.find(filter)
      .sort({ createdAt: -1 })
      .select("-content -faqs ")
      .lean();
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
    res.status(200).json({
      success: true,
      message: "Visa fetched successfully",
      data: visa,
    });
  } catch (error) {
    console.log("Visa getting by Id failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getVisaBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug)
      return res.status(400).json({ success: false, message: "Invalid Slug" });
    const visa = await Visa.findOne({ slug }).populate("reviews").lean();
    if (!visa)
      return res.status(404).json({ success: false, message: "Invalid Slug" });
    if (!visa.isActive && !verifyPreviewToken(req.query?.token)) {
      return res.status(403).json({ success: false, message: "Invalid URL" });
    }
    res.status(200).json({ success: true, data: visa });
  } catch (error) {
    console.log("Visa getting by slug failed", error.message);
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

const getRelatedPages = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug)
      return res.status(400).json({ success: false, message: "Invalid Slug" });
    const visa = await Visa.findOne({ slug }).lean();
    if (!visa)
      return res.status(404).json({ success: false, message: "Invalid Slug" });
    const relatedVisa = await Visa.find({
      _id: { $ne: visa._id },
      isActive: "true",
      visaType: visa.visaType,
    })
      .limit(8)
      .select("title slug coverImage content excerpt createdAt")
      .lean();
    return res.status(200).json({ success: true, data: relatedVisa });
  } catch (error) {
    console.log("Visa getting related pages by slug failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export {
  createVisa,
  getAllVisa,
  updateVisa,
  deleteVisa,
  getVisaById,
  getVisaBySlug,
  getRelatedPages,
};
