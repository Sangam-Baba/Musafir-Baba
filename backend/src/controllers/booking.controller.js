import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";
import { Package } from "../models/Package.js";
const createBooking = async (req, res) => {
  try {
    const userId = req.user.sub;
    if (!userId)
      return res.status(401).json({ success: false, error: "Unauthorized" });
    const {
      packageId,
      batchId,
      travellers,
      // travelDate,
      totalPrice,
    } = req.body;

    if (!packageId || !batchId || !totalPrice || !travellers) {
      return res
        .status(400)
        .json({ success: false, error: "Missing required fields" });
    }

    const booking = await Booking.create({
      user: userId,
      packageId,
      travellers,
      batchId,
      totalPrice,
      ...req.body,
    });

    const created = await Booking.findById(booking._id)
      .populate({ path: "user", select: "name email" })
      .populate({ path: "packageId", select: "title price" })
      .populate({ path: "batchId", select: "quad startDate endDate" })
      .lean()
      .exec();

    return res
      .status(201)
      .json({ success: true, message: "Booking Success", data: created });
  } catch (error) {
    console.log("booking failed ", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getMyBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(parseInt(req.query.limit || "10", 10), 50);
    const skip = (page - 1) * limit;

    const filter = { user: userId };
    if (req.query.bookingStatus) filter.bookingStatus = req.query.bookingStatus;
    if (req.query.PaymentStatus) filter.PaymentStatus = req.query.PaymentStatus;
    const [total, bookings] = await Promise.all([
      Booking.countDocuments(filter),
      Booking.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "package", select: "title price" })
        .lean()
        .exec(),
    ]);

    return res.json({
      success: true,
      meta: { total, page, limit },
      data: bookings,
      message: "Fetching data successfull",
    });
  } catch (error) {
    console.log("get my booking failed ", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getAllBookings = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.user) filter.user = req.query.user;
    if (req.query.package) filter.package = req.query.package;
    if (req.query.bookingStatus) filter.bookingStatus = req.query.bookingStatus;
    if (req.query.PaymentStatus) filter.PaymentStatus = req.query.PaymentStatus;

    const [total, bookings] = await Promise.all([
      Booking.countDocuments(filter),
      Booking.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "user", select: "name email" })
        .populate({ path: "packageId", select: "title " })
        .populate({ path: "batchId", select: "startDate status" })
        .lean()
        .exec(),
    ]);
    return res.json({
      success: true,
      meta: { total, page, limit },
      data: bookings,
      message: "Fetching all bookings",
    });
  } catch (error) {
    console.log("Fetching all bookings failed ", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getBookingById = async (req, res) => {
  try {
    const bookingId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(bookingId))
      return res.status(400).json({ success: false, message: "Invalid" });

    const booking = await Booking.findById(bookingId)
      .select("_id totalPrice travellers packageId user batchId")
      .populate({ path: "packageId", select: "title coverImage" })
      .populate({ path: "user", select: "name email" })
      .populate({ path: "batchId", select: "quad startDate endDate" })
      .lean()
      .exec();

    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });

    return res.status(200).json({ success: true, data: booking });
  } catch (error) {
    console.log("Get Booking By Id Failed ", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const cancelMyBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(bookingId))
      return res.status(400).json({ success: false, message: "Invalid" });

    const booking = await Booking.findById(bookingId).exec();
    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    if (String(booking.user) !== String(userId))
      return res.status(403).json({ success: false, error: "Forbidden" });
    if (booking.bookingStatus === "Cancelled")
      return res
        .status(400)
        .json({ success: false, error: "Already cancelled" });

    booking.bookingStatus = "Cancelled";
    booking.PaymentStatus =
      booking.PaymentStatus === "Paid" ? "Refunded" : booking.PaymentStatus;

    await booking.save();
    return res.json({
      success: true,
      data: booking,
      message: "Booking Canceled",
    });
  } catch (error) {
    console.log("Cancel Failed ", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const adminUpdateBookingStatus = async (req, res) => {
  const bookingId = req.params.id;
  const { bookingStatus, paymentInfo } = req.body;

  if (!mongoose.Types.ObjectId.isValid(bookingId))
    return res.status(400).json({ success: false, error: "Invalid id" });

  const booking = await Booking.findById(bookingId).exec();
  if (!booking)
    return res.status(404).json({ success: false, error: "Booking not found" });

  if (bookingStatus) booking.bookingStatus = bookingStatus;
  if (paymentInfo) booking.paymentInfo = paymentInfo;

  await booking.save();
  return res.json({ success: true, data: booking });
};
export {
  createBooking,
  getMyBookings,
  getAllBookings,
  getBookingById,
  adminUpdateBookingStatus,
  cancelMyBooking,
};
