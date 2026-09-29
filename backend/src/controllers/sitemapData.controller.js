import { Blog } from "../models/Blog.js";
import { News } from "../models/News.js";
import { Category } from "../models/Category.js";
import { Package } from "../models/Package.js";
import { Destination } from "../models/Destination.js";
import { WebPage } from "../models/WebPage.js";
import { Visa } from "../models/Visa.js";
import { CustomizedTourPackage } from "../models/CustomizedTourPackage.js";
import { DestinationSeo } from "../models/Destination-Seo.js";
import { Vehicle } from "../models/Vehicle.js";
import { AboutUs } from "../models/About-us.js";

// Purpose-built for the admin Sitemap Management page only. The sitemap
// previously reused the existing admin list endpoints (getAllBlog,
// getPackages, etc.), each of which fetches full documents (heavy
// populates, no field projection, some with an extra redundant author
// lookup) since they're built for their own CRUD admin pages, not a
// lightweight title/url/date listing. Fetching all of that just to read a
// handful of fields, across 11 collections, was the actual cause of the
// page being slow. This endpoint selects only what the sitemap renders
// (title/name, slug, meta fields, dates, and the 1-2 populated sub-fields
// needed to build each item's URL) and is used nowhere else, so none of
// the existing admin list endpoints or the pages that depend on them are
// touched.
export const getSitemapSourceData = async (req, res) => {
  try {
    const metaFields = "metaTitle metaDescription keywords createdAt updatedAt";

    const [
      blogs,
      news,
      catRes,
      packages,
      destinations,
      webpages,
      visas,
      customized,
      seo,
      vehicles,
      aboutus,
    ] = await Promise.all([
      Blog.find({})
        .select(`title slug excerpt author ${metaFields}`)
        .populate("author", "name")
        .lean(),
      News.find({})
        .select(`title slug excerpt author ${metaFields}`)
        .populate("author", "name")
        .lean(),
      Category.find({}).select(`name slug ${metaFields}`).lean(),
      Package.find({})
        .select(`title slug destination mainCategory author ${metaFields}`)
        .populate("destination", "state")
        .populate("mainCategory", "slug")
        .populate("author", "name")
        .lean(),
      Destination.find({}).select(`name state ${metaFields}`).lean(),
      WebPage.find({})
        .select(`title fullSlug author ${metaFields}`)
        .populate("author", "name")
        .lean(),
      Visa.find({})
        .select(`title slug country excerpt author ${metaFields}`)
        .populate("author", "name")
        .lean(),
      CustomizedTourPackage.find({})
        .select(`title slug author ${metaFields}`)
        .populate("author", "name")
        .lean(),
      DestinationSeo.find({})
        .select(`destinationId categoryId excerpt ${metaFields}`)
        .populate("destinationId", "name state")
        .populate("categoryId", "name slug")
        .lean(),
      Vehicle.find({})
        .select(`title slug vehicleType location author ${metaFields}`)
        .populate("location", "name")
        .populate("author", "name")
        .lean(),
      AboutUs.find({}).select(`title ${metaFields}`).lean(),
    ]);

    res.status(200).json({
      success: true,
      blogs: { data: blogs },
      news: { data: news },
      catRes: { data: catRes },
      packages: { data: packages },
      destinations: { data: destinations },
      webpages: { data: webpages },
      visas: { data: visas },
      customized: { data: customized },
      seo: { data: seo },
      vehicles: { data: vehicles },
      aboutus: { data: aboutus },
    });
  } catch (error) {
    console.error("Get Sitemap Source Data Error:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
