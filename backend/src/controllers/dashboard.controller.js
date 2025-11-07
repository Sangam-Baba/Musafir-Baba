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
    console.log(
      "Server Timezone:",
      Intl.DateTimeFormat().resolvedOptions().timeZone
    );

    // compute start/end (default: last 12 months)
    const endDate = end ? new Date(end) : new Date();
    const startDate = start
      ? new Date(start)
      : new Date(new Date(endDate).setMonth(endDate.getMonth() - 11, 1));

    // normalize to cover whole months/days
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // build aggregation: match -> mark type -> group by month-start (dateTrunc) + type -> sort
    const result = await ContactEnquiry.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        // create `type` field: 'visa' if `source` contains 'visa' (case-insensitive), else 'booking'
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
        // group by the month start date (preserves year) and type; timezone-aware
        $group: {
          _id: {
            monthStart: {
              $dateTrunc: { date: "$createdAt", unit: "month", timezone: tz },
            },
            type: "$type",
          },
          count: { $sum: 1 },
        },
      },
      {
        // sort chronologically by monthStart
        $sort: { "_id.monthStart": 1 },
      },
    ]).allowDiskUse(true);

    // Helper: create an array of month-start Dates between startDate and endDate inclusive
    const monthsInRange = [];
    const iter = new Date(startDate);
    while (iter <= endDate) {
      monthsInRange.push(new Date(iter)); // push copy
      iter.setMonth(iter.getMonth() + 1);
    }

    // Convert aggregation result into a lookup map for quick access
    // key = ISO monthStart string (exact value returned by $dateTrunc)
    const map = new Map();
    for (const r of result) {
      // r._id.monthStart is a Date (from Mongo). Convert to ISO for stable keying.
      const key = new Date(r._id.monthStart).toISOString();
      const type = r._id.type;
      if (!map.has(key)) map.set(key, { visa: 0, booking: 0 });
      map.get(key)[type] = r.count;
    }

    // Produce final data array in chronological order for the months in range.
    // Use localized month+year label (respecting tz) so frontend can display nicely.
    const finalData = monthsInRange.map((d) => {
      const iso = new Date(d).toISOString(); // match aggregation key format
      const counts = map.get(iso) || { visa: 0, booking: 0 };

      // Label example: "Nov 2025" (uses Intl to respect timezone)
      const label = new Date(d).toLocaleString("en-US", {
        month: "short",
        year: "numeric",
        timeZone: tz,
      });

      return {
        month: label,
        monthStart: iso, // optional: include machine-readable month start
        visa: counts.visa || 0,
        bookings: counts.booking || 0,
      };
    });

    return res.status(200).json({ success: true, data: finalData });
  } catch (error) {
    console.log("Booking vs Visa Enquiry failed", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
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
