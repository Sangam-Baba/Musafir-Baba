import { CustomizedTourBooking } from "../models/CustomizedTourBooking.js";
import mongoose from "mongoose";
import { User } from "../models/User.js";

const createCustomizedTourBooking = async (req, res) => {
  try {
    const userId = req.user.sub;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    const { packageId, date, totalPrice, noOfPeople } = req.body;
    if (!packageId || !date || !totalPrice || !noOfPeople)
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });

    const customizedTourBooking = await CustomizedTourBooking.create({
      userId,
      packageId,
      date,
      totalPrice,
      noOfPeople,
      ...req.body,
    });
    const createdBooking = await CustomizedTourBooking.findById(
      customizedTourBooking._id
    )
      .populate({ path: "userId", select: "name email" })
      .populate({ path: "packageId", select: "title coverImage" })
      .lean();
    res.status(201).json({
      success: true,
      message: "Customized tour booking created successfully",
      data: createdBooking,
    });
  } catch (error) {
    console.log("Error creating customized tour booking", error);
    res.status(500).json({ success: false, message: "Server Errror" });
  }
};

const createManualCustomizedTourBooking = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      packageId,
      date,
      plan,
      noOfPeople,
      totalPrice,
      bookingStatus,
      paymentMethod,
      paymentInfo,
    } = req.body;
    if (
      !name ||
      !email ||
      !phone ||
      !packageId ||
      !date ||
      !plan ||
      !noOfPeople ||
      !totalPrice
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }
    const userPassword = Math.floor(100000 + Math.random() * 900000).toString();
    let UserId = null;
    const isExist = await User.findOne({ email });
    if (isExist) {
      UserId = isExist._id;
    } else {
      const user = await User.create({
        name,
        email,
        phone,
        password: userPassword,
        role: "user",
        isActive: true,
        isVerified: true,
      });
      if (!user)
        return res
          .status(500)
          .json({ success: false, message: "Server Error" });
      UserId = user._id;
    }
    const customizedTourBooking = await CustomizedTourBooking.create({
      userId: UserId,
      packageId,
      date,
      plan,
      noOfPeople,
      totalPrice,
      bookingStatus,
      paymentMethod,
      paymentInfo,
    });
    res.status(201).json({
      success: true,
      message: "Customized tour manual booking created successfully",
      data: customizedTourBooking,
    });
  } catch (error) {
    console.log("Error maunal creating customized tour booking", error.message);
    res
      .status(500)
      .json({ success: false, message: `Server Error: ${error.message}` });
  }
};
const getCustomizedTourBookingById = async (req, res) => {
  try {
    const { id } = req.params || req.user?.sub;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const booking = await CustomizedTourBooking.findById(id)
      .populate("packageId")
      .populate("userId")
      .lean()
      .exec();
    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    res.status(200).json({
      success: true,
      message: "Customized tour booking fetched successfully",
      data: booking,
    });
  } catch (error) {
    console.log("Error getting customized tour booking", error);
    res.status(500).json({ success: false, message: "Server Errror" });
  }
};

const deleteCustomizedTourBooking = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const booking = await CustomizedTourBooking.findByIdAndDelete(id);
    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    res.status(200).json({
      success: true,
      message: "Customized tour booking deleted successfully",
      data: booking,
    });
  } catch (error) {
    console.log("Error deleting customized tour booking", error);
    res.status(500).json({ success: false, message: "Server Errror" });
  }
};

const updateCustomizedTourBooking = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: "Invalid Id" });
    const customizedTourBooking = await CustomizedTourBooking.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!customizedTourBooking)
      return res
        .status(404)
        .json({ message: "Customized tour booking not found" });
    res.status(200).json({
      success: true,
      message: "Customized tour booking updated successfully",
      data: customizedTourPackage,
    });
  } catch (error) {
    console.log("Error updating customized tour booking", error);
    res.status(500).json({ success: false, message: "Server Errror" });
  }
};

const getAllCustomizedTourBooking = async (req, res) => {
  try {
    const { filter = {} } = req.query;
    const page = Math.max(parseInt(req.query?.page || "1", 10), 1);
    const limit = Math.min(parseInt(req.query?.limit || "20", 10), 100);
    const skip = (page - 1) * limit;
    if (req.query?.userId) filter.userId = req.query.userId;
    if (req.query?.packageId) filter.packageId = req.query.packageId;
    if (req.query?.date) filter.date = req.query.date;
    if (req.query?.totalPrice) filter.totalPrice = req.query.totalPrice;
    if (req.query?.noOfPeople) filter.noOfPeople = req.query.noOfPeople;
    if (req.query?.bookingStatus)
      filter.bookingStatus = req.query.bookingStatus;
    const total = await CustomizedTourBooking.countDocuments(filter);
    const customizedTourBookings = await CustomizedTourBooking.find(filter)
      .sort({ createdAt: -1 })
      .populate("packageId", "title")
      .populate("userId", "name email")
      .skip(skip)
      .limit(limit)
      .lean();
    if (!customizedTourBookings) {
      return res.status(404).json({
        success: false,
        message: "Customized tour bookings not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Customized tour bookings fetched successfully",
      meta: { total, page, limit },
      data: customizedTourBookings,
    });
  } catch (error) {
    console.log("Error getting customized tour booking", error.message);
    res.status(500).json({ success: false, message: "Server Errror" });
  }
};

const getMyCustomizedTourBooking = async (req, res) => {
  try {
    const userId = req.user.sub;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    console.log("userId", userId);
    const bookings = await CustomizedTourBooking.find({ userId: userId })
      .populate("packageId", "title")
      .lean();

    console.log("bookings", bookings);
    if (!bookings) {
      return res.status(404).json({
        success: false,
        message: "Customized tour bookings not found error",
      });
    }
    res.status(200).json({
      success: true,
      message: "Customized tour bookings fetched successfully",
      data: bookings,
    });
  } catch (error) {
    console.log("Error getting customized tour booking", error.message);
    res.status(500).json({ success: false, message: "Server Errror" });
  }
};

export {
  createCustomizedTourBooking,
  getCustomizedTourBookingById,
  deleteCustomizedTourBooking,
  updateCustomizedTourBooking,
  getAllCustomizedTourBooking,
  createManualCustomizedTourBooking,
  getMyCustomizedTourBooking,
};
