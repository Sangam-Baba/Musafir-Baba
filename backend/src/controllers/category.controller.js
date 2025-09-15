import { Category } from "../models/Category.js";
import { uploadToCloudinary } from "../services/fileUpload.service.js";
import { Package } from "../models/Package.js";
import mongoose, { model } from "mongoose";
import { Destination } from "../models/Destination.js";
const createCategory=async(req, res)=>{
    try {
        const {name,  description}=req.body;
        
        const isExist=await Category.findOne({name:name.trim()});
        if(isExist){
            return res.status(400).json({success:false, message:"Category with this name already exists"});
        }
        const category=new Category({name, description,  ...req.body});
        await category.save();

       res.status(201).json({success:true, message:"Category created successfully", data:category});
    } catch (error) {
        console.log("Unable to create category", error.message);
        res.status(500).json({success: false, message:"Server Error"})
    }
};

const getCategory=async(req, res)=>{
    try {
      const categories = await Category.find({ isActive: true })
      .sort({ createdAt: -1 }) 
      .lean(); 

      res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
      });      
    } catch (error) {
        console.log("All Category  getting failed  ", error.message);
        res.status(500).json({success:false, message:"Server Error"})
    }
}

const getCategoryById=async(req, res)=>{
      try {
        const {id}=req.params;

        if(!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({success:false, message:"Invalid"});


        const category=await Category.findById({_id:id})
        .select("name slug description coverImage packages isActive")
        .lean();
        
        if (!category) {
          return res.status(404).json({
          success: false,
         message: "Category not found",
          });
         }
     res.status(200).json({
       success: true,
       data: {
         category,
       },
     });

    } catch (error) {
        console.log("Category By Id getting failed ", error.message);
        res.status(500).json({success:false, message:"Server Error"})
    }
}

const getCategoryBySlug=async(req, res)=>{
    try {
        const {slug}=req.params;
        const category=await Category.findOne({slug:slug, isActive:true})
        .populate({path:"packages", 
          populate:{
            path:"destination",
            model:"Destination"
          },
        })
        .lean();
        
        if (!category) {
          return res.status(404).json({
          success: false,
         message: "Category not found",
          });
         }
     res.status(200).json({
       success: true,
       data: {
         category,
       },
     });

    } catch (error) {
        console.log("Category By Slug getting failed ", error.message);
        res.status(500).json({success:false, message:"Server Error"})
    }
}

const updateCategory = async (req, res) => {
  try {
    const { slug } = req.params;

    const category = await Category.findOne({ slug });
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // update fields only if provided
    category.name = req.body.name || category.name;
    category.description = req.body.description || category.description;
    category.coverImage = req.body.coverImage || category.coverImage;
    // category.isActive =
    //   req.body.isActive !== undefined ? req.body.isActive : category.isActive;

    await category.save();

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    category.isActive = false;
    await category.save();

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
export {createCategory, getCategory, getCategoryBySlug , updateCategory , deleteCategory , getCategoryById}