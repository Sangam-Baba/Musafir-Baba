import fs from "fs/promises";
import os from "os";
import path from "path";
import { Media } from "../models/Media.js";
import { Blog } from "../models/Blog.js";
import { WebPage } from "../models/WebPage.js";
import { News } from "../models/News.js";
import { Package } from "../models/Package.js";
import { Category } from "../models/Category.js";
import { Destination } from "../models/Destination.js";

// Media usage is found by searching the serialised text of every Blog, WebPage,
// News and Package. Downloading those collections is slow, so a copy is kept in
// memory and on disk. A check only fetches documents changed since the last one
// and drops deleted ones. A full reload runs in the background now and then to
// catch anything an incremental check could miss (e.g. edits without updatedAt).
const USAGE_FRESH_MS = 10 * 1000; // a copy verified this recently is "fresh"
const USAGE_WAIT_MS = 5 * 1000; // longest a click waits for a verification
const USAGE_RECONCILE_MS = 6 * 60 * 60 * 1000;
const USAGE_CACHE_FILE = path.join(os.tmpdir(), "mb-media-usage-cache-v2.json");
const USAGE_LEGACY_CACHE_FILE = path.join(os.tmpdir(), "mb-media-usage-cache.json");

const usageCollections = [
  { type: "Blog", model: Blog, toPath: (d) => (d.slug ? `/blog/${d.slug}` : null) },
  { type: "WebPage", model: WebPage, toPath: (d) => (d.fullSlug ? `/${d.fullSlug}` : null) },
  { type: "News", model: News, toPath: (d) => (d.slug ? `/news/${d.slug}` : null) },
  { type: "Package", model: Package, toPath: (d) => d.canonicalUrl || null },
];

// verifiedAt: when this collection was last successfully checked (0 = not yet
// in this process). docs: id -> { type, title, status, path, str, updatedAt }.
const usageState = {};
usageCollections.forEach((c) => {
  usageState[c.type] = { docs: new Map(), max: 0, verifiedAt: 0 };
});
let usageInit = null;
let usageSyncing = null;
let usageReconciling = null;

const logUsageError = (label) => (err) => console.log(label, err.message);

const loadUsageFromDisk = async () => {
  try {
    const saved = JSON.parse(await fs.readFile(USAGE_CACHE_FILE, "utf8"));
    usageCollections.forEach((c) => {
      if (!saved[c.type]) return;
      usageState[c.type].docs = new Map(saved[c.type].docs);
      usageState[c.type].max = saved[c.type].max;
    });
  } catch {
    // No usable cache file yet; the first sync will build it.
  }
  fs.unlink(USAGE_LEGACY_CACHE_FILE).catch(() => {});
};

// Saves are queued one after another; each writes the newest state at that moment.
let usageSaveChain = Promise.resolve();
const saveUsageToDisk = () => {
  usageSaveChain = usageSaveChain.then(async () => {
    try {
      const out = {};
      usageCollections.forEach((c) => {
        out[c.type] = { max: usageState[c.type].max, docs: [...usageState[c.type].docs] };
      });
      const tmp = `${USAGE_CACHE_FILE}.${process.pid}.${Date.now()}`;
      await fs.writeFile(tmp, JSON.stringify(out), { mode: 0o600 });
      await fs.rename(tmp, USAGE_CACHE_FILE);
    } catch (err) {
      console.log("Failed to save media usage cache", err.message);
    }
  });
  return usageSaveChain;
};

const initUsage = () => {
  if (!usageInit) {
    usageInit = loadUsageFromDisk().then(() => {
      setInterval(() => {
        runUsageReconcile().catch(logUsageError("Media usage full recheck failed"));
      }, USAGE_RECONCILE_MS).unref();
    });
  }
  return usageInit;
};

// Turns fetched documents into cache entries (id -> entry).
const buildUsageEntries = async (c, docs) => {
  const entries = new Map();
  docs.forEach((d) => {
    entries.set(String(d._id), {
      type: c.type,
      title: d.title || "",
      status: d.status || "",
      path: c.toPath(d),
      str: JSON.stringify(d),
      updatedAt: d.updatedAt ? new Date(d.updatedAt).getTime() : 0,
    });
  });

  if (c.type === "Package") {
    // Packages saved without a canonicalUrl get the same URL the model would build.
    const missing = docs.filter((d) => !d.canonicalUrl && d.mainCategory && d.destination && d.slug);
    if (missing.length) {
      const [cats, dests] = await Promise.all([
        Category.find({ _id: { $in: missing.map((d) => d.mainCategory) } }).select("slug").lean(),
        Destination.find({ _id: { $in: missing.map((d) => d.destination) } }).select("slug").lean(),
      ]);
      const catSlug = new Map(cats.map((x) => [String(x._id), x.slug]));
      const destSlug = new Map(dests.map((x) => [String(x._id), x.slug]));
      missing.forEach((d) => {
        const cs = catSlug.get(String(d.mainCategory));
        const ds = destSlug.get(String(d.destination));
        if (cs && ds) entries.get(String(d._id)).path = `/holidays/${cs}/${ds}/${d.slug}`;
      });
    }
  }
  return entries;
};

// Applies fetched entries to a collection's copy. Contains no awaits, so it
// cannot interleave with another sync.
const applyUsageEntries = (st, entries) => {
  let dirty = false;
  entries.forEach((entry, id) => {
    const existing = st.docs.get(id);
    if (existing && (existing.updatedAt || 0) > entry.updatedAt) return; // keep the newer copy
    if (!existing || existing.str !== entry.str || existing.path !== entry.path) dirty = true;
    st.docs.set(id, entry);
    if (entry.updatedAt > st.max) st.max = entry.updatedAt;
  });
  return dirty;
};

