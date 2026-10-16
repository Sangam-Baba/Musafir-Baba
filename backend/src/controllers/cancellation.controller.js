import { CancellationRequest } from "../models/CancellationRequest.js";
import { Counter } from "../models/Counter.js";
import RiderProfile from "../models/rider/RiderProfile.js";
import PartnerProfile from "../models/partner/PartnerProfile.js";
import { Staff } from "../models/Staff.js";
import { RideBooking } from "../models/RideBooking.js";
import { TourAppBooking } from "../models/TourAppBooking.js";
import { VisaApplication } from "../models/VisaApplication.js";
import "../models/Visa.js";
import { notifyUser } from "../services/notification/notificationService.js";
import { releaseTripFee } from "../services/partnerWallet.service.js";
import { CANCELLATION_REASONS, findReason } from "../config/cancellationReasons.js";
import { getCancellationPolicy, CAB_CANCELLABLE, cancellationCode } from "../services/cancellation.service.js";

// Rider cancellations from the MBGo app (/api/cancellations) + admin review
// (/api/admin/cancellations). New feature; the existing /ride/:id/cancel
// endpoint and all other flows are untouched.

const placeOf = (address) => String(address || "").split(",")[0].trim() || "—";
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");

async function loadBooking(service, bookingId, riderProfileId) {
  if (service === "CAB") return RideBooking.findOne({ _id: bookingId, rider: riderProfileId });
  if (service === "TOUR") return TourAppBooking.findOne({ _id: bookingId, rider: riderProfileId });
  if (service === "VISA") return VisaApplication.findOne({ _id: bookingId, riderId: riderProfileId }).populate("visaId", "country");
  return null;
}

function bookingSummary(service, b) {
  if (service === "CAB") return { code: `MB-${String(b._id).slice(-6).toUpperCase()}`, title: `${placeOf(b.pickup?.address)} to ${placeOf(b.drop?.address)}`, subtitle: [b.rideDate, b.rideTime].filter(Boolean).join(" • "), status: b.status };
  if (service === "TOUR") return { code: `MBGT-${String(b._id).slice(-6).toUpperCase()}`, title: b.packageTitle, subtitle: fmtDate(b.startDate), status: b.bookingStatus };
  return { code: b.applicationId || `#${String(b._id).slice(-6).toUpperCase()}`, title: `${b.visaId?.country || "Visa"} Visa`, subtitle: `${b.travellers?.length || 0} traveller(s)`, status: b.applicationStatus };
}

const notify = (args) => notifyUser(args).catch((e) => console.error("Cancellation notify error:", e.message));

// ===================== Rider =====================

// @route GET /api/cancellations/reasons?service=CAB
export const getReasons = (req, res) => res.json({ success: true, data: CANCELLATION_REASONS[req.query.service] || [] });

