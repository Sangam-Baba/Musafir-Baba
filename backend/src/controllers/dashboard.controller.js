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
import { Document } from "../models/Document.js";
import { Vehicle } from "../models/Vehicle.js";
import { VehicleBooking } from "../models/VehicleBooking.js";

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

    const resu = await Booking.aggregate(pipeline).allowDiskUse(true);
    const CustomizedTourBookings =
      await CustomizedTourBooking.aggregate(pipeline).allowDiskUse(true);
    // return ISO strings so client timezone formatting is consistent
    const results = [...resu, ...CustomizedTourBookings];
    const uniqueResults = [];

    for (const result of results) {
      const existingResult = uniqueResults.find(
        (r) => r.month.toISOString() === result.month.toISOString(),
      );
      if (existingResult) {
        existingResult.count += result.count;
      } else {
        uniqueResults.push(result);
      }
    }
    const data = uniqueResults.map((r) => ({
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

const getCombinedNewsBlog = async (req, res) => {
  try {
    const news = await News.find({ status: "published" })
      .select("title coverImage excerpt  slug createdAt")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    const newNews = news.map((item) => ({ ...item, type: "news" }));
    const blog = await Blog.find({ status: "published" })
      .select("title coverImage excerpt  slug createdAt")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    const newBlog = blog.map((item) => ({ ...item, type: "blog" }));
    const result = [...newNews, ...newBlog]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.log("getCombinedNewsBlog failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getUserDashboardSummary = async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // 1. Fetch User Data
    const user = await User.findById(userId)
      .select("name email role isVerified createdAt phone")
      .lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 2. Fetch Active Bookings
    const groupBookings = await Booking.find({ user: userId })
      .populate("packageId", "title")
      .populate("batchId", "startDate endDate status")
      .sort({ createdAt: -1 })
      .lean();
      
    const customizedBookings = await CustomizedTourBooking.find({ userId })
      .sort({ createdAt: -1 })
      .lean();
      
    // Combine and mark types
    const bookings = [
      ...groupBookings.map(b => ({ ...b, type: "group", date: b.batchId?.startDate || b.bookingDate })),
      ...customizedBookings.map(b => ({ ...b, type: "customized", date: b.date || b.bookingDate }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Calculate Payment & Booking Totals
    let totalPaid = 0;
    let pendingBalance = 0;
    
    bookings.forEach(b => {
      const amount = Number(b.totalPrice || b.amount || 0);
      if (b.paymentInfo?.status === "completed" || b.PaymentStatus === "Paid") {
        totalPaid += amount;
      }
      if (b.paymentInfo?.status === "pending" || b.PaymentStatus === "Pending") {
        pendingBalance += amount;
      }
    });

    const activeServices = bookings.slice(0, 5); 

    // 3. Document Stats
    const documentsCount = await Document.countDocuments({ userId });
    
    const stats = {
      documentsUploaded: documentsCount,
      kycStatus: documentsCount >= 3 ? "Completed" : "Pending",
      totalBookings: bookings.length,
      totalPaid,
      pendingBalance,
    };

    // 4. Fetch Latest Updates (Combined News and Blogs)
    const newsData = await News.find({ status: "published" })
      .select("title coverImage excerpt slug createdAt")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    const blogData = await Blog.find({ status: "published" })
      .select("title coverImage excerpt slug createdAt")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
      
    const latestUpdates = [
      ...newsData.map(item => ({ ...item, type: "news" })),
      ...blogData.map(item => ({ ...item, type: "blog" }))
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    return res.status(200).json({
      success: true,
      message: "User dashboard summary fetched successfully",
      data: {
        user,
        stats,
        activeServices,
        latestUpdates
      }
    });

  } catch (error) {
    console.error("getUserDashboardSummary failed:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Platform-wide counts for the admin dashboard (read-only, additive endpoint;
// the older summary/chart endpoints above are unchanged). Every count runs
// through `safe`, so one failing collection returns null for that number
// instead of failing the whole dashboard.
const getDashboardOverview = async (req, res) => {
  try {
    const safe = (promise) => promise.catch((err) => {
      console.log("Dashboard overview count failed", err.message);
      return null;
    });

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    // Month-to-date vs the same number of days last month, so early in a month
    // the comparison isn't "this month so far" against a full previous month.
    const lastMonthSamePoint = new Date(
      Math.min(lastMonthStart.getTime() + (now.getTime() - thisMonthStart.getTime()), thisMonthStart.getTime()),
    );
    const thisMonth = { createdAt: { $gte: thisMonthStart } };
    const lastMonth = { createdAt: { $gte: lastMonthStart, $lt: lastMonthSamePoint } };
    const hasPending = { pendingUpdates: { $ne: null } };
    const isVisaEnquiry = { source: { $regex: "visa", $options: "i" } };

    // Scope: packages, package bookings, enquiries, blogs, news and vehicle
    // rentals only. Fleet management (rides, partners, riders, app support)
    // is intentionally not part of this dashboard.
    const tasks = {
      // Packages
      packagesTotal: Package.countDocuments({}),
      packagesPublished: Package.countDocuments({ status: "published" }),
      packagesDraft: Package.countDocuments({ status: "draft" }),
      packagesPendingApproval: Package.countDocuments(hasPending),
      packagesThisMonth: Package.countDocuments(thisMonth),
      customTourPackagesTotal: CustomizedTourPackage.countDocuments({}),
      customTourPackagesPublished: CustomizedTourPackage.countDocuments({ status: "published" }),
      customTourPackagesPendingApproval: CustomizedTourPackage.countDocuments(hasPending),

      // Package bookings (website)
      holidayBookingsTotal: Booking.countDocuments({}),
      holidayBookingsConfirmed: Booking.countDocuments({ bookingStatus: "Confirmed" }),
      holidayBookingsPending: Booking.countDocuments({ bookingStatus: "Pending" }),
      holidayBookingsCancelled: Booking.countDocuments({ bookingStatus: "Cancelled" }),
      holidayBookingsThisMonth: Booking.countDocuments(thisMonth),
      holidayBookingsLastMonth: Booking.countDocuments(lastMonth),
      customTourBookingsTotal: CustomizedTourBooking.countDocuments({}),
      customTourBookingsConfirmed: CustomizedTourBooking.countDocuments({ bookingStatus: "Confirmed" }),
      customTourBookingsPending: CustomizedTourBooking.countDocuments({ bookingStatus: "Pending" }),
      customTourBookingsCancelled: CustomizedTourBooking.countDocuments({ bookingStatus: "Cancelled" }),
      customTourBookingsThisMonth: CustomizedTourBooking.countDocuments(thisMonth),
      customTourBookingsLastMonth: CustomizedTourBooking.countDocuments(lastMonth),

      // Enquiries
      enquiriesTotal: ContactEnquiry.countDocuments({}),
      enquiriesVisa: ContactEnquiry.countDocuments(isVisaEnquiry),
      enquiriesThisMonth: ContactEnquiry.countDocuments(thisMonth),
      enquiriesLastMonth: ContactEnquiry.countDocuments(lastMonth),

      // Blogs & news
      blogsPublished: Blog.countDocuments({ status: "published" }),
      blogsDraft: Blog.countDocuments({ status: "draft" }),
      blogsThisMonth: Blog.countDocuments(thisMonth),
      blogsLastMonth: Blog.countDocuments(lastMonth),
      newsPublished: News.countDocuments({ status: "published" }),
      newsDraft: News.countDocuments({ status: "draft" }),
      newsThisMonth: News.countDocuments(thisMonth),
      newsLastMonth: News.countDocuments(lastMonth),

      // Vehicle rentals (website vehicles, not fleet)
      vehiclesTotal: Vehicle.countDocuments({}),
      vehiclesPublished: Vehicle.countDocuments({ status: "published" }),
      vehiclesDraft: Vehicle.countDocuments({ status: "draft" }),
      vehicleBookingsTotal: VehicleBooking.countDocuments({}),
      vehicleBookingsConfirmed: VehicleBooking.countDocuments({ bookingStatus: "Confirmed" }),
      vehicleBookingsPending: VehicleBooking.countDocuments({ bookingStatus: "Pending" }),
      vehicleBookingsCancelled: VehicleBooking.countDocuments({ bookingStatus: "Cancelled" }),
      vehicleBookingsThisMonth: VehicleBooking.countDocuments(thisMonth),
      vehicleBookingsLastMonth: VehicleBooking.countDocuments(lastMonth),
    };

    const keys = Object.keys(tasks);
    const values = await Promise.all(keys.map((k) => safe(tasks[k])));
    const data = Object.fromEntries(keys.map((k, i) => [k, values[i]]));

    return res.status(200).json({ success: true, data, generatedAt: now.toISOString() });
  } catch (error) {
    console.error("Dashboard overview failed:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export {
  getDashboardOverview,
  getDashboardSummary,
  getMonthlyBookings,
  getBookingVSVisaEnquiry,
  getLatestAcitvity,
  getCombinedNewsBlog,
  getUserDashboardSummary,
};
