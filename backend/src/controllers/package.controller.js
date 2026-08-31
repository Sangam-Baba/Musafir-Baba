import { Package } from "../models/Package.js";
import { Category } from "../models/Category.js";
import { Destination } from "../models/Destination.js";
import { Staff } from "../models/Staff.js";
import { Author } from "../models/Authors.js";
import mongoose from "mongoose";
const createPackage = async (req, res) => {
  try {
    const { title, destination, duration, batch } = req.body;
    if (!title || !destination || !duration || !batch)
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });

    if (req.body.author === "") req.body.author = null;

    if (req.user && req.user.role === "staff") {
      req.body.status = "draft";
      let staffName = "Unknown Staff";
      if (req.user.sub) {
        const staffObj = await Staff.findById(req.user.sub).select("name");
        if (staffObj) staffName = staffObj.name;
      }
      req.body.pendingUpdates = {
        data: { ...req.body },
        updatedBy: req.user.name || staffName,
        updatedAt: new Date(),
      };
    }

    const pkg = new Package({ ...req.body });
    await pkg.save();

    res.status(201).json({
      success: true,
      message: "Package created Successfully",
      data: pkg,
    });
  } catch (error) {
    console.log("package creation failed :", error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

const deletePackage = async (req, res) => {
  try {
    const deletedPkg = await Package.findByIdAndDelete(req.params.id);

    if (!deletedPkg) {
      return res
        .status(404)
        .json({ success: false, message: "Package not fouend" });
    }

    res.status(200).json({
      success: true,
      message: "Package Deleted Successfully",
    });
  } catch (error) {
    console.log("Deletion failed ", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const editPackage = async (req, res) => {
  try {
    if (req.body.author === "") req.body.author = null;

    if (req.user && req.user.role === "staff") {
      const existingPkg = await Package.findById(req.params.id);
      if (!existingPkg) {
        return res.status(404).json({ success: false, message: "Package not found" });
      }

      // Every staff edit to an existing package — draft or published — is
      // held for admin approval rather than written live. Previously this
      // only applied to already-published packages, so a staff edit to a
      // draft package went straight to live fields with no review step.
      let staffName = "Unknown Staff";
      if (req.user && req.user.sub) {
        const staffObj = await Staff.findById(req.user.sub).select("name");
        if (staffObj) {
          staffName = staffObj.name;
        }
      }

      existingPkg.pendingUpdates = {
        data: { ...req.body },
        updatedBy: req.user.name || staffName,
        updatedAt: new Date()
      };
      await existingPkg.save();

      return res.json({
        success: true,
        message: "Package edits saved as pending for admin approval",
        data: existingPkg,
      });
    }

    // Admin/superadmin direct edit. If this package currently has a
    // pending staff edit sitting on it, that snapshot was taken before
    // this edit and is now stale relative to the fields being saved here —
    // clear it so a later "Approve" can't silently resurrect the old,
    // pre-this-edit data over the admin's own changes. The frontend warns
    // the admin about this pending edit before letting the save proceed.
    const pkg = await Package.findByIdAndUpdate(
      req.params.id,
      { ...req.body, pendingUpdates: null },
      {
        new: true,
        runValidators: true,
      }
    );
    if (!pkg) {
      return res
        .status(404)
        .json({ success: false, message: " Package not found" });
    }

    res.json({
      success: true,
      message: "Package updated successfully",
      data: pkg,
    });
  } catch (error) {
    console.log("Package Editing failed ", error.message);
    res.status(500).json({ success: false, message: "Package Editing failed" });
  }
};

const approvePackageUpdates = async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) {
      return res.status(404).json({ success: false, message: "Package not found" });
    }

    // publish=true forces the package live regardless of its prior status
    // ("Approve & Publish"). Otherwise the approved edits are applied but
    // the package's status before this approval is preserved as-is
    // ("Approve" only — e.g. a draft stays a draft).
    const shouldPublish = req.body.publish === true;

    let updateData = {};
    if (pkg.pendingUpdates && pkg.pendingUpdates.data) {
      updateData = { ...pkg.pendingUpdates.data };
      if (!updateData.author || updateData.author === "") {
        const defaultAuthor = await Author.findOne({ name: /Abhishek Rai/i });
        updateData.author = defaultAuthor ? defaultAuthor._id : null;
      }
    }
    updateData.status = shouldPublish ? "published" : pkg.status;

    const updatedPkg = await Package.findByIdAndUpdate(
      req.params.id,
      { ...updateData, pendingUpdates: null },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: shouldPublish
        ? "Package approved and published successfully"
        : "Package changes approved successfully",
      data: updatedPkg,
    });
  } catch (error) {
    console.log("Package approval failed ", error.message);
    res.status(500).json({ success: false, message: "Package approval failed", error: error.message, stack: error.stack });
  }
};

const rejectPackageUpdates = async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) {
      return res.status(404).json({ success: false, message: "Package not found" });
    }

    const updatedPkg = await Package.findByIdAndUpdate(
      req.params.id,
      { pendingUpdates: null },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: "Package updates rejected successfully",
      data: updatedPkg,
    });
  } catch (error) {
    console.log("Package rejection failed ", error.message);
    res.status(500).json({ success: false, message: "Package rejection failed" });
  }
};