// @route GET /api/cancellations/check?service=&bookingId=
export const checkCancellation = async (req, res) => {
  try {
    const rider = await RiderProfile.findOne({ authId: req.riderId });
    if (!rider) return res.status(404).json({ success: false, message: "Rider profile not found" });
    const { service, bookingId } = req.query;
    const booking = await loadBooking(service, bookingId, rider._id);
    const policy = getCancellationPolicy(service, booking);
    return res.json({
      success: true,
      data: {
        allowed: policy.allowed,
        type: policy.type,
        message: policy.message,
        isPaid: (policy.paidAmount || 0) > 0,
        booking: booking ? bookingSummary(service, booking) : null,
      },
    });
  } catch (error) {
    console.error("Check cancellation error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route POST /api/cancellations   { service, bookingId, reasonKey, comment }
export const createCancellation = async (req, res) => {
  try {
    const rider = await RiderProfile.findOne({ authId: req.riderId });
    if (!rider) return res.status(404).json({ success: false, message: "Rider profile not found" });
    const { service, bookingId } = req.body || {};
    const reason = findReason(service, req.body?.reasonKey);
    if (!reason) return res.status(400).json({ success: false, message: "Please choose a reason" });
    const comment = String(req.body?.comment || "").trim().slice(0, 1000);
    if (reason.key === "OTHER" && comment.length < 3) return res.status(400).json({ success: false, message: "Please tell us a little more" });

    const booking = await loadBooking(service, bookingId, rider._id);
    const policy = getCancellationPolicy(service, booking);
    if (!policy.allowed) return res.status(400).json({ success: false, message: policy.message });
    const summary = bookingSummary(service, booking);
    const now = new Date();
    const reasonText = comment ? `${reason.label} — ${comment}` : reason.label;

    // Cabs: cancel atomically (only if still in a cancellable state).
    if (service === "CAB") {
      const updated = await RideBooking.findOneAndUpdate(
        { _id: booking._id, rider: rider._id, status: { $in: CAB_CANCELLABLE } },
        {
          $set: { status: "CANCELLED", cancelReason: reasonText, needsManualAssignment: false, cancellation: { status: "APPROVED", reasonLabel: reason.label, at: now } },
          $push: { statusHistory: { status: "CANCELLED", note: `Cancelled by rider: ${reasonText}` } },
        },
        { new: true }
      );
      if (!updated) return res.status(409).json({ success: false, message: "This ride can no longer be cancelled." });
      // Partner Wallet program: the driver isn't at fault -- give back any held fee.
      await releaseTripFee(updated._id).catch((e) => console.error("Release trip fee error:", e.message));
    }

    const counter = await Counter.findOneAndUpdate({ name: "cancellation_request" }, { $inc: { count: 1 } }, { new: true, upsert: true });
    const instant = policy.type === "INSTANT";
    const request = await CancellationRequest.create({
      requestId: cancellationCode(counter.count),
      service,
      bookingId: booking._id,
      bookingCode: summary.code,
      bookingTitle: summary.title,
      bookingSubtitle: summary.subtitle,
      bookingStatusAtRequest: summary.status,
      riderId: rider._id,
      reasonKey: reason.key,
      reasonLabel: reason.label,
      comment,
      type: policy.type,
      status: instant ? "APPROVED" : "REQUESTED",
      paidAmount: policy.paidAmount || 0,
      refund: { status: instant && (policy.paidAmount || 0) > 0 ? "PENDING" : "NOT_APPLICABLE" },
      ...(instant ? { decidedAt: now, decidedBy: "SYSTEM" } : {}),
    });

    if (service === "CAB") {
      await RideBooking.updateOne({ _id: booking._id }, { $set: { "cancellation.requestId": request._id } });
      if (booking.assignedPartnerId) {
        const partner = await PartnerProfile.findById(booking.assignedPartnerId).lean();
        if (partner) {
          notify({
            recipientType: "Partner",
            recipientId: partner._id,
            title: "Ride cancelled by rider",
            message: `Trip ${summary.code} (${summary.title}, ${summary.subtitle}) was cancelled by the rider.`,
            type: "Trip",
            data: { rideId: booking._id },
            pushToken: partner.pushToken,
          });
        }
      }
    } else {
      const cancellation = { requestId: request._id, status: request.status, reasonLabel: reason.label, at: now };
      if (service === "TOUR") {
        await TourAppBooking.updateOne({ _id: booking._id }, { $set: { cancellation, ...(instant ? { bookingStatus: "Cancelled" } : {}) } });
      } else {
        await VisaApplication.updateOne({ _id: booking._id }, { $set: { cancellation, ...(instant ? { applicationStatus: "Cancelled" } : {}) } });
      }
    }

    notify({
      recipientType: "Rider",
      recipientId: rider._id,
      title: instant ? "Booking cancelled" : "Cancellation request received",
      message: instant
        ? `${summary.code} has been cancelled.${(policy.paidAmount || 0) > 0 ? " Any eligible refund will be processed by our team." : ""}`
        : `We've received your request to cancel ${summary.code}. Our team will review it and get back to you.`,
      type: "General",
      data: { cancellationId: request._id },
      pushToken: rider.pushToken,
    });

    return res.status(201).json({
      success: true,
      data: { requestId: request.requestId, type: request.type, status: request.status, isPaid: (policy.paidAmount || 0) > 0, booking: summary },
    });
  } catch (error) {
    console.error("Create cancellation error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ===================== Admin =====================

async function staffName(req) {
  try {
    const s = await Staff.findById(req.user?.sub).select("name").lean();
    return s?.name || "Admin";
  } catch {
    return "Admin";
  }
}

// @route GET /api/admin/cancellations?status=&service=&refund=&page=
export const adminListCancellations = async (req, res) => {
  try {
    const filter = {};
    if (["REQUESTED", "APPROVED", "REJECTED"].includes(req.query.status)) filter.status = req.query.status;
    if (["CAB", "TOUR", "VISA"].includes(req.query.service)) filter.service = req.query.service;
    if (["PENDING", "REFUNDED", "NOT_APPLICABLE"].includes(req.query.refund)) filter["refund.status"] = req.query.refund;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 25;
    const [items, total, pendingRequests, pendingRefunds] = await Promise.all([
      CancellationRequest.find(filter).populate("riderId", "fullName mobileNumber").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      CancellationRequest.countDocuments(filter),
      CancellationRequest.countDocuments({ status: "REQUESTED" }),
      CancellationRequest.countDocuments({ "refund.status": "PENDING" }),
    ]);
    return res.json({ success: true, data: items, total, page, pages: Math.ceil(total / limit), counts: { pendingRequests, pendingRefunds } });
  } catch (error) {
    console.error("Admin list cancellations error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route PATCH /api/admin/cancellations/:id/decision   { action: "APPROVE"|"REJECT", adminNote }
export const adminDecideCancellation = async (req, res) => {
  try {
    const { action } = req.body || {};
    if (!["APPROVE", "REJECT"].includes(action)) return res.status(400).json({ success: false, message: "Invalid action" });
    const adminNote = String(req.body?.adminNote || "").trim().slice(0, 1000);
    if (action === "REJECT" && !adminNote) return res.status(400).json({ success: false, message: "Add a note for the rider explaining why" });
    const request = await CancellationRequest.findOne({ _id: req.params.id, status: "REQUESTED" });
    if (!request) return res.status(404).json({ success: false, message: "No pending request found" });

    const approve = action === "APPROVE";
    const name = await staffName(req);
    request.status = approve ? "APPROVED" : "REJECTED";
    request.adminNote = adminNote;
    request.decidedAt = new Date();
    request.decidedBy = name;
    if (approve && request.paidAmount > 0) request.refund = { status: "PENDING" };
    await request.save();

    const set = { "cancellation.status": request.status, "cancellation.adminNote": adminNote };
    if (request.service === "TOUR") await TourAppBooking.updateOne({ _id: request.bookingId }, { $set: { ...set, ...(approve ? { bookingStatus: "Cancelled" } : {}) } });
    if (request.service === "VISA") await VisaApplication.updateOne({ _id: request.bookingId }, { $set: { ...set, ...(approve ? { applicationStatus: "Cancelled" } : {}) } });

    const rider = await RiderProfile.findById(request.riderId).lean();
    if (rider) {
      notify({
        recipientType: "Rider",
        recipientId: rider._id,
        title: approve ? "Cancellation approved" : "Cancellation request declined",
        message: approve
          ? `${request.bookingCode} has been cancelled.${request.paidAmount > 0 ? " Any eligible refund will be processed by our team." : ""}${adminNote ? ` ${adminNote}` : ""}`
          : `Your request to cancel ${request.bookingCode} was declined. ${adminNote}`,
        type: "General",
        data: { cancellationId: request._id },
        pushToken: rider.pushToken,
      });
    }
    await request.populate("riderId", "fullName mobileNumber");
    return res.json({ success: true, data: request });
  } catch (error) {
    console.error("Admin decide cancellation error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route PATCH /api/admin/cancellations/:id/refund   { status: "REFUNDED"|"NOT_APPLICABLE"|"PENDING", amount, reference, note }
export const adminUpdateRefund = async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!["REFUNDED", "NOT_APPLICABLE", "PENDING"].includes(status)) return res.status(400).json({ success: false, message: "Invalid refund status" });
    const request = await CancellationRequest.findOne({ _id: req.params.id, status: "APPROVED" });
    if (!request) return res.status(404).json({ success: false, message: "Only approved cancellations can be refunded" });
    const amount = Number(req.body?.amount);
    if (status === "REFUNDED" && !(amount > 0 && amount <= (request.paidAmount || 0))) {
      return res.status(400).json({ success: false, message: `Refund amount must be between ₹1 and ₹${request.paidAmount || 0}` });
    }
    const wasRefunded = request.refund?.status === "REFUNDED";
    request.refund = {
      status,
      amount: status === "REFUNDED" ? amount : undefined,
      reference: String(req.body?.reference || "").trim().slice(0, 200),
      note: String(req.body?.note || "").trim().slice(0, 500),
      processedAt: new Date(),
      processedBy: await staffName(req),
    };
    await request.save();
    if (status === "REFUNDED" && !wasRefunded) {
      const rider = await RiderProfile.findById(request.riderId).lean();
      if (rider) {
        notify({
          recipientType: "Rider",
          recipientId: rider._id,
          title: "Refund processed",
          message: `Refund of ₹${amount.toLocaleString("en-IN")} for ${request.bookingCode} has been processed. It may take 5–7 working days to reflect.`,
          type: "General",
          data: { cancellationId: request._id },
          pushToken: rider.pushToken,
        });
      }
    }
    await request.populate("riderId", "fullName mobileNumber");
    return res.json({ success: true, data: request });
  } catch (error) {
    console.error("Admin refund error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
