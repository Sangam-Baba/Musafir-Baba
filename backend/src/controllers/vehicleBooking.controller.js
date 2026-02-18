import { Vehicle } from "../models/Vehicle.js";
import { VehicleBooking } from "../models/VehicleBooking.js";

const createBooking = async (req, res) => {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Un-authenticated",
      });
    }

    const { vehicleId, checkIn, checkOut, noOfVehicle = 1 } = req.body;

    if (!vehicleId || !checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Validate Dates
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);

    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: "Check-out must be after check-in",
      });
    }

    if (startDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Check-in date cannot be in the past",
      });
    }

    const vehicle = await Vehicle.findById(vehicleId);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // Calculate total days
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    // 5% tax included
    const totalPrice = Math.ceil(
      totalDays * vehicle.price.daily * noOfVehicle * 1.05,
    );

    // Optional: Check overlapping bookings

    const booking = await VehicleBooking.create({
      userId,
      vehicleId,
      checkIn: startDate,
      checkOut: endDate,
      noOfVehicle,
      totalPrice,
    });

    res.status(201).json({
      success: true,
      message: "Booking Created Successfully",
      data: booking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Booking failed due to server error",
    });
  }
};

const getBookingById = async (req, res) => {
  try {
    const bookingId = req.params.id;

    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId))
      return res.status(400).json({ success: false, message: "Invalid" });

    const booking = await VehicleBooking.findById(bookingId);

    if (!booking) {
      return res
        .status(404)
        .json({ success: true, message: "Booking not found" });
    }

    return res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Can't get booking due to server error",
    });
  }
};

const getBookingsByUserId = async (req, res) => {
  try {
    const { userId } = req.user.sub;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not founds" });
    }

    const userBookings = await VehicleBooking.find(userId);

    return res
      .status(200)
      .json({ success: true, message: "Bookings fetched for user" });
  } catch (error) {
    return res.status(500).json({
      success: true,
      message: "Fetchings of user bookings failed due to server error",
    });
  }
};
const getAllBookings = async (req, res) => {
  try {
    const bookings = await VehicleBooking.find();

    if (!bookings) {
      return res
        .status(404)
        .json({ success: false, message: "Bookings not founds" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Fetched all bookings" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Fetching of all bookings failed due to server error",
    });
  }
};

export { createBooking, getBookingById, getAllBookings, getBookingsByUserId };
