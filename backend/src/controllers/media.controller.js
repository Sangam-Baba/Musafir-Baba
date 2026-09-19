import fs from "fs/promises";
import os from "os";
import path from "path";
import { Media } from "../models/Media.js";
import { Blog } from "../models/Blog.js";
import { WebPage } from "../models/WebPage.js";
import { News } from "../models/News.js";
import { Package } from "../models/Package.js";

// Media usage is found by searching the serialised text of every Blog, WebPage,
// News and Package. Downloading those collections is slow, so a copy is kept in
// memory and on disk. Each check then only fetches documents changed since the
// last check and drops deleted ones, instead of re-downloading everything.
const usageCollections = [
  { type: "Blog", model: Blog, toPath: (d) => (d.slug ? `/blog/${d.slug}` : null) },
  { type: "WebPage", model: WebPage, toPath: (d) => (d.fullSlug ? `/${d.fullSlug}` : null) },
  { type: "News", model: News, toPath: (d) => (d.slug ? `/news/${d.slug}` : null) },
  { type: "Package", model: Package, toPath: (d) => d.canonicalUrl || null },
];
const USAGE_CACHE_FILE = path.join(os.tmpdir(), "mb-media-usage-cache.json");

const usageState = {}; // type -> { docs: Map<id, entry>, max: latest updatedAt (ms) }
usageCollections.forEach((c) => {
  usageState[c.type] = { docs: new Map(), max: 0 };
});
let usageDiskLoaded = false;
let usageSyncing = null;

const loadUsageFromDisk = async () => {
  try {
    const saved = JSON.parse(await fs.readFile(USAGE_CACHE_FILE, "utf8"));
    usageCollections.forEach((c) => {
      if (!saved[c.type]) return;
      usageState[c.type] = { docs: new Map(saved[c.type].docs), max: saved[c.type].max };
    });
  } catch {
    // No usable cache file yet; the first sync will build it.
  }
};

const saveUsageToDisk = async () => {
  try {
    const out = {};
    usageCollections.forEach((c) => {
      out[c.type] = { max: usageState[c.type].max, docs: [...usageState[c.type].docs] };
    });
    await fs.writeFile(USAGE_CACHE_FILE, JSON.stringify(out));
  } catch (err) {
    console.log("Failed to save media usage cache", err.message);
  }
};

const syncUsageCollection = async (c) => {
  const st = usageState[c.type];
  const [ids, changed] = await Promise.all([
    c.model.find().select("_id").lean(),
    st.docs.size > 0
      ? c.model.find({ updatedAt: { $gte: new Date(st.max) } }).lean()
      : c.model.find().lean(),
  ]);
  let dirty = false;
  changed.forEach((d) => {
    const entry = {
      type: c.type,
      title: d.title || "",
      status: d.status || "",
      path: c.toPath(d),
      str: JSON.stringify(d),
    };
    const id = String(d._id);
    if (st.docs.get(id)?.str !== entry.str) dirty = true;
    st.docs.set(id, entry);
    const updated = d.updatedAt ? new Date(d.updatedAt).getTime() : 0;
    if (updated > st.max) st.max = updated;
  });
  const live = new Set(ids.map((i) => String(i._id)));
  [...st.docs.keys()].forEach((id) => {
    if (!live.has(id)) {
      st.docs.delete(id);
      dirty = true;
    }
  });
  return dirty;
};

const getUsageSources = async () => {
  if (!usageDiskLoaded) {
    usageDiskLoaded = true;
    await loadUsageFromDisk();
  }
  if (!usageSyncing) {
    usageSyncing = Promise.all(usageCollections.map(syncUsageCollection))
      .then((dirty) => {
        if (dirty.some(Boolean)) saveUsageToDisk();
      })
      .finally(() => {
        usageSyncing = null;
      });
  }
  await usageSyncing;
  return usageCollections.flatMap((c) => [...usageState[c.type].docs.values()]);
};

// Sets media.usage (type names, as before) and media.usageDetails (each page using it).
const attachUsage = async (mediaList) => {
  const sources = await getUsageSources();
  mediaList.forEach((media) => {
    const usage = [];
    const usageDetails = [];
    if (media.url) {
      sources.forEach((src) => {
        if (src.str.includes(media.url)) {
          if (!usage.includes(src.type)) usage.push(src.type);
          usageDetails.push({
            type: src.type,
            title: src.title,
            status: src.status,
            path: src.path,
          });
        }
      });
    }
    media.usage = usage;
    media.usageDetails = usageDetails;
  });
};

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

const getMediaUsage = async (req, res) => {
  try {
    const media = await Media.findById(req.params.id).select("url").lean();
    if (!media) {
      return res.status(404).json({ success: false, message: "Invalid Id" });
    }
    await attachUsage([media]);
    res.status(200).json({
      success: true,
      data: { usage: media.usage, usageDetails: media.usageDetails },
    });
  } catch (error) {
    console.log("Media usage getting failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getAllMedia = async (req, res) => {
  try {
    let allMedia;
    let pagination = null;

    // Optional: build the usage cache in the background so per-image lookups are fast.
    if (req.query.prefetchUsage === "true") getUsageSources().catch(() => {});

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

      await attachUsage(allMedia);

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
        await attachUsage(allMedia);
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

export { createMedia, getAllMedia, getMediaUsage, getMediaById, updateMedia, deleteMedia };
