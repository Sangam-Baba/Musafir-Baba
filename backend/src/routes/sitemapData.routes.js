import { Router } from "express";
import { getSitemapSourceData } from "../controllers/sitemapData.controller.js";

const sitemapDataRoutes = Router();

// Same access posture as the 11 existing list endpoints this replaces for
// the admin Sitemap Management page (getAllBlog, getPackages, etc.) — all
// public GET reads with no auth middleware; the page itself is gated
// client-side via AdminProtected.
sitemapDataRoutes.get("/", getSitemapSourceData);

export default sitemapDataRoutes;
