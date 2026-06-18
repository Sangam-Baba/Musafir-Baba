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

export const globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(200).json({ success: true, data: [] });
    }

    const regex = new RegExp(q, "i");
    const limit = 5; // Fetch up to 5 per category to keep it blazing fast

    // Run parallel queries across all 11 models
    const [
      blogs,
      news,
      categories,
      packages,
      destinations,
      webpages,
      visas,
      customized,
      seo,
      vehicles,
      aboutus,
    ] = await Promise.all([
      Blog.find({ title: regex }).select("title slug").limit(limit).lean(),
      News.find({ title: regex }).select("title slug").limit(limit).lean(),
      Category.find({ name: regex }).select("name slug").limit(limit).lean(),
      Package.find({ title: regex })
        .populate("mainCategory", "slug")
        .populate("destination", "state")
        .select("title slug mainCategory destination")
        .limit(limit)
        .lean(),
      Destination.find({ name: regex }).select("name state").limit(limit).lean(),
      WebPage.find({ title: regex }).select("title fullSlug").limit(limit).lean(),
      Visa.find({ country: regex }).select("country slug").limit(limit).lean(),
      CustomizedTourPackage.find({ title: regex }).select("title slug").limit(limit).lean(),
      DestinationSeo.find({ title: regex })
        .populate("categoryId", "slug name")
        .populate("destinationId", "state name")
        .select("title categoryId destinationId")
        .limit(limit)
        .lean(),
      Vehicle.find({ title: regex }).populate("location", "name").select("title slug vehicleType location").limit(limit).lean(),
      AboutUs.find({ title: regex }).select("title").limit(limit).lean(),
    ]);

    let results = [];

    blogs.forEach((i) => results.push({ title: i.title, url: `/blog/${i.slug}`, type: "Blog" }));
    news.forEach((i) => results.push({ title: i.title, url: `/news/${i.slug}`, type: "News" }));
    categories.forEach((i) => results.push({ title: i.name, url: `/holidays/${i.slug}`, type: "Category" }));
    
    packages.forEach((i) => {
      if (i.mainCategory && i.destination) {
        results.push({
          title: i.title,
          url: `/holidays/${i.mainCategory.slug}/${i.destination.state}/${i.slug}`,
          type: "Package",
        });
      }
    });

    destinations.forEach((i) => results.push({ title: i.name, url: `/destinations/${i.state}`, type: "Destination" }));
    webpages.forEach((i) => results.push({ title: i.title, url: `/${i.fullSlug}`, type: "WebPage" }));
    visas.forEach((i) => results.push({ title: `${i.country} Visa`, url: `/visa/${i.slug}`, type: "Visa" }));
    customized.forEach((i) => results.push({ title: i.title, url: `/holidays/customised-tour-packages/${i.slug}`, type: "Customized Package" }));
    
    seo.forEach((i) => {
      if (i.destinationId && i.categoryId) {
        results.push({
          title: `${i.destinationId.name} - ${i.categoryId.name} (SEO)`,
          url: `/holidays/${i.categoryId.slug}/${i.destinationId.state}`,
          type: "SEO Page",
        });
      }
    });

    vehicles.forEach((i) => {
      const type = i.vehicleType?.toLowerCase() || 'other';
      const dest = i.location?.name?.toLowerCase().replace(/\s+/g, '-') || 'any';
      results.push({ title: i.title, url: `/rental/${type}/${dest}/${i.slug}`, type: "Vehicle" });
    });
    aboutus.forEach((i) => results.push({ title: i.title, url: `/about-us`, type: "About Us" }));

    // Shuffle slightly or sort by relevance? For now, we will sort alphabetically or just slice to top 15
    // since this is just a quick dropdown.
    results = results.slice(0, 15);

    return res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error("Global search error:", error);
    return res.status(500).json({ success: false, message: "Search failed" });
  }
};
