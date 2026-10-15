import { SupportTicket } from "../models/SupportTicket.js";
import { Counter } from "../models/Counter.js";
import RiderProfile from "../models/rider/RiderProfile.js";
import PartnerProfile from "../models/partner/PartnerProfile.js";
import { Staff } from "../models/Staff.js";
import { RideBooking } from "../models/RideBooking.js";
import { TourAppBooking } from "../models/TourAppBooking.js";
import { VisaApplication } from "../models/VisaApplication.js";
import "../models/Visa.js";
import { notifyUser } from "../services/notification/notificationService.js";
import { SUPPORT_SERVICES, findService } from "../config/supportCatalog.js";
import { validateNewTicket, normalizeAttachments, isValidStatus, isValidPriority, ticketCode } from "../services/supportTicket.service.js";

// Help & Support: rider tickets (/api/support) + admin management
// (/api/admin/support-tickets). New, self-contained feature -- no existing
// collection or flow is modified.

const placeOf = (address) => String(address || "").split(",")[0].trim() || "—";
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");

// ---- Booking snapshots (what the ticket is about) ----
function rideSnapshot(r) {
  return {
    kind: "RIDE",
    id: r._id,
    code: `MB-${String(r._id).slice(-6).toUpperCase()}`,
    title: `${placeOf(r.pickup?.address)} to ${placeOf(r.drop?.address)}`,
    subtitle: [r.rideDate, r.rideTime, r.vehicleType || r.vehicleCategory].filter(Boolean).join(" • "),
    status: r.status,
  };
}
function tourSnapshot(b) {
  return {
    kind: "TOUR",
    id: b._id,
    code: `MBGT-${String(b._id).slice(-6).toUpperCase()}`,
    title: b.packageTitle,
    subtitle: [fmtDate(b.startDate), b.endDate ? `to ${fmtDate(b.endDate)}` : ""].filter(Boolean).join(" "),
    status: b.bookingStatus,
  };
}
function visaSnapshot(a) {
  return {
    kind: "VISA",
    id: a._id,
    code: a.applicationId || `#${String(a._id).slice(-6).toUpperCase()}`,
    title: `${a.visaId?.country || "Visa"} Visa`,
    subtitle: `${a.travellers?.length || 0} traveller(s)`,
    status: a.applicationStatus,
  };
}

async function riderBookings(riderProfileId, kind, limit = 20) {
  if (kind === "RIDE") {
    const rides = await RideBooking.find({ rider: riderProfileId, status: { $ne: "PAYMENT_PENDING" } }).sort({ createdAt: -1 }).limit(limit).lean();
    return rides.map(rideSnapshot);
  }
  if (kind === "TOUR") {
    const tours = await TourAppBooking.find({ rider: riderProfileId }).sort({ createdAt: -1 }).limit(limit).lean();
    return tours.map(tourSnapshot);
  }
  if (kind === "VISA") {
    const apps = await VisaApplication.find({ riderId: riderProfileId }).populate("visaId", "country").sort({ createdAt: -1 }).limit(limit).lean();
    return apps.map(visaSnapshot);
  }
  return [];
}

async function getRider(req) {
  return RiderProfile.findOne({ authId: req.riderId });
}

// Rider-facing view (no staff ids).
function riderView(t) {
  const o = t.toObject ? t.toObject() : t;
  return {
    ...o,
    messages: (o.messages || []).map((m) => ({ _id: m._id, from: m.from, text: m.text, attachments: m.attachments, at: m.at, name: m.from === "ADMIN" ? "MBGO Support" : "You" })),
  };
}

// ===================== Rider =====================

// @route GET /api/support/catalog
export const getCatalog = (req, res) => res.json({ success: true, data: SUPPORT_SERVICES });

