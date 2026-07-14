import { Media } from "../models/Media.js";
import { Blog } from "../models/Blog.js";
import { WebPage } from "../models/WebPage.js";
import { News } from "../models/News.js";
import { Package } from "../models/Package.js";

const createMedia = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res
        .status(400)
        .json({ success: false, message: "Required things missing" });
    }
    const media = new Media({ ...req.body });
    await media.save();
    res.status(201).json({ success: true, data: media });
  } catch (error) {
    console.log("Media creation failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const updateMedia = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const media = await Media.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!media) {
      return res.status(404).json({ success: false, message: "Invalid Id" });
    }
    res
      .status(200)
      .json({ success: true, message: "Update successful", data: media });
  } catch (error) {
    console.log("Media update failed", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

const getMediaById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const media = await Media.findById(id).lean();
    if (!media) {
      return res.status(404).json({ success: false, message: "Invalid Id" });
    }
    res.status(200).json({ success: true, data: media });
  } catch (error) {
    console.log("Media getting by id failed", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

const deleteMedia = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const media = await Media.findByIdAndDelete(id);
    if (!media) {
      return res.status(404).json({ success: false, message: "Invalid Id" });
    }
    res.status(200).json({
      success: true,
      message: "Media deleted successfully",
      data: media,
    });
  } catch (error) {
    console.log("Media delete failed", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

const getAllMedia = async (req, res) => {
  try {
    let allMedia;
    let pagination = null;

    const filter = {};
    if (req.query.search) {
      filter.$or = [
        { url: { $regex: req.query.search, $options: "i" } },
        { title: { $regex: req.query.search, $options: "i" } },
        { alt: { $regex: req.query.search, $options: "i" } },
      ];
    }

    if (req.query.usageFilter && req.query.usageFilter !== "All") {
      allMedia = await Media.find(filter).sort({ createdAt: -1 }).lean();

      const blogsString = JSON.stringify(await Blog.find().lean());
      const webPagesString = JSON.stringify(await WebPage.find().lean());
      const newsString = JSON.stringify(await News.find().lean());
      const packagesString = JSON.stringify(await Package.find().lean());

      allMedia.forEach((media) => {
        const usage = [];
        if (media.url) {
          if (blogsString.includes(media.url)) usage.push("Blog");
          if (webPagesString.includes(media.url)) usage.push("WebPage");
          if (newsString.includes(media.url)) usage.push("News");
          if (packagesString.includes(media.url)) usage.push("Package");
        }
        media.usage = usage;
      });

      if (req.query.usageFilter === "Unused") {
        allMedia = allMedia.filter((m) => !m.usage || m.usage.length === 0);
      } else {
        allMedia = allMedia.filter((m) => m.usage && m.usage.includes(req.query.usageFilter));
      }

      if (req.query.page && req.query.limit) {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const totalCount = allMedia.length;
        const paginated = allMedia.slice(skip, skip + limit);

        return res.status(200).json({
          success: true,
          data: paginated,
          pagination: {
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
          },
        });
      }

      return res.status(200).json({ success: true, data: allMedia });
    }

    if (req.query.page && req.query.limit) {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      allMedia = await Media.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
      const totalCount = await Media.countDocuments(filter);
      pagination = {
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
      };
    } else {
      allMedia = await Media.find(filter).sort({ createdAt: -1 }).lean();
    }

    if (req.query.withUsage === "true") {
      try {
        const blogsString = JSON.stringify(await Blog.find().lean());
        const webPagesString = JSON.stringify(await WebPage.find().lean());
        const newsString = JSON.stringify(await News.find().lean());
        const packagesString = JSON.stringify(await Package.find().lean());

        allMedia.forEach((media) => {
          const usage = [];
          if (media.url) {
            if (blogsString.includes(media.url)) usage.push("Blog");
            if (webPagesString.includes(media.url)) usage.push("WebPage");
            if (newsString.includes(media.url)) usage.push("News");
            if (packagesString.includes(media.url)) usage.push("Package");
          }
          media.usage = usage;
        });
      } catch (err) {
        console.log("Failed to check media usage", err.message);
      }
    }

    if (pagination) {
      return res.status(200).json({ success: true, data: allMedia, pagination });
    }

    res.status(200).json({ success: true, data: allMedia });
  } catch (error) {
    console.log("All Media getting failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export { createMedia, getAllMedia, getMediaById, updateMedia, deleteMedia };
