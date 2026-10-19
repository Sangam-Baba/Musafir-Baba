import { Router } from "express";
import protect from "../middleware/auth.middleware.js";
import authorizedRoles from "../middleware/roleCheck.middleware.js";
import {
  getAppHome,
  adminListBanners,
  adminCreateBanner,
  adminUpdateBanner,
  adminReorderBanners,
  adminDeleteBanner,
  adminListAnnouncements,
  adminCreateAnnouncement,
  adminUpdateAnnouncement,
  adminRetryAnnouncement,
  adminDeleteAnnouncement,
} from "../controllers/partnerAppHome.controller.js";

// MBConnect partner app Home content (mounted at /partner-app-home).
// Public: live banners + update text only.
const router = Router();
router.get("/", getAppHome);
export default router;

// Admin (mounted at /admin/partner-app-home). Explicit permission so staff
// don't inherit access via roleCheck's URL inference.
export const adminPartnerAppHomeRoutes = Router();
adminPartnerAppHomeRoutes.use(protect);
adminPartnerAppHomeRoutes.use(authorizedRoles(["admin", "superadmin"], "partner-app-home"));
adminPartnerAppHomeRoutes.get("/banners", adminListBanners);
adminPartnerAppHomeRoutes.post("/banners", adminCreateBanner);
adminPartnerAppHomeRoutes.put("/banners/reorder", adminReorderBanners);
adminPartnerAppHomeRoutes.patch("/banners/:id", adminUpdateBanner);
adminPartnerAppHomeRoutes.delete("/banners/:id", adminDeleteBanner);
adminPartnerAppHomeRoutes.get("/announcements", adminListAnnouncements);
adminPartnerAppHomeRoutes.post("/announcements", adminCreateAnnouncement);
adminPartnerAppHomeRoutes.patch("/announcements/:id", adminUpdateAnnouncement);
adminPartnerAppHomeRoutes.post("/announcements/:id/retry", adminRetryAnnouncement);
adminPartnerAppHomeRoutes.delete("/announcements/:id", adminDeleteAnnouncement);
