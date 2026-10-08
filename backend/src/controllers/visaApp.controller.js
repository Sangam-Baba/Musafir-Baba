import crypto from "crypto";
import { VisaApplication } from "../models/VisaApplication.js";
import { Visa } from "../models/Visa.js";
import { Counter } from "../models/Counter.js";
import RiderProfile from "../models/rider/RiderProfile.js";
import RiderAuth from "../models/rider/RiderAuth.js";
import { notifyUser } from "../services/notification/notificationService.js";
import {
  computeVisaFee,
  normalizeTravellers,
  validateContact,
  normalizeDocuments,
  normalizeEligibility,
  getMissingDocuments,
} from "../services/visaAppPricing.service.js";

// Visa applications from the MBGo rider app. Same VisaApplication collection
// as the website (so they appear in Admin -> Visa Applications), but these
// routes are rider-authenticated and only ever touch the rider's own
// applications. The website's /visa-application and /payment flows are not
// used or changed.

// Same PayU config + hash formulas as controllers/payment.controller.js
// (copied rather than imported so that shared file stays untouched).
const merchantKey = process.env.PAYU_KEY;
const merchantSalt = process.env.PAYU_SALT;
const payuBaseUrl = process.env.PAYU_ENV === "prod" ? "https://secure.payu.in" : "https://test.payu.in";

function generateHash({
  txnid,
  amount,
  productinfo,
  firstname,
  email,
  udf1 = "",
  udf2 = "",
  udf3 = "",
  udf4 = "",
  udf5 = "",
}) {
  const hashString = `${merchantKey}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${merchantSalt}`;

  return crypto.createHash("sha512").update(hashString).digest("hex");
}

function verifyHash({
  status,
  txnid,
  amount,
  productinfo,
  firstname,
  email,
  udf1 = "",
  udf2 = "",
  udf3 = "",
  udf4 = "",
  udf5 = "",
}) {
  const hashString = `${merchantSalt}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${merchantKey}`;

  return crypto.createHash("sha512").update(hashString).digest("hex");
}

const isPaid = (app) => app?.paymentInfo?.status === "Paid";
const VISA_LIST_FIELDS = "title slug country coverImage bannerImage visas necessaryDocuments cost visaType";

async function getRiderProfile(req) {
  return RiderProfile.findOne({ authId: req.riderId });
}

async function findOwnApplication(req, riderProfile) {
  return VisaApplication.findOne({ _id: req.params.id, riderId: riderProfile._id });
}

// @route   POST /api/visa-app            (create draft)
// @route   PUT  /api/visa-app/:id        (update draft / fix a Returned application)
// @body    { visaId, selectedVisaId, selectedValidityIndex, isExpress, travellers[],
//           email, phone, documents[], eligibility, currentStep }
// @desc    Saves progress after each step (like the website). Fees are recomputed
//          on the server from the visa itself.
export const saveVisaAppDraft = async (req, res) => {
  try {
    const riderProfile = await getRiderProfile(req);
    if (!riderProfile) return res.status(404).json({ success: false, message: "Rider profile not found" });

    const body = req.body || {};
    let application = null;
    if (req.params.id) {
      application = await findOwnApplication(req, riderProfile);
      if (!application) return res.status(404).json({ success: false, message: "Application not found" });
      const editable = (application.applicationStatus === "Pending" && !isPaid(application)) || application.applicationStatus === "Returned";
      if (!editable) return res.status(400).json({ success: false, message: "This application can no longer be edited" });
    }

    // After payment (a Returned application), the visa choice and the number
    // of travellers are locked -- only details/documents can be fixed.
    const locked = application && isPaid(application);
    const visaId = locked ? application.visaId : body.visaId || application?.visaId;
    const visa = visaId ? await Visa.findById(visaId).lean() : null;
    if (!visa) return res.status(400).json({ success: false, message: "Visa not found" });

    const selection = locked
      ? { selectedVisaId: application.selectedVisaId, selectedValidityIndex: application.selectedValidityIndex, isExpress: application.isExpress }
      : {
          selectedVisaId: body.selectedVisaId ?? application?.selectedVisaId,
          selectedValidityIndex: body.selectedValidityIndex ?? application?.selectedValidityIndex ?? 0,
          isExpress: body.isExpress ?? application?.isExpress ?? false,
        };

    // Travellers: required once provided (step 1 onwards).
    let travellers = application?.travellers?.map((t) => ({ firstName: t.firstName, lastName: t.lastName, dob: t.dob, gender: t.gender }));
    if (body.travellers !== undefined) {
      const result = normalizeTravellers(body.travellers);
      if (result.error) return res.status(400).json({ success: false, message: result.error });
      if (locked && result.travellers.length !== application.travellers.length) {
        return res.status(400).json({ success: false, message: "The number of travellers can't change after payment" });
      }
      travellers = result.travellers;
    }
    const travellerCount = travellers?.length || Number(body.eligibility?.travellerCount) || 1;

    const fee = computeVisaFee(visa, { ...selection, travellerCount });
    if (fee.error) return res.status(400).json({ success: false, message: fee.error });

    const update = {
      visaId: visa._id,
      selectedVisaId: selection.selectedVisaId ? String(selection.selectedVisaId) : undefined,
      selectedValidityIndex: Number(selection.selectedValidityIndex) || 0,
      isExpress: fee.isExpress,
      // Paid amounts never change; unpaid drafts track the current price.
      ...(locked ? {} : { totalCost: fee.totalCost }),
    };
    if (travellers) update.travellers = travellers;

    if (body.email !== undefined || body.phone !== undefined) {
      const contact = validateContact({ email: body.email, phone: body.phone });
      if (contact.error) return res.status(400).json({ success: false, message: contact.error });
      update.email = contact.email;
      update.phone = contact.phone;
    }

    const docs = normalizeDocuments(body.documents, travellerCount);
    if (docs.error) return res.status(400).json({ success: false, message: docs.error });
    if (docs.documents) update.documents = docs.documents;

    const elig = normalizeEligibility(body.eligibility);
    if (elig.error) return res.status(400).json({ success: false, message: elig.error });
    if (elig.eligibility) update.eligibility = elig.eligibility;

    const step = Number(body.currentStep);
    if (Number.isInteger(step) && step >= 1 && step <= 3) update.currentStep = step;

    if (application) {
      application.set(update);
      await application.save();
    } else {
      // Same "MBV0000001" id sequence as website applications.
      const counter = await Counter.findOneAndUpdate({ name: "visa_application" }, { $inc: { count: 1 } }, { new: true, upsert: true });
      application = await VisaApplication.create({
        ...update,
        riderId: riderProfile._id,
        applicationId: `MBV${counter.count.toString().padStart(7, "0")}`,
        currentStep: update.currentStep || 1,
      });
    }

    const data = application.toObject();
    return res.status(200).json({ success: true, data, fee: { perPerson: fee.perPerson, travellerCount: fee.travellerCount, totalCost: locked ? application.totalCost : fee.totalCost } });
  } catch (error) {
    if (error?.name === "ValidationError") {
      return res.status(400).json({ success: false, message: Object.values(error.errors)[0]?.message || "Invalid application" });
    }
    console.error("Save Visa App Draft Error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   GET /api/visa-app/my
export const getMyVisaApps = async (req, res) => {
  try {
    const riderProfile = await getRiderProfile(req);
    if (!riderProfile) return res.status(404).json({ success: false, message: "Rider profile not found" });
    const apps = await VisaApplication.find({ riderId: riderProfile._id }).populate("visaId", VISA_LIST_FIELDS).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, data: apps });
  } catch (error) {
    console.error("Get My Visa Apps Error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   GET /api/visa-app/:id   (own application only)
export const getMyVisaAppById = async (req, res) => {
  try {
    const riderProfile = await getRiderProfile(req);
    if (!riderProfile) return res.status(404).json({ success: false, message: "Rider profile not found" });
    const app = await VisaApplication.findOne({ _id: req.params.id, riderId: riderProfile._id }).populate("visaId").lean();
    if (!app) return res.status(404).json({ success: false, message: "Application not found" });
    return res.status(200).json({ success: true, data: app });
  } catch (error) {
    console.error("Get Visa App Error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Checks the application is complete enough to pay / resubmit. Returns an error message or null.
function getIncompleteReason(app, visa) {
  if (!app.travellers?.length) return "Add traveller details";
  if (!app.email || !app.phone) return "Add contact email and phone";
  const missing = getMissingDocuments(visa, app.travellers.length, app.documents || []);
  if (missing.length) return `Upload ${missing[0].name} for traveller ${missing[0].traveller + 1}`;
  return null;
}

// @route   POST /api/visa-app/:id/pay
// @desc    PayU checkout for an unpaid application. Amount computed on the server.
export const initiateVisaAppPayment = async (req, res) => {
  try {
    const riderProfile = await getRiderProfile(req);
    if (!riderProfile) return res.status(404).json({ success: false, message: "Rider profile not found" });
    const app = await findOwnApplication(req, riderProfile);
    if (!app) return res.status(404).json({ success: false, message: "Application not found" });
    if (isPaid(app) || app.applicationStatus !== "Pending") {
      return res.status(400).json({ success: false, message: "This application is not awaiting payment" });
    }
    const visa = await Visa.findById(app.visaId).lean();
    if (!visa) return res.status(400).json({ success: false, message: "Visa not found" });

    const incomplete = getIncompleteReason(app, visa);
    if (incomplete) return res.status(400).json({ success: false, message: incomplete });

    const fee = computeVisaFee(visa, {
      selectedVisaId: app.selectedVisaId,
      selectedValidityIndex: app.selectedValidityIndex ?? 0,
      isExpress: app.isExpress,
      travellerCount: app.travellers.length,
    });
    if (fee.error) return res.status(400).json({ success: false, message: fee.error });

    const riderAuth = await RiderAuth.findById(req.riderId);
    const txnid = `MBGV${Date.now()}`;
    const amount = Number(fee.totalCost).toFixed(2);
    const productinfo = "MBGO Visa Application";
    const firstname = app.travellers[0]?.firstName || riderProfile.fullName || "Rider";
    const email = app.email || riderAuth?.email || `${riderProfile.mobileNumber}@mbgo.in`;
    const phone = app.phone || riderProfile.mobileNumber || "";
    const udf1 = String(app._id);
    const backendBaseUrl = `${req.protocol}://${req.get("host")}`;
    const surl = `${backendBaseUrl}/api/visa-app/payment/success`;
    const furl = `${backendBaseUrl}/api/visa-app/payment/failure`;
    const hash = generateHash({ txnid, amount, productinfo, firstname, email, udf1 });

    app.totalCost = fee.totalCost;
    app.currentStep = 3;
    app.paymentInfo = { ...(app.paymentInfo?.toObject?.() || {}), orderId: txnid, status: "Pending" };
    await app.save();

    return res.json({
      success: true,
      payuUrl: `${payuBaseUrl}/_payment`,
      paymentData: { key: merchantKey, txnid, amount, productinfo, firstname, email, phone, surl, furl, hash, udf1, service_provider: "payu_paisa" },
    });
  } catch (error) {
    console.error("Initiate Visa App Payment Error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/visa-app/payment/success   (PayU surl)
// @desc    Same outcome as the website's visa payment: Paid + Submitted.
export const verifyVisaAppPaymentSuccess = async (req, res) => {
  const { status, txnid, amount, productinfo, firstname, email, hash, udf1, mihpayid } = req.body || {};
  if (verifyHash({ status, txnid, amount, productinfo, firstname, email, udf1 }) !== hash) {
    console.error("⚠️ Visa app payment hash mismatch, possible tampering");
    return res.status(400).send("Invalid transaction");
  }
  try {
    const app = await VisaApplication.findById(udf1);
    if (app && app.riderId && Number(amount).toFixed(2) === Number(app.totalCost).toFixed(2)) {
      app.paymentInfo = { orderId: txnid, paymentId: mihpayid, signature: hash, status: "Paid" };
      app.applicationStatus = "Submitted";
      await app.save();
      try {
        const riderProfile = await RiderProfile.findById(app.riderId);
        if (riderProfile) {
          await notifyUser({
            recipientType: "Rider",
            recipientId: riderProfile._id,
            title: "Visa application submitted",
            message: `Payment received. Your visa application ${app.applicationId || ""} is now with our visa experts.`,
            type: "General",
            data: { visaApplicationId: app._id },
            pushToken: riderProfile.pushToken,
          });
        }
      } catch (error) {
        console.error("Visa App Submitted Notification Error:", error.message);
      }
    } else {
      console.error("Visa app payment amount/application mismatch:", udf1, amount);
    }
  } catch (error) {
    console.error("Verify Visa App Payment Error:", error.message);
  }
  return res.redirect(`${process.env.FRONTEND_URL}/payment/success?from=mbgo-visa`);
};

// @route   POST /api/visa-app/payment/failure   (PayU furl)
export const verifyVisaAppPaymentFailure = async (req, res) => {
  const { status, txnid, amount, productinfo, firstname, email, hash, udf1, mihpayid } = req.body || {};
  if (verifyHash({ status, txnid, amount, productinfo, firstname, email, udf1 }) !== hash) {
    console.error("⚠️ Visa app payment (failure) hash mismatch");
    return res.status(400).send("Invalid transaction");
  }
  try {
    // Stays Pending so the rider can retry (website shows "Retry Payment" the same way).
    await VisaApplication.updateOne(
      { _id: udf1, riderId: { $exists: true }, "paymentInfo.status": { $ne: "Paid" } },
      { $set: { "paymentInfo.status": "Failed", "paymentInfo.orderId": txnid, "paymentInfo.paymentId": mihpayid } }
    );
  } catch (error) {
    console.error("Visa App Payment Failure Update Error:", error.message);
  }
  return res.redirect(`${process.env.FRONTEND_URL}/payment/failed?from=mbgo-visa`);
};

// @route   POST /api/visa-app/:id/resubmit
// @desc    A "Returned" application, after the rider fixed it, goes back to the
//          visa team as "Submitted" (no new payment). Return reason is kept.
export const resubmitVisaApp = async (req, res) => {
  try {
    const riderProfile = await getRiderProfile(req);
    if (!riderProfile) return res.status(404).json({ success: false, message: "Rider profile not found" });
    const app = await findOwnApplication(req, riderProfile);
    if (!app) return res.status(404).json({ success: false, message: "Application not found" });
    if (app.applicationStatus !== "Returned" || !isPaid(app)) {
      return res.status(400).json({ success: false, message: "Only returned applications can be resubmitted" });
    }
    const visa = await Visa.findById(app.visaId).lean();
    const incomplete = getIncompleteReason(app, visa);
    if (incomplete) return res.status(400).json({ success: false, message: incomplete });

    app.applicationStatus = "Submitted";
    app.resubmittedAt = new Date();
    await app.save();
    return res.status(200).json({ success: true, data: app.toObject() });
  } catch (error) {
    console.error("Resubmit Visa App Error:", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
