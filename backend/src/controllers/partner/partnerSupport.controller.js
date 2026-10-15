import { SupportTicket } from "../../models/SupportTicket.js";
import { Counter } from "../../models/Counter.js";
import PartnerProfile from "../../models/partner/PartnerProfile.js";
import { RideBooking } from "../../models/RideBooking.js";
import { notifyUser } from "../../services/notification/notificationService.js";
import { ticketCode, normalizeAttachments } from "../../services/supportTicket.service.js";
import { PARTNER_SUPPORT_SERVICE, PARTNER_SUPPORT_ISSUES, findPartnerIssue } from "../../config/partnerSupportCatalog.js";

// MBConnect Help Center tickets (/api/partner/support/*). Same SupportTicket
// collection as MBGO rider tickets, so they appear in admin > Support Tickets.

const clean = (v, max) => String(v ?? "").trim().slice(0, max);
const placeOf = (address) => String(address || "").split(",")[0].trim() || "—";

// Pure validation (tested in tests/partnerSupport.test.js).
export function validatePartnerTicket(body = {}) {
  const issue = findPartnerIssue(body.issueKey);
  if (!issue) return { error: "Please choose what the issue is about" };
  const subject = clean(body.subject, 150);
  if (subject.length < 3) return { error: "Please add a short subject" };
  const description = clean(body.description, 2000);
  if (description.length < 10) return { error: "Please describe the issue (at least 10 characters)" };
  const att = normalizeAttachments(body.attachments);
  if (att.error) return { error: att.error };
  return {
    ticket: {
      service: PARTNER_SUPPORT_SERVICE.key,
      serviceLabel: PARTNER_SUPPORT_SERVICE.label,
      issueKey: issue.key,
      issueLabel: issue.label,
      subject,
      description,
      attachments: att.attachments,
    },
  };
}

// What the partner app sees (no internal admin fields).
function partnerView(t) {
  const o = t.toObject ? t.toObject() : t;
  return {
    _id: o._id,
    ticketId: o.ticketId,
    issueKey: o.issueKey,
    issueLabel: o.issueLabel,
    subject: o.subject,
    description: o.description,
    booking: o.booking,
    status: o.status,
    resolutionNote: o.resolutionNote,
    messages: o.messages,
    statusHistory: o.statusHistory,
    unread: !!o.riderUnread,
    lastActivityAt: o.lastActivityAt,
    createdAt: o.createdAt,
  };
}

const getProfile = (req) => PartnerProfile.findOne({ authId: req.partnerId });

// GET /api/partner/support/catalog
export const getPartnerSupportCatalog = (req, res) => res.json({ success: true, data: PARTNER_SUPPORT_ISSUES });

// GET /api/partner/support/trips -- recent trips the ticket can be about
export const getPartnerSupportTrips = async (req, res) => {
  try {
    const profile = await getProfile(req);
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found." });
    const rides = await RideBooking.find({ assignedPartnerId: profile._id }).sort({ createdAt: -1 }).limit(20).lean();
    return res.json({
      success: true,
      data: rides.map((r) => ({
        id: r._id,
        code: `MB-${String(r._id).slice(-6).toUpperCase()}`,
        title: `${placeOf(r.pickup?.address)} to ${placeOf(r.drop?.address)}`,
        subtitle: [r.rideDate, r.rideTime].filter(Boolean).join(" • "),
        status: r.status,
      })),
    });
  } catch (error) {
    console.error("Partner support trips error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// POST /api/partner/support/tickets  { issueKey, subject, description, rideId? }
export const createPartnerTicket = async (req, res) => {
  try {
    const profile = await getProfile(req);
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found." });
    const v = validatePartnerTicket(req.body);
    if (v.error) return res.status(400).json({ success: false, message: v.error });

    // Optional trip -- must be one assigned to this partner.
    let booking;
    if (req.body.rideId) {
      const r = await RideBooking.findOne({ _id: req.body.rideId, assignedPartnerId: profile._id }).lean().catch(() => null);
      if (!r) return res.status(400).json({ success: false, message: "Trip not found" });
      booking = {
        kind: "RIDE",
        id: r._id,
        code: `MB-${String(r._id).slice(-6).toUpperCase()}`,
        title: `${placeOf(r.pickup?.address)} to ${placeOf(r.drop?.address)}`,
        subtitle: [r.rideDate, r.rideTime].filter(Boolean).join(" • "),
        status: r.status,
      };
    }

    const counter = await Counter.findOneAndUpdate({ name: "support_ticket" }, { $inc: { count: 1 } }, { new: true, upsert: true });
    const ticket = await SupportTicket.create({
      ...v.ticket,
      ticketId: ticketCode(counter.count),
      partnerId: profile._id,
      ...(booking ? { booking } : {}),
      preferredContact: { method: "CALL", value: profile.mobileNumber && profile.mobileNumber !== "Not Provided" ? profile.mobileNumber : "" },
      status: "OPEN",
      statusHistory: [{ status: "OPEN", by: "PARTNER", note: "Request submitted" }],
      adminUnread: true,
      lastActivityAt: new Date(),
    });

    notifyUser({
      recipientType: "Partner",
      recipientId: profile._id,
      title: "Support request received",
      message: `Ticket ${ticket.ticketId} created. Our partner support team will get back to you shortly.`,
      type: "System",
      data: { supportTicketId: ticket._id },
      pushToken: profile.pushToken,
    }).catch(() => {});

    return res.status(201).json({ success: true, data: partnerView(ticket) });
  } catch (error) {
    console.error("Create partner ticket error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// GET /api/partner/support/tickets
export const getPartnerTickets = async (req, res) => {
  try {
    const profile = await getProfile(req);
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found." });
    const tickets = await SupportTicket.find({ partnerId: profile._id }).select("-messages -statusHistory").sort({ lastActivityAt: -1 }).limit(100).lean();
    return res.json({ success: true, data: tickets.map(partnerView) });
  } catch (error) {
    console.error("Partner tickets error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// GET /api/partner/support/tickets/:id
export const getPartnerTicket = async (req, res) => {
  try {
    const profile = await getProfile(req);
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found." });
    const ticket = await SupportTicket.findOne({ _id: req.params.id, partnerId: profile._id }).catch(() => null);
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    if (ticket.riderUnread) {
      ticket.riderUnread = false;
      await ticket.save();
    }
    return res.json({ success: true, data: partnerView(ticket) });
  } catch (error) {
    console.error("Partner ticket error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// POST /api/partner/support/tickets/:id/messages  { text }
export const partnerReply = async (req, res) => {
  try {
    const profile = await getProfile(req);
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found." });
    const ticket = await SupportTicket.findOne({ _id: req.params.id, partnerId: profile._id }).catch(() => null);
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    if (ticket.status === "CLOSED") return res.status(400).json({ success: false, message: "This ticket is closed" });
    const text = clean(req.body?.text, 2000);
    if (!text) return res.status(400).json({ success: false, message: "Please type a message" });
    ticket.messages.push({ from: "PARTNER", text });
    // A reply on a resolved ticket reopens it.
    if (ticket.status === "RESOLVED") {
      ticket.status = "OPEN";
      ticket.statusHistory.push({ status: "OPEN", by: "PARTNER", note: "Reopened with a new message" });
    }
    ticket.adminUnread = true;
    ticket.lastActivityAt = new Date();
    await ticket.save();
    return res.json({ success: true, data: partnerView(ticket) });
  } catch (error) {
    console.error("Partner reply error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
