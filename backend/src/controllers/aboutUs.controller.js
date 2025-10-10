import { AboutUs } from "../models/About-us.js";
import mongoose from "mongoose";

const createAboutUs = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) {
      return res
        .status(400)
        .json({ success: false, message: "Required things missing" });
    }
    const aboutUs = await AboutUs.create({ title, description, ...req.body });
    res.status(201).json({ success: true, data: aboutUs });
  } catch (error) {
    console.error("Failed to create about us", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create about us" });
  }
};

const getAboutUs = async (req, res) => {
  try {
    const aboutUs = await AboutUs.find();
    res.status(200).json({ success: true, data: aboutUs });
  } catch (error) {
    console.error("Failed to get about us");
    res.status(500).json({ success: false, message: "Failed to get about us" });
  }
};

const getAboutUsById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const aboutUs = await AboutUs.findById(id);
    if (!aboutUs) {
      return res
        .status(404)
        .json({ success: false, message: "About us not found" });
    }

    res.status(200).json({ success: true, data: aboutUs });
  } catch (error) {
    console.log("AboutUs getting by id failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
const updateAboutUs = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const aboutUs = await AboutUs.findById(id);
    if (!aboutUs) {
      return res
        .status(404)
        .json({ success: false, message: "About us not found" });
    }
    const updatedAboutUs = await AboutUs.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    res.status(200).json({ success: true, data: updatedAboutUs });
  } catch (error) {
    console.error("Failed to update about us");
    res
      .status(500)
      .json({ success: false, message: "Failed to update about us" });
  }
};

export { createAboutUs, getAboutUs, updateAboutUs, getAboutUsById };
