import { Package } from "../models/Package.js";
const createPackage=async(req, res)=>{
  try {
    const pkg=new Package(req.body);
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
      .populate("category", "name slug")
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
const getPackages = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      minPrice,
      maxPrice,
      city,
      state,
      country,
      minDays,
      maxDays,
      search,
      status = "published",
    } = req.query;

    const query = {};

    // ✅ Status filter
    if (status) query.status = status;

    // ✅ Category filter
    if (category) query.category = category;

    // ✅ Price filter (adult price)
    if (minPrice || maxPrice) {
      query["price.adult"] = {};
      if (minPrice) query["price.adult"].$gte = Number(minPrice);
      if (maxPrice) query["price.adult"].$lte = Number(maxPrice);
    }

    // ✅ Duration filter
    if (minDays || maxDays) {
      query["duration.days"] = {};
      if (minDays) query["duration.days"].$gte = Number(minDays);
      if (maxDays) query["duration.days"].$lte = Number(maxDays);
    }

    // ✅ Location filter
    if (city) query["destination.city"] = new RegExp(city, "i");
    if (state) query["destination.state"] = new RegExp(state, "i");
    if (country) query["destination.country"] = new RegExp(country, "i");

    // ✅ Search filter (title or description)
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // ✅ Query execution
    const packages = await Package.find(query)
      .populate("category", "name slug") // populate category details
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
export { createPackage , deletePackage, editPackage, getPackageBySlug}