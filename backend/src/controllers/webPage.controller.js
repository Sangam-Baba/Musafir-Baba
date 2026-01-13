import mongoose from "mongoose";
import { WebPage } from "../models/WebPage.js";
import { Package } from "../models/Package.js";

const createWebPage = async (req, res) => {
  try {
    const { title, slug, content } = req.body;
    if (!title || !slug || !content) {
      return res
        .status(400)
        .json({ success: false, message: "Required things missing" });
    }
    const webpage = new WebPage({ ...req.body });
    await webpage.save();
    res.status(201).json({ success: true, data: webpage });
  } catch (error) {
    console.log("WebPage creation failed", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

const getWebPage = async (req, res) => {
  try {
    const { filter = {} } = req.query;
    if (req.query?.title) filter.title = req.query.title;
    if (req.query?.parent) {
      const parent = await WebPage.findOne({ slug: req.query.parent }).lean();
      if (!parent)
        return res
          .status(404)
          .json({ success: false, message: "Invalid Slug" });
      filter.parent = parent._id;
    }
    if (req.query?.status) filter.status = req.query.status;
    const webpage = await WebPage.find(filter)
      .sort({ createdAt: -1 })
      .populate("parent", "title slug")
      .select("-content -faqs")
      .lean();
    res.status(200).json({ success: true, data: webpage });
  } catch (error) {
    console.log("WebPage getting failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getWebPageBySlug = async (req, res) => {
  try {
    const fullSlug = req.query?.slug;
    if (!fullSlug)
      return res
        .status(404)
        .json({ success: false, message: "Invalid Slug h" });
    const webpage = await WebPage.findOne({
      fullSlug: fullSlug,
      status: "published",
    })
      .populate("reviews")
      .populate("parent", "title slug")
      .lean();
    if (!webpage)
      return res
        .status(404)
        .json({ success: false, message: "Invalid Slug h1" });
    // if (req.query?.parent && webpage.parent.slug !== req.query.parent)
    //   return res
    //     .status(404)
    //     .json({ success: false, message: "Invalid Slug h2" });
    // if (webpage?.parent && !req.query?.parent)
    //   return res
    //     .status(404)
    //     .json({ success: false, message: "Invalid Slug h3" });
    res.status(200).json({ success: true, data: webpage });
  } catch (error) {
    console.log("WebPage getting by slug failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getWebPageById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id);
    if (!id)
      return res.status(404).json({ success: false, message: "Invalid id" });
    const webpage = await WebPage.findById({ _id: id }).lean();
    if (!webpage)
      return res.status(404).json({ success: false, message: "Invalid id" });
    res.status(200).json({ success: true, data: webpage });
  } catch (error) {
    console.log("WebPage getting by id failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const updateWebPage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const webpage = await WebPage.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!webpage) {
      return res
        .status(404)
        .json({ success: false, message: "WebPage not found" });
    }
    res.status(200).json({
      success: true,
      message: "WebPage updated successfully",
      data: webpage,
    });
  } catch (error) {
    console.log("WebPage update failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const deleteWebPage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const webpage = await WebPage.findByIdAndDelete(id);
    if (!webpage) {
      return res
        .status(404)
        .json({ success: false, message: "WebPage not found" });
    }
    res.status(200).json({
      success: true,
      message: "WebPage deleted successfully",
      data: webpage,
    });
  } catch (error) {
    console.log("WebPage delete failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getRelatedPages = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug) {
      return res
        .status(400)
        .json({ success: false, message: "Page slug is required" });
    }

    const webpage = await WebPage.findOne({ slug: slug }).lean();
    if (!webpage) {
      return res
        .status(404)
        .json({ success: false, message: "Page not found" });
    }
    let related = [];
    const childs = await WebPage.find({
      parent: webpage._id,
      status: "published",
    })
      .select("title slug coverImage keywords excerpt createdAt fullSlug")
      .lean();
    related = [...childs];
    if (webpage.parent) {
      const sibling = await WebPage.find({
        parent: webpage.parent,
        status: "published",
      })
        .select("title slug coverImage keywords excerpt createdAt fullSlug")
        .lean();
      related = [...related, ...sibling];
    }

    const finalrelated = related
      .filter((page) => page._id !== webpage._id)
      .slice(0, 5);

    return res.status(200).json({ success: true, data: finalrelated });
  } catch (error) {
    console.error("Getting Related WebPages failed:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getRelatedPkgs = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug)
      return res.status(400).json({ message: "Missing required things" });
    const page = await WebPage.findOne({ slug: slug }).select("keywords");
    if (!page) return res.status(404).json({ message: "Invalid Slug" });

    const matcher = slug.split("-")[0];
    // console.log("this is matchweer ", matcher);
    let relatedPkgs = await Package.find({
      status: "published",
      title: { $regex: `\\b${matcher}\\b`, $options: "i" },
    })
      .populate("destination", "_id name country state")
      .populate("batch", "quad")
      .populate("mainCategory", "name slug")
      .select("title destination batch mainCategory slug coverImage ")
      .limit(5)
      .lean();

    if (relatedPkgs.length === 0) {
      relatedPkgs = await Package.find({
        status: "published",
      })
        .populate("destination", "_id name country state")
        .populate("batch", "quad")
        .populate("mainCategory", "name slug")
        .select("title destination batch mainCategory slug coverImage ")
        .limit(5)
        .lean();
    }
    res.status(200).json({
      message: "Successfully getting related pkgs",
      data: relatedPkgs,
    });
  } catch (error) {
    console.log("WebPage getting failed", error.message);
    res.status(500).json({ message: "Server Error " });
  }
};

const getAllParents = async (req, res) => {
  try {
    const parents = await WebPage.find({ isParent: true })
      .select("title slug")
      .lean();
    res.status(200).json({ success: true, data: parents });
  } catch (error) {
    console.log("Parents getting failed", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

export {
  createWebPage,
  getWebPage,
  getWebPageBySlug,
  updateWebPage,
  deleteWebPage,
  getWebPageById,
  getRelatedPages,
  getAllParents,
  getRelatedPkgs,
};
