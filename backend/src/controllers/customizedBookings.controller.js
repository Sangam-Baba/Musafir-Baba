import { CustomizedBookings } from "../models/CustomizedBookings.js";
import mongoose from "mongoose";
const createCutomizedBooking = async (req, res) => {
  try {
    const userId = req.user.sub;
    if (!userId)
      return res.status(401).json({ success: false, error: "Unauthorized" });
    const { customizedPackageId } = req.body;
    if (!customizedPackageId) {
      return res
        .status(400)
        .json({ success: false, error: "Missing required fields" });
    }
    const customizedBooking = await CustomizedBookings.create({
      user: userId,
      customizedPackageId,
      ...req.body,
    });
    res.status(201).json({ success: true, data: customizedBooking });
  } catch (error) {
    console.log("Customized Booking creation failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getCustomizedBookingsById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: "Invalid Id" });
    const customizedBooking = await CustomizedBookings.findById(id);
    if (!customizedBooking)
      return res
        .status(404)
        .json({ success: false, message: "Customized Booking not found" });
    res.status(200).json({
      success: true,
      message: "get Customized Booking by Id  fetched successfully",
      data: customizedBooking,
    });
  } catch (error) {
    console.log("Error getting customized bookings by id:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateCustomizedBooking = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const customizedBooking = await CustomizedBookings.findById(id);
    if (!customizedBooking) {
      return res
        .status(404)
        .json({ success: false, message: "Customized booking not found" });
    }
    const updatedCustomizedBooking = await CustomizedBookings.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );
    res.status(200).json({
      success: true,
      message: "Customized booking updated successfully",
      data: updatedCustomizedBooking,
    });
  } catch (error) {
    console.log("Error getting customized bookings by id:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteCustomizedBooking = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const customizedBooking = await CustomizedBookings.findById(id);
    if (!customizedBooking) {
      return res
        .status(404)
        .json({ success: false, message: "Customized booking not found" });
    }
    const deletedCustomizedBooking = await CustomizedBookings.findByIdAndDelete(
      id
    );
    res.status(200).json({
      success: true,
      message: "Customized booking deleted successfully",
      data: deletedCustomizedBooking,
    });
  } catch (error) {
    console.log("Error getting customized bookings by id:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCustomizedBookings = async (req, res) => {
  try {
    const customizedBookings = await CustomizedBookings.find();
    res.status(200).json({ success: true, data: customizedBookings });
  } catch (error) {
    console.log("Error getting customized bookings by id:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
export {
  createCutomizedBooking,
  getCustomizedBookingsById,
  deleteCustomizedBooking,
  updateCustomizedBooking,
  getCustomizedBookings,
};
