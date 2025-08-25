// POST /api/payment/create-order
import razorpayInstance from "../utils/razorpay.js";

export const createOrder = async (req, res) => {
  try {
    const { amount, currency = "INR", bookingId } = req.body;  // amount in paise

    const options = {
      amount: amount * 100, // convert to paise
      currency,
      receipt: `receipt_order_${bookingId}`,
    };

    const order = await razorpayInstance.orders.create(options);

    res.json({
      success: true,
      orderId: order.id,
      currency: order.currency,
      amount: order.amount,
      key: process.env.RAZORPAY_KEY_ID, // needed on frontend
    });
  } catch (error) {
    console.log("Create Payment Order Failed ", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};


// POST /api/payment/verify
import crypto from "crypto";
import {Booking} from "../models/Booking.js";
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      // ✅ Payment is successful
      // Update booking status in DB
      // e.g., Booking.findByIdAndUpdate(bookingId, { paymentStatus: "Paid" });
       await Booking.findByIdAndUpdate(bookingId, {paymentStatus :{ status : "Paid"}});

      return res.json({ success: true, message: "Payment verified successfully" });
    } else {
      await Booking.findByIdAndUpdate(bookingId, {paymentInfo:{status:"Failed"}});
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }
  } catch (error) {
    console.log("payment varification Failed ", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};
