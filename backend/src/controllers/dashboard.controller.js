import mongoose from "mongoose";
import { Package } from "../models/Package.js";
import { Booking } from "../models/Booking.js";
import { CustomizedPackage } from "../models/CustomizedPackage.js";
import { CustomizedBookings } from "../models/CustomizedBookings.js";
import { CustomizedTourPackage } from "../models/CustomizedTourPackage.js";
import { CustomizedTourBooking } from "../models/CustomizedTourBooking.js";
import { User } from "../models/User.js";
import { MembershipBooking } from "../models/membershipBooking.js";
import { News } from "../models/News.js";
import { Blog } from "../models/Blog.js";
import { ContactEnquiry } from "../models/ContactInquiry.js";

const getDashboardSummary = async (req, res) => {
  try {
    const filterQuery = {};

    if (req.query?.date && !isNaN(new Date(req.query.date))) {
      filterQuery.createdAt = { $gte: new Date(req.query.date) };
    }

    const [
      packageCount,
      bookingCount,
      customizedPackageCount,
      customizedBookingCount,
      customizedTourPackageCount,
      customizedTourBookingCount,
      userCount,
      membershipBookingCount,
      newsCount,
      blogCount,
      contactEnquiryCount,
    ] = await Promise.all([
      Package.countDocuments(filterQuery),
      Booking.countDocuments(filterQuery),
      CustomizedPackage.countDocuments(filterQuery),
      CustomizedBookings.countDocuments(filterQuery),
      CustomizedTourPackage.countDocuments(filterQuery),
      CustomizedTourBooking.countDocuments(filterQuery),
      User.countDocuments({ ...filterQuery, isVerified: true }),
      MembershipBooking.countDocuments({
        ...filterQuery,
        membershipStatus: "Active",
      }),
      News.countDocuments({ ...filterQuery, status: "published" }),
      Blog.countDocuments({ ...filterQuery, status: "published" }),
      ContactEnquiry.countDocuments(filterQuery),
    ]);

    return res.status(200).json({
      success: true,
      message: "Dashboard summary fetched successfully",
      data: {
        packageCount,
        bookingCount,
        customizedPackageCount,
        customizedBookingCount,
        customizedTourPackageCount,
        customizedTourBookingCount,
        userCount,
        membershipBookingCount,
        newsCount,
        blogCount,
        contactEnquiryCount,
      },
    });
  } catch (error) {
    console.error("Dashboard summary failed:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getMonthlyBookings = async (req, res) => {
  try {
    const { start, end, tz = "Asia/Kolkata" } = req.query;

    // default to last 12 months if not provided
    const endDate = end ? new Date(end) : new Date();
    const startDate = start
      ? new Date(start)
      : new Date(new Date(endDate).setMonth(endDate.getMonth() - 11, 1));

    // normalize start to first day of month, end to last day
    startDate.setDate(1);
    endDate.setHours(23, 59, 59, 999);

    const pipeline = [
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      {
        // bucket by month using dateTrunc (keeps timezone correct)
        $group: {
          _id: {
            $dateTrunc: { date: "$createdAt", unit: "month", timezone: tz },
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          month: "$_id", // Date representing first day of month (in UTC)
          count: 1,
        },
      },
      { $sort: { month: 1 } },
    ];

    const results = await Booking.aggregate(pipeline).allowDiskUse(true);

    // return ISO strings so client timezone formatting is consistent
    const data = results.map((r) => ({
      month: r.month.toISOString(),
      count: r.count,
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.log("Monthly Bookings getting failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getBookingVSVisaEnquiry = async (req, res) => {
  try {
    const { start, end, tz = "Asia/Kolkata" } = req.query;

    const endDate = end ? new Date(end) : new Date();
    const startDate = start
      ? new Date(start)
      : new Date(new Date(endDate).setMonth(endDate.getMonth() - 11, 1));

    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const pipeline = [
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $addFields: {
          type: {
            $cond: [
              {
                $regexMatch: {
                  input: { $ifNull: ["$source", ""] },
                  regex: "visa",
                  options: "i",
                },
              },
              "visa",
              "booking",
            ],
          },
        },
      },
      {
        $group: {
          _id: {
            month: {
              $dateTrunc: { date: "$createdAt", unit: "month", timezone: tz },
            },
            type: "$type",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.month",
          visa: {
            $sum: {
              $cond: [{ $eq: ["$_id.type", "visa"] }, "$count", 0],
            },
          },
          bookings: {
            $sum: {
              $cond: [{ $eq: ["$_id.type", "booking"] }, "$count", 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          month: "$_id",
          visa: 1,
          bookings: 1,
        },
      },
      { $sort: { month: 1 } },
    ];

    const results = await ContactEnquiry.aggregate(pipeline).allowDiskUse(true);

    // Convert month to ISO strings for frontend consistency
    const data = results.map((r) => ({
      month: r.month.toISOString(),
      visa: r.visa,
      bookings: r.bookings,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.log("Booking vs Visa Enquiry failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getLatestAcitvity = async (req, res) => {
  try {
    const enquiry = await ContactEnquiry.findOne()
      .sort({ createdAt: -1 })
      .limit(1);
    const booking = await Booking.findOne()
      .populate("user", "name email")
      .populate("packageId", "title")
      .sort({ createdAt: -1 })
      .limit(1);
    const news = await News.findOne().sort({ createdAt: -1 }).limit(1);
    const blog = await Blog.findOne().sort({ createdAt: -1 }).limit(1);

    const result = { enquiry, booking, news, blog };
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.log("Latest Activity failed", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

export {
  getDashboardSummary,
  getMonthlyBookings,
  getBookingVSVisaEnquiry,
  getLatestAcitvity,
};
