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
    // Optional date filters (default: current year)
    const start = req.query.start
      ? new Date(req.query.start)
      : new Date(new Date().getFullYear(), 0, 1); // Jan 1st
    const end = req.query.end ? new Date(req.query.end) : new Date();

    // Aggregate enquiries and categorize them
    const result = await ContactEnquiry.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $addFields: {
          type: {
            $cond: [
              {
                $regexMatch: { input: "$source", regex: "visa", options: "i" },
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
            month: { $month: "$createdAt" },
            type: "$type",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.month": 1 } },
    ]);

    // Convert result to frontend-friendly format
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const finalData = months.map((month, i) => {
      const visaCount =
        result.find((r) => r._id.month === i + 1 && r._id.type === "visa")
          ?.count || 0;
      const bookingCount =
        result.find((r) => r._id.month === i + 1 && r._id.type === "booking")
          ?.count || 0;

      return {
        month,
        visa: visaCount,
        bookings: bookingCount,
      };
    });

    res.status(200).json({
      success: true,
      data: finalData,
    });
  } catch (error) {
    console.log("Booking vs Visa Enquiry failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
export { getDashboardSummary, getMonthlyBookings, getBookingVSVisaEnquiry };
