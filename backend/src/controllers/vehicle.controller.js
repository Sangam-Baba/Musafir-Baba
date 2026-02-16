import mongoose from "mongoose";
import { Vehicle } from "../models/Vehicle.js";
const createVehicle = async (req, res) => {
  try {
    const {
      vehicleName,
      vehicleType,
      vehicleYear,
      vehicleBrand,
      fuelType,
      vehicleMilage,
      vehicleModel,
      seats,
      price,
      title,
      slug,
      content,
      availableStock,
      gallery,
      metaTitle,
      metaDescription,
      canonicalUrl,
      excerpt,
      faqs,
      status,
    } = req.body;
    if (!price || !vehicleName || !title || !fuelType) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required things" });
    }
    const vehicle = await Vehicle.create({
      vehicleName,
      vehicleType,
      vehicleYear,
      vehicleBrand,
      fuelType,
      vehicleMilage,
      vehicleModel,
      seats,
      price,
      title,
      slug,
      content,
      availableStock,
      gallery,
      metaTitle,
      metaDescription,
      canonicalUrl,
      excerpt,
      faqs,
      status,
    });
    if (!vehicle) {
      return res.status(500).json({ success: false, message: "Server Error" });
    }
    res.status(201).json({
      success: true,
      message: "Vehicle created Successfully",
      data: vehicle,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      res
        .status(400)
        .json({ success: false, message: "Missing Required Things" });
    }
    const vehicle = await Vehicle.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true },
    );
    if (!vehicle) {
      return res.status(500).json({ success: false, message: "Server Error" });
    }
    res.status(201).json({
      success: true,
      message: "Vehicle created Successfully",
      data: vehicle,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Updated failed due to server error" });
  }
};

const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      res
        .status(400)
        .json({ success: false, message: "Missing Required Things" });
    }
    const vehicle = await Vehicle.findByIdAndDelete(id);
    if (!vehicle) {
      return res.status(500).json({ success: false, message: "Server Error" });
    }
    res.status(201).json({
      success: true,
      message: "Vehicle created Successfully",
      data: vehicle,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Delete failed due to server error" });
  }
};

const getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      res
        .status(400)
        .json({ success: false, message: "Missing Required Things" });
    }
    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      return res
        .status(500)
        .json({ success: false, message: "Vehile not found" });
    }
    res.status(201).json({
      success: true,
      message: "Vehicle getting by Id Successfully",
      data: vehicle,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "getting by Id failed due to server error",
    });
  }
};

const getAllVehicle = async (req, res) => {
  try {
    const allvehicle = await Vehicle.find();
    res.status(200).json({
      success: true,
      message: "Successfully got all vehicle",
      data: allvehicle,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
export {
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getVehicleById,
  getAllVehicle,
};
