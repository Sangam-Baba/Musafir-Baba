// controllers/paymentController.js
import razorpayInstance from "../utils/razorpay.js";
import crypto from "crypto";
import { Booking } from "../models/Booking.js";

/**
 * POST /api/payment/create-order
 * Body: { bookingId }
 * - Server looks up booking, validates ownership/state, creates razorpay order using server amount.
 */
export const createOrder = async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ success: false, error: "Missing bookingId" });

    // fetch booking from DB (add ownership check if needed)
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, error: "Booking not found" });
    if (booking.paymentInfo?.status === "Paid") {
      return res.json({
        success: true,
        alreadyPaid: true,
        message: "Booking already paid",
        bookingId,
      });
    }

    // decide amount units: assume booking.totalPrice is in rupees. If it's in paise already, remove *100.
    const amountInPaise = Math.round((booking.totalPrice ?? booking.amount ?? 0) * 100); // rupees -> paise

    // If order already created, return it (idempotent)
    if (booking.paymentInfo.orderId && booking.paymentInfo.orderId  !== "") {
      return res.json({
        success: true,
        orderId: booking.paymentInfo.orderId ,
        amount: amountInPaise,
        currency: "INR",
        key: process.env.RAZORPAY_KEY_ID,
      });
    }

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_booking_${bookingId}`,
      payment_capture: 1,
    };

    const order = await razorpayInstance.orders.create(options);

    // Save razorpay order id on booking for later verification / idempotency
    booking.razorpayOrderId = order.id;
    await booking.save();

    return res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Create Payment Order Failed ", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/payment/verify
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId }
 * - Verifies HMAC signature, checks booking & order mapping, marks booking paid (idempotent).
 */
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingId) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    // Optional: ensure order id matches the one created for this booking (stronger check)
    if (booking.paymentInfo?.orderId && booking.paymentInfo.orderId !== razorpay_order_id) {
      // suspicious - client returning mismatched order id
      console.warn("Order ID mismatch for booking", bookingId, booking.paymentInfo.orderId , razorpay_order_id);
      // Proceed to verify signature anyway or reject — better to reject:
      return res.status(400).json({ success: false, message: "Order id does not match booking" });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      // signature mismatch -> update status to failed (or keep pending)
      await Booking.findByIdAndUpdate(bookingId, {
        $set: {
          "paymentInfo.status": "Failed", // or whatever field you use 
        },
      });
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    // signature match -> mark paid; idempotent: if already paid, return success
    if (booking.paymentInfo?.status === "Paid") {
      return res.json({ success: true, message: "Already marked as paid" });
    }

    booking.paymentInfo = {
       paymentId:razorpay_payment_id,
      orderId: razorpay_order_id,
      status: "Paid",
    };
    booking.bookingStatus = "Confirmed"; // or whatever field you use
    await booking.save();

    return res.json({ success: true, message: "Payment verified successfully" });
  } catch (error) {
    console.error("payment verification failed", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