// Quick check: fetch only what changed since last time, drop what was deleted.
const syncUsageCollection = async (c) => {
  const st = usageState[c.type];
  const startedAt = Date.now();
  const [ids, changed] = await Promise.all([
    c.model.find().select("_id").lean(),
    st.docs.size > 0
      ? c.model.find({ updatedAt: { $gte: new Date(st.max) } }).lean()
      : c.model.find().lean(),
  ]);
  const entries = await buildUsageEntries(c, changed);
  let dirty = applyUsageEntries(st, entries);
  const live = new Set(ids.map((i) => String(i._id)));
  [...st.docs.keys()].forEach((id) => {
    if (!live.has(id)) {
      st.docs.delete(id);
      dirty = true;
    }
  });
  st.verifiedAt = startedAt;
  if (dirty) saveUsageToDisk();
  return dirty;
};

// Full reload: re-reads everything. Slow, so it only ever runs in the background.
const reconcileUsageCollection = async (c) => {
  const st = usageState[c.type];
  const startIds = new Set(st.docs.keys());
  const docs = await c.model.find().lean();
  const entries = await buildUsageEntries(c, docs);
  let dirty = applyUsageEntries(st, entries);
  startIds.forEach((id) => {
    // Only drop what we already had; anything added meanwhile is kept.
    if (!entries.has(id)) {
      st.docs.delete(id);
      dirty = true;
    }
  });
  if (dirty) saveUsageToDisk();
  return dirty;
};

const runInParallel = async (fn) => {
  const results = await Promise.allSettled(usageCollections.map(fn));
  const failed = results.find((r) => r.status === "rejected");
  if (failed) throw failed.reason; // other collections were still recorded
};

// One check at a time; callers arriving meanwhile share it. Always .catch() the result.
const runUsageSync = () => {
  if (!usageSyncing) {
    usageSyncing = runInParallel(syncUsageCollection).finally(() => {
      usageSyncing = null;
    });
  }
  return usageSyncing;
};

const runUsageReconcile = () => {
  if (!usageReconciling) {
    usageReconciling = runInParallel(reconcileUsageCollection).finally(() => {
      usageReconciling = null;
    });
  }
  return usageReconciling;
};

const getUsageSources = async () => {
  await initUsage();
  await runUsageSync();
  return usageCollections.flatMap((c) => [...usageState[c.type].docs.values()]);
};

// Starts building the copy in the background (called once at boot).
const warmUsageIndex = () =>
  initUsage()
    .then(() => runUsageSync())
    .catch(logUsageError("Media usage warm-up failed"));

const isUsageFresh = () =>
  usageCollections.every((c) => Date.now() - usageState[c.type].verifiedAt < USAGE_FRESH_MS);

const matchUsage = (url) => {
  const usage = [];
  const usageDetails = [];
  if (url) {
    usageCollections.forEach((c) => {
      usageState[c.type].docs.forEach((src) => {
        if (src.str.includes(url)) {
          if (!usage.includes(src.type)) usage.push(src.type);
          usageDetails.push({ type: src.type, title: src.title, status: src.status, path: src.path });
        }
      });
    });
  }
  return { usage, usageDetails };
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

// "Used" is answered straight from the saved copy. "Unused" is only answered
// when the copy was verified just now; otherwise the answer is "verifying".
const getMediaUsage = async (req, res) => {
  try {
    const media = await Media.findById(req.params.id).select("url").lean();
    if (!media) {
      return res.status(404).json({ success: false, message: "Invalid Id" });
    }
    await initUsage();
    let result = matchUsage(media.url);
    let fresh = isUsageFresh();
    if (!fresh) {
      const sync = runUsageSync().catch(logUsageError("Media usage sync failed"));
      if (result.usageDetails.length === 0) {
        let timer;
        await Promise.race([
          sync,
          new Promise((resolve) => {
            timer = setTimeout(resolve, USAGE_WAIT_MS);
          }),
        ]);
        clearTimeout(timer);
        result = matchUsage(media.url);
        fresh = isUsageFresh();
      }
    }
    const states = usageCollections.map((c) => usageState[c.type]);
    const verified = states.every((st) => st.verifiedAt > 0);
    res.status(200).json({
      success: true,
      data: {
        ...result,
        status: result.usageDetails.length > 0 ? "used" : fresh ? "unused" : "verifying",
        fresh,
        pendingSections: usageCollections
          .filter((c) => usageState[c.type].verifiedAt === 0)
          .map((c) => c.type),
        lastVerified: verified
          ? new Date(Math.min(...states.map((st) => st.verifiedAt))).toISOString()
          : null,
        reconciling: !!usageReconciling,
      },
    });
  } catch (error) {
    console.log("Media usage getting failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Starts a full background reload of the usage copy; does not wait for it.
const refreshMediaUsage = async (req, res) => {
  try {
    await initUsage();
    runUsageReconcile().catch(logUsageError("Media usage full recheck failed"));
    res.status(202).json({ success: true, message: "Full recheck started" });
  } catch (error) {
    console.log("Media usage refresh failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getAllMedia = async (req, res) => {
  try {
    let allMedia;
    let pagination = null;

    // Optional: build the usage cache in the background so per-image lookups are fast.
    if (req.query.prefetchUsage === "true") warmUsageIndex();

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

export { createMedia, getAllMedia, getMediaUsage, refreshMediaUsage, warmUsageIndex, getMediaById, updateMedia, deleteMedia };
