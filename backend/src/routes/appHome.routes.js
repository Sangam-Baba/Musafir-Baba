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
} from "../controllers/appHome.controller.js";

// MBGo app Home content (mounted at /app-home). Public: banners + update text only.
const router = Router();
router.get("/", getAppHome);
export default router;

// Admin (mounted at /admin/app-home). Explicit permission so staff don't
// inherit access via roleCheck's URL inference.
export const adminAppHomeRoutes = Router();
adminAppHomeRoutes.use(protect);
adminAppHomeRoutes.use(authorizedRoles(["admin", "superadmin"], "app-home"));
adminAppHomeRoutes.get("/banners", adminListBanners);
adminAppHomeRoutes.post("/banners", adminCreateBanner);
adminAppHomeRoutes.put("/banners/reorder", adminReorderBanners);
adminAppHomeRoutes.patch("/banners/:id", adminUpdateBanner);
adminAppHomeRoutes.delete("/banners/:id", adminDeleteBanner);
adminAppHomeRoutes.get("/announcements", adminListAnnouncements);
adminAppHomeRoutes.post("/announcements", adminCreateAnnouncement);
adminAppHomeRoutes.patch("/announcements/:id", adminUpdateAnnouncement);
adminAppHomeRoutes.post("/announcements/:id/retry", adminRetryAnnouncement);
adminAppHomeRoutes.delete("/announcements/:id", adminDeleteAnnouncement);
