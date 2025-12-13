import { Membership } from "../models/membership.js";
import { MembershipBooking } from "../models/membershipBooking.js";

const createBooking = async (req, res) => {
  try {
    const { membershipId } = req.body;
    if (!membershipId)
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });

    const membership = await Membership.findById(membershipId);
    if (!membership)
      return res
        .status(400)
        .json({ success: false, message: "Membership not found" });
    const { price, duration } = membership;
    const userId = req.user.sub;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    const startDate = new Date();
    let endDate = new Date(startDate);
    if (duration == "quaterly") {
      endDate.setMonth(endDate.getMonth() + 1);
    }
    if (duration == "half-yearly") {
      endDate.setMonth(endDate.getMonth() + 6);
    }
    if (duration == "yearly") {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }
    const membershipBooking = new MembershipBooking({
      userId,
      membershipId,
      amount: price,
      startDate,
      endDate,
      ...req.body,
    });
    await membershipBooking.save();

    const savedMembershipBooking = await MembershipBooking.findById(
      membershipBooking._id
    )
      .populate("membershipId")
      .populate("userId")
      .lean();
    res.status(201).json({
      success: true,
      message: "Membership booking created successfully",
      data: savedMembershipBooking,
    });
  } catch (error) {
    console.log("Error creating membership booking", error);
    res.status(500).json({ succes: false, message: "Server Error" });
  }
};

const getBookingsById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "User id not found" });
    }
    const bookings = await MembershipBooking.findById(id)
      .populate("membershipId")
      .populate("userId")
      .lean()
      .exec();
    if (!bookings) {
      return res
        .status(404)
        .json({ success: false, message: "Bookings not found" });
    }
    res.status(200).json({
      success: true,
      message: "Bookings fetched successfully",
      data: bookings,
    });
  } catch (error) {
    console.log("Error getting bookings", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Bookings id not found" });
    }
    const membershipBooking = await MembershipBooking.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!membershipBooking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }
    res.status(200).json({
      success: true,
      message: "Booking updated successfully",
      data: membershipBooking,
    });
  } catch (error) {
    console.log("Error updating booking", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getMyBookings = async (req, res) => {
  try {
    const userId = req.user.sub;

    const bookings = await MembershipBooking.find({ userId })
      .sort({ createdAt: -1 })
      .populate("membershipId")
      .populate("userId")
      .lean();
    res.status(200).json({
      success: true,
      message: "Bookings fetched successfully",
      data: bookings,
    });
  } catch (error) {
    console.log("Error getting user membership booking", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
export { createBooking, getBookingsById, updateBooking, getMyBookings };
