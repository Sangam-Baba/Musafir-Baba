import { CustomizedPackage } from "../models/CustomizedPackage.js";

import mongoose from "mongoose";

const createCustomizedPackage = async (req, res) => {
  try {
    const { destination, price } = req.body;
    if (!destination || !price) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const customizedPackage = await CustomizedPackage.create({
      destination,
      price,
      ...req.body,
    });
    res.status(201).json({ success: true, data: customizedPackage });
  } catch (error) {
    console.error("Error creating customized package:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCustomizedPackages = async (req, res) => {
  try {
    const customizedPackages = await CustomizedPackage.find().populate(
      "destination"
    );
    res.status(200).json({ success: true, data: customizedPackages });
  } catch (error) {
    console.error("Error getting customized packages:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCustomizedPackagesById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: "Invalid Id" });
    const customizedPackage = await CustomizedPackage.findById(id);
    if (!customizedPackage)
      return res
        .status(404)
        .json({ success: false, message: "Customized package not found" });
    res.status(200).json({
      success: true,
      message: "get Customized package by Id  fetched successfully",
      data: customizedPackage,
    });
  } catch (error) {
    console.log("Error getting customized packages by id:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateCustomizedPackage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const customizedPackage = await CustomizedPackage.findById(id);
    if (!customizedPackage) {
      return res
        .status(404)
        .json({ success: false, message: "Customized package not found" });
    }
    const updatedCustomizedPackage = await CustomizedPackage.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );
    res.status(200).json({
      success: true,
      message: "Customized package updated successfully",
      data: updatedCustomizedPackage,
    });
  } catch (error) {
    console.log("Error getting customized packages by id:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteCustomizedPackage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const customizedPackage = await CustomizedPackage.findById(id);
    if (!customizedPackage) {
      return res
        .status(404)
        .json({ success: false, message: "Customized package not found" });
    }
    const deletedCustomizedPackage = await CustomizedPackage.findByIdAndDelete(
      id
    );
    res.status(200).json({
      success: true,
      message: "Customized package deleted successfully",
      data: deletedCustomizedPackage,
    });
  } catch (error) {
    console.log("Error getting customized packages by id:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
export {
  createCustomizedPackage,
  getCustomizedPackagesById,
  getCustomizedPackages,
  updateCustomizedPackage,
  deleteCustomizedPackage,
};