const getPackageBySlug = async (req, res) => {
  try {
    const pkg = await Package.findOne({
      slug: req.params.slug,
      status: "published",
    })
      .populate("destination", "_id name country state city slug coverImage")
      .populate("author", "name role about avatar")
      .lean();

    if (!pkg) {
      return res
        .status(404)
        .json({ success: false, message: "Package not found for this slug" });
    }

    if (!pkg.author) {
      const defaultAuthor = await Author.findOne({ name: /Abhishek Rai/i })
        .select("name role about avatar")
        .lean();
      if (defaultAuthor) {
        pkg.author = defaultAuthor;
      }
    }

    res.json({ success: true, data: pkg });
  } catch (error) {
    console.log("Package getting failed");
    res.status(500).json({ success: false, error: error.message });
  }
};

const getPackageById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid ID" });
    }
    const pkg = await Package.findById({ _id: id, status: "published" })
      .populate("destination", "_id name country state city slug coverImage")
      .populate("batch")
      .populate("author", "name role about avatar")
      .lean();

    if (!pkg) {
      return res
        .status(404)
        .json({ success: false, message: "Package not found" });
    }

    res.json({ success: true, data: pkg });
  } catch (error) {
    console.log("Package getting by ID failed");
    res.status(500).json({ success: false, error: error.message });
  }
};

const getAllPackages = async (req, res) => {
  try {
    const packages = await Package.find({ status: "published" })
      .select("_id title batch duration coverImage slug isFeatured status")
      .populate("batch")
      .populate("author", "name role about avatar")
      .lean();

    if (!packages)
      return res
        .status(404)
        .json({ success: false, message: "Sorry, Packages not found" });
    res.status(200).json({
      success: true,
      data: {
        packages,
      },
    });
  } catch (error) {
    console.log("Package getting failed ", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
const getPackages = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 200,
      destination,
      minDays,
      maxDays,
      category,
      search,
      slug,
      status = "published",
    } = req.query;

    const query = {};

    // ✅ Status filter
    if (status && status !== "all") query.status = status;
    if (slug) query.slug = slug;

    // ✅ Duration filter
    if (minDays || maxDays) {
      query["duration.days"] = {};
      if (minDays) query["duration.days"].$gte = Number(minDays);
      if (maxDays) query["duration.days"].$lte = Number(maxDays);
    }

    if (category) {
      const cat = await Category.findOne({ slug: category }).select("_id");
      if (!cat) {
        return res
          .status(404)
          .json({ success: false, message: "Category not found" });
      }
      query.mainCategory = cat._id;
    }

    if (destination) {
      // If you want to allow name/slug instead of ObjectId
      const dest = await Destination.findOne({
        $or: [
          { country: destination },
          { state: destination },
          { city: destination },
        ],
      }).select("_id");
      if (!dest) {
        return res
          .status(404)
          .json({ success: false, message: "Destination not found" });
      }
      query.destination = dest._id;
    }

    // ✅ Search filter (title or destination name/country/state/city) — the
    // admin UI's placeholder ("Search by name or destination") always
    // promised both, but this previously only matched title.
    if (search) {
      const matchingDestinations = await Destination.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { country: { $regex: search, $options: "i" } },
          { state: { $regex: search, $options: "i" } },
          { city: { $regex: search, $options: "i" } },
        ],
      }).select("_id");
      const searchOr = [{ title: { $regex: search, $options: "i" } }];
      if (matchingDestinations.length > 0) {
        searchOr.push({ destination: { $in: matchingDestinations.map((d) => d._id) } });
      }
      query.$and = [...(query.$and || []), { $or: searchOr }];
    }
    // console.log(query);
    // ✅ Query execution
    const packages = await Package.find(query)
      .populate(
        "destination",
        "name country state city slug coverImage gallery metaTitle metaDescription keywords",
      )
      .populate("batch")
      .populate("mainCategory", "_id name slug")
      .populate("author", "name role about avatar")
      .populate("reviews")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const { Author } = await import("../models/Authors.js");
    const defaultAuthor = await Author.findOne({ name: /Abhishek Rai/i })
      .select("name role about avatar")
      .lean();

    if (defaultAuthor) {
      packages.forEach(pkg => {
        if (!pkg.author) {
          pkg.author = defaultAuthor;
        }
      });
    }

    const total = await Package.countDocuments(query);

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: packages,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getPackageByCategorySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const { limit, minimal } = req.query;
    
    const category = await Category.findOne({ slug });
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    let query = Package.find({
      $and: [
        { status: "published" },
        {
          $or: [
            { mainCategory: category._id },
            { otherCategory: { $in: [category._id] } },
          ],
        },
      ],
    });

    if (minimal === "true") {
      query = query.select("_id title slug coverImage duration destination batch mainCategory");
    }

    query = query
      .populate("destination", "_id name country state city slug")
      .populate("batch")
      .populate("author", "name role about avatar")
      .populate("mainCategory", "name slug");

    if (limit) {
      query = query.limit(parseInt(limit, 10));
    }

    const packages = await query.lean();
    
    if (!packages) {
      return res
        .status(404)
        .json({ success: false, message: "Packages not found" });
    }

    const { Author } = await import("../models/Authors.js");
    const defaultAuthor = await Author.findOne({ name: /Abhishek Rai/i })
      .select("name role about avatar")
      .lean();

    if (defaultAuthor) {
      packages.forEach(pkg => {
        if (!pkg.author) {
          pkg.author = defaultAuthor;
        }
      });
    }

    res.json({ success: true, data: packages });
  } catch (error) {
    console.log("Package getting failed ", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
const getBestSeller = async (req, res) => {
  try {
    const bestSellers = await Package.find({
      isBestSeller: true,
      status: "published",
    })
      .populate("destination", "_id name country state")
      .populate("batch", "quad")
      .populate("mainCategory", "name slug")
      .populate("author", "name role about avatar")
      .select("title destination batch mainCategory slug coverImage ")
      .lean();

    if (!bestSellers)
      return res
        .status(404)
        .json({ success: false, message: "Sorry, Best Sellers not found" });

    res.status(200).json({
      success: true,
      data: bestSellers,
    });
  } catch (error) {
    console.log("Best Seller Package getting failed ", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
export {
  createPackage,
  deletePackage,
  editPackage,
  approvePackageUpdates,
  rejectPackageUpdates,
  getPackageBySlug,
  getPackages,
  getAllPackages,
  getPackageById,
  getBestSeller,
  getPackageByCategorySlug,
};