// @route GET /api/support/bookings?service=CAB
export const getMyBookingsForSupport = async (req, res) => {
  try {
    const rider = await getRider(req);
    if (!rider) return res.status(404).json({ success: false, message: "Rider profile not found" });
    const service = findService(req.query.service);
    if (!service?.bookingKind) return res.json({ success: true, data: [] });
    return res.json({ success: true, data: await riderBookings(rider._id, service.bookingKind) });
  } catch (error) {
    console.error("Support bookings error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route POST /api/support/tickets
export const createTicket = async (req, res) => {
  try {
    const rider = await getRider(req);
    if (!rider) return res.status(404).json({ success: false, message: "Rider profile not found" });
    const v = validateNewTicket(req.body);
    if (v.error) return res.status(400).json({ success: false, message: v.error });

    // Booking must belong to this rider.
    let booking;
    const bookingId = req.body.bookingId;
    if (bookingId && v.bookingKind) {
      const mine = await riderBookings(rider._id, v.bookingKind, 200);
      booking = mine.find((b) => String(b.id) === String(bookingId));
      if (!booking) return res.status(400).json({ success: false, message: "Booking not found" });
    }

    const counter = await Counter.findOneAndUpdate({ name: "support_ticket" }, { $inc: { count: 1 } }, { new: true, upsert: true });
    const ticket = await SupportTicket.create({
      ...v.ticket,
      ticketId: ticketCode(counter.count),
      riderId: rider._id,
      ...(booking ? { booking } : {}),
      preferredContact: { ...v.ticket.preferredContact, value: v.ticket.preferredContact.value || rider.mobileNumber || "" },
      status: "OPEN",
      statusHistory: [{ status: "OPEN", by: "RIDER", note: "Request submitted" }],
      adminUnread: true,
      lastActivityAt: new Date(),
    });

    // Not awaited: the rider shouldn't wait for push delivery.
    notifyUser({
      recipientType: "Rider",
      recipientId: rider._id,
      title: "Support request received",
      message: `Ticket ${ticket.ticketId} created. Our support team will get back to you shortly.`,
      type: "General",
      data: { supportTicketId: ticket._id },
      pushToken: rider.pushToken,
    }).catch(() => {});

    return res.status(201).json({ success: true, data: riderView(ticket) });
  } catch (error) {
    console.error("Create ticket error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route GET /api/support/tickets
export const getMyTickets = async (req, res) => {
  try {
    const rider = await getRider(req);
    if (!rider) return res.status(404).json({ success: false, message: "Rider profile not found" });
    const tickets = await SupportTicket.find({ riderId: rider._id }).select("-messages").sort({ lastActivityAt: -1 }).limit(100).lean();
    return res.json({ success: true, data: tickets });
  } catch (error) {
    console.error("My tickets error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route GET /api/support/tickets/:id
export const getMyTicket = async (req, res) => {
  try {
    const rider = await getRider(req);
    if (!rider) return res.status(404).json({ success: false, message: "Rider profile not found" });
    const ticket = await SupportTicket.findOne({ _id: req.params.id, riderId: rider._id });
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    if (ticket.riderUnread) {
      ticket.riderUnread = false;
      await ticket.save();
    }
    return res.json({ success: true, data: riderView(ticket) });
  } catch (error) {
    console.error("Get ticket error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route POST /api/support/tickets/:id/messages   { text, attachments? }
export const riderReply = async (req, res) => {
  try {
    const rider = await getRider(req);
    if (!rider) return res.status(404).json({ success: false, message: "Rider profile not found" });
    const ticket = await SupportTicket.findOne({ _id: req.params.id, riderId: rider._id });
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    if (ticket.status === "CLOSED") return res.status(400).json({ success: false, message: "This ticket is closed. Please raise a new request." });
    const text = String(req.body?.text || "").trim().slice(0, 2000);
    const att = normalizeAttachments(req.body?.attachments);
    if (att.error) return res.status(400).json({ success: false, message: att.error });
    if (!text && !att.attachments.length) return res.status(400).json({ success: false, message: "Please type a message" });

    ticket.messages.push({ from: "RIDER", text, attachments: att.attachments });
    // A reply on a resolved ticket reopens it.
    if (ticket.status === "RESOLVED") {
      ticket.status = "OPEN";
      ticket.statusHistory.push({ status: "OPEN", by: "RIDER", note: "Reopened by rider" });
    }
    ticket.adminUnread = true;
    ticket.lastActivityAt = new Date();
    await ticket.save();
    return res.json({ success: true, data: riderView(ticket) });
  } catch (error) {
    console.error("Rider reply error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ===================== Admin =====================

const STATUS_COPY = {
  IN_PROGRESS: { title: "We're working on your request", message: (t) => `Ticket ${t.ticketId} is now in progress.` },
  RESOLVED: { title: "Your request is resolved", message: (t) => `Ticket ${t.ticketId} has been resolved.${t.resolutionNote ? ` ${t.resolutionNote}` : ""}` },
  CLOSED: { title: "Support request closed", message: (t) => `Ticket ${t.ticketId} has been closed.` },
  OPEN: { title: "Support request reopened", message: (t) => `Ticket ${t.ticketId} has been reopened.` },
};

async function notifyRider(ticket, title, message) {
  try {
    // Driver-partner ticket (MBConnect): notify the partner instead.
    if (ticket.partnerId) {
      const partner = await PartnerProfile.findById(ticket.partnerId);
      if (!partner) return;
      await notifyUser({
        recipientType: "Partner",
        recipientId: partner._id,
        title,
        message,
        type: "System",
        data: { supportTicketId: ticket._id },
        pushToken: partner.pushToken,
      });
      return;
    }
    const rider = await RiderProfile.findById(ticket.riderId);
    if (!rider) return;
    await notifyUser({
      recipientType: "Rider",
      recipientId: rider._id,
      title,
      message,
      type: "General",
      data: { supportTicketId: ticket._id },
      pushToken: rider.pushToken,
    });
  } catch (error) {
    console.error("Support notify error:", error.message);
  }
}

async function staffName(req) {
  try {
    const s = await Staff.findById(req.user?.sub).select("name").lean();
    return s?.name || "Support";
  } catch {
    return "Support";
  }
}

// @route GET /api/admin/support-tickets?status=&service=&priority=&q=&page=
export const adminListTickets = async (req, res) => {
  try {
    const filter = {};
    if (isValidStatus(req.query.status)) filter.status = req.query.status;
    if (req.query.status === "ACTIVE") filter.status = { $in: ["OPEN", "IN_PROGRESS"] };
    if (findService(req.query.service)) filter.service = req.query.service;
    if (isValidPriority(req.query.priority)) filter.priority = req.query.priority;
    // Who raised it: riders (MBGO) or driver partners (MBConnect).
    if (req.query.who === "PARTNER") filter.partnerId = { $exists: true, $ne: null };
    if (req.query.who === "RIDER") filter.riderId = { $exists: true, $ne: null };
    const q = String(req.query.q || "").trim();
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const riders = await RiderProfile.find({ $or: [{ fullName: rx }, { mobileNumber: rx }] }).select("_id").limit(200).lean();
      const partners = await PartnerProfile.find({ $or: [{ fullName: rx }, { mobileNumber: rx }] }).select("_id").limit(200).lean();
      filter.$or = [{ ticketId: rx }, { description: rx }, { subject: rx }, { "booking.code": rx }, { riderId: { $in: riders.map((r) => r._id) } }, { partnerId: { $in: partners.map((p) => p._id) } }];
    }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 25;
    const [items, total, counts] = await Promise.all([
      SupportTicket.find(filter).select("-messages -statusHistory").populate("riderId", "fullName mobileNumber").populate("partnerId", "fullName mobileNumber").sort({ lastActivityAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      SupportTicket.countDocuments(filter),
      SupportTicket.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    ]);
    return res.json({ success: true, data: items, total, page, pages: Math.ceil(total / limit), counts: Object.fromEntries(counts.map((c) => [c._id, c.n])) });
  } catch (error) {
    console.error("Admin list tickets error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route GET /api/admin/support-tickets/:id
export const adminGetTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id).populate("riderId", "fullName mobileNumber").populate("partnerId", "fullName mobileNumber");
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    if (ticket.adminUnread) {
      ticket.adminUnread = false;
      await ticket.save();
    }
    return res.json({ success: true, data: ticket });
  } catch (error) {
    console.error("Admin get ticket error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route PATCH /api/admin/support-tickets/:id   { status?, priority?, resolutionNote? }
export const adminUpdateTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    const { status, priority, resolutionNote } = req.body || {};
    if (status !== undefined && !isValidStatus(status)) return res.status(400).json({ success: false, message: "Invalid status" });
    if (priority !== undefined && !isValidPriority(priority)) return res.status(400).json({ success: false, message: "Invalid priority" });
    if (status === "RESOLVED" && !String(resolutionNote ?? ticket.resolutionNote ?? "").trim()) {
      return res.status(400).json({ success: false, message: "Add a resolution note before resolving" });
    }
    if (resolutionNote !== undefined) ticket.resolutionNote = String(resolutionNote).trim().slice(0, 2000);
    if (priority) ticket.priority = priority;
    const statusChanged = status && status !== ticket.status;
    if (statusChanged) {
      ticket.status = status;
      ticket.statusHistory.push({ status, by: "ADMIN", note: await staffName(req) });
      if (status === "RESOLVED") ticket.resolvedAt = new Date();
      ticket.riderUnread = true;
      ticket.lastActivityAt = new Date();
    }
    await ticket.save();
    if (statusChanged && STATUS_COPY[status]) notifyRider(ticket, STATUS_COPY[status].title, STATUS_COPY[status].message(ticket));
    await ticket.populate([{ path: "riderId", select: "fullName mobileNumber" }, { path: "partnerId", select: "fullName mobileNumber" }]);
    return res.json({ success: true, data: ticket });
  } catch (error) {
    console.error("Admin update ticket error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route POST /api/admin/support-tickets/:id/messages   { text }
export const adminReply = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    const text = String(req.body?.text || "").trim().slice(0, 2000);
    if (!text) return res.status(400).json({ success: false, message: "Please type a reply" });
    const name = await staffName(req);
    ticket.messages.push({ from: "ADMIN", text, staffId: req.user?.sub, staffName: name });
    // First reply moves a new ticket into progress.
    if (ticket.status === "OPEN") {
      ticket.status = "IN_PROGRESS";
      ticket.statusHistory.push({ status: "IN_PROGRESS", by: "ADMIN", note: name });
    }
    ticket.riderUnread = true;
    ticket.lastActivityAt = new Date();
    await ticket.save();
    notifyRider(ticket, `Reply on ${ticket.ticketId}`, text.length > 120 ? `${text.slice(0, 117)}...` : text);
    await ticket.populate([{ path: "riderId", select: "fullName mobileNumber" }, { path: "partnerId", select: "fullName mobileNumber" }]);
    return res.json({ success: true, data: ticket });
  } catch (error) {
    console.error("Admin reply error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
