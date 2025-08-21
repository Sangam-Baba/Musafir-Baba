import { Category } from "../models/Category.js";

const createCategory=async(req, res)=>{
    try {
        const {name, image, description}=req.body;
        
        const isExist=await Category.findOne({name:name.trim()});
        if(isExist){
            return res.status(400).json({success:false, message:"Category with this name already exists"});
        }
        const category=new Category({name, description, image, createdBy:req.user.id});
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
        console.log("Category getting failed ", error.message);
        res.status(500).json({success:false, message:"Server Error"})
    }
}

const getCategoryBySlug=async(req, res)=>{
    try {
        const {slug}=req.params;
        const category=await Category.findOne({slug:slug, isActive:true})
        .select("name slug description image")
        .lean();
        
        if (!category) {
          return res.status(404).json({
          success: false,
         message: "Category not found",
          });
         }

        res.status(200).json({ success: true, data: category });

    } catch (error) {
        console.log("Category getting failed ", error.message);
        res.status(500).json({success:false, message:"Server Error"})
    }
}

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // update fields only if provided
    category.name = req.body.name || category.name;
    category.description = req.body.description || category.description;
    category.image = req.body.image || category.image;
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
export {createCategory, getCategory, getCategoryBySlug , updateCategory , deleteCategory}