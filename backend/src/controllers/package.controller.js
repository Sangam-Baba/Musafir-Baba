import { Package } from "../models/Package.js";
import { uploadToCloudinary } from "../services/fileUpload.service.js";
import { Category } from "../models/Category.js";
import { Destination } from "../models/Destination.js";
import mongoose from "mongoose";
const createPackage=async(req, res)=>{
  try {
    const {title, destination, duration, batch}=req.body;
    if(!title || !destination || !duration || !batch) return res.status(400).json({success:false, message:"All fields are required"});
    const pkg=new Package({...req.body });
    await pkg.save();
    
    res.status(201).json({
        success:true,
        message:"Package created Successfully",
        data:pkg,
    });
    
  } catch (error) {
    console.log("package creation failed :", error.message);
    return res.status(500).json({success: false,message:"Server Error"})
  }
}

const  deletePackage=async(req, res)=>{
    try {
        const deletedPkg=await Package.findByIdAndDelete(req.params.id);

        if(!deletedPkg){
            return res.status(404).json({success:false, message: "Package not fouend"})
        }

        res.status(200).json({
            success:true,
            message:"Package Deleted Successfully"
        })
    } catch (error) {
        console.log("Deletion failed ", error.message);
        res.status(500).json({success: false, message:"Server error"})
    }
}

const editPackage= async(req, res)=>{
    try {
        const pkg=await Package.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true, 
        });
        if(!pkg){
            return res.status(404).json({success: false, message: " Package not found"});
        }

        res.json({ success: true, message: "Package updated successfully", data: pkg });
    } catch (error) {
        console.log("Package Editing failed ", error.message);
        res.status(500).json({success:false, message: "Package Editing failed"})
    }
}

const getPackageBySlug = async (req, res) => {
  try {
    const pkg = await Package.findOne({ slug: req.params.slug, status: "published" })
      .populate("destination", "_id name country state city slug coverImage")
      .lean();

    if (!pkg) {
      return res.status(404).json({ success: false, message: "Package not found" });
    }

    res.json({ success: true, data: pkg });
  } catch (error) {
    console.log("Package getting failed")
    res.status(500).json({ success: false, error: error.message });
  }
};

const getPackageById = async (req, res) => {
  try {
    const {id}= req.params;
    if(!mongoose.Types.ObjectId.isValid(id)){
      return res.status(400).json({ success: false, error: "Invalid ID" });
    }
    const pkg = await Package.findById({ _id: id, status: "published" })
      .populate("destination", "_id name country state city slug coverImage")
      .lean();

    if (!pkg) {
      return res.status(404).json({ success: false, message: "Package not found" });
    }

    res.json({ success: true, data: pkg });
  } catch (error) {
    console.log("Package getting by ID failed")
    res.status(500).json({ success: false, error: error.message });
  }
};

const getAllPackages = async (req, res) => {
   try{
    const packages= await Package.find({status:"published"}).select("_id title batch duration coverImage slug isFeatured status").lean();

    if(!packages) return res.status(404).json({success:false, message:"Sorry, Packages not found"});
    res.status(200).json({
      success: true,
      data: {
        packages,
      },
    });
   } catch (error) {
    console.log("Package getting failed ", error.message);
    res.status(500).json({success:false, message:"Server Error"})
   }
}
const getPackages = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      destination,
      minDays,
      maxDays,
      search,
      status = "published",
    } = req.query;

    const query = {};

    // ✅ Status filter
    if (status) query.status = status;

    // // ✅ Price filter (adult price)
    // if (minPrice || maxPrice) {
    //   query["batch.adult"] = {};
    //   if (minPrice) query["price.adult"].$gte = Number(minPrice);
    //   if (maxPrice) query["price.adult"].$lte = Number(maxPrice);
    // }

    // ✅ Duration filter
    if (minDays || maxDays) {
      query["duration.days"] = {};
      if (minDays) query["duration.days"].$gte = Number(minDays);
      if (maxDays) query["duration.days"].$lte = Number(maxDays);
    }

    if (destination) {
      // If you want to allow name/slug instead of ObjectId
      const dest = await Destination.findOne({
        $or: [ { country: destination }, { state: destination }, { city: destination }],
      }).select("_id");
      if (!dest) {
        return res.status(404).json({ success: false, message: "Destination not found" });
      }
       query.destination = dest._id;
    }

    // ✅ Search filter (title or description)
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    console.log(query);
    // ✅ Query execution
    const packages = await Package.find(query)
      .populate("destination", "name country state city slug coverImage") // populate category details
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

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
export { createPackage , deletePackage, editPackage, getPackageBySlug, getPackages ,getAllPackages , getPackageById}