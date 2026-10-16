import { Router } from "express";
import { rechargeSuccess, rechargeFailure, rechargeCheckoutPage } from "../../controllers/partner/partnerWallet.controller.js";

// PayU callbacks for MBConnect wallet recharges (public -- verified by PayU hash).
const router = Router();
router.get("/checkout/:txnid", rechargeCheckoutPage);
router.post("/success", rechargeSuccess);
router.post("/failure", rechargeFailure);
export default router;
