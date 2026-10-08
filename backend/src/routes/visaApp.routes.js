import { Router } from "express";
import { isRiderAuthenticated } from "../middleware/riderAuth.middleware.js";
import {
  saveVisaAppDraft,
  getMyVisaApps,
  getMyVisaAppById,
  initiateVisaAppPayment,
  verifyVisaAppPaymentSuccess,
  verifyVisaAppPaymentFailure,
  resubmitVisaApp,
} from "../controllers/visaApp.controller.js";

// Visa applications from the MBGo rider app (mounted at /visa-app).
const router = Router();

// PayU posts back here (no auth -- verified by hash). Registered before "/:id".
router.post("/payment/success", verifyVisaAppPaymentSuccess);
router.post("/payment/failure", verifyVisaAppPaymentFailure);

router.post("/", isRiderAuthenticated, saveVisaAppDraft);
router.get("/my", isRiderAuthenticated, getMyVisaApps);
router.get("/:id", isRiderAuthenticated, getMyVisaAppById);
router.put("/:id", isRiderAuthenticated, saveVisaAppDraft);
router.post("/:id/pay", isRiderAuthenticated, initiateVisaAppPayment);
router.post("/:id/resubmit", isRiderAuthenticated, resubmitVisaApp);

export default router;
