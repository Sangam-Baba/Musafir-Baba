import mongoose, { mongo } from "mongoose";
import {Blog} from "../models/Blog.js";
import { uploadToCloudinary } from "../services/fileUpload.service.js";
const createBlog=async(req, res)=>{
    try {
        const {title, content}= req.body;
        if(!title || !content ){
            return res.status(400).json({success:false, message: "Required things missing"});
        }

        if (req.body.category && !mongoose.Types.ObjectId.isValid(req.body.category)) {
        return res.status(400).json({ success: false, message: "Invalid category ID" });
        }
        let coverImage=null;
        if(req.files.coverImage){
          const result=await uploadToCloudinary(req.files.coverImage[0].buffer , "blog/coverImage");
          coverImage=result.sucure_url;
        }
        const blog=new Blog({...req.body, coverImage});
        await blog.save();

        res.status(201).json({success:true, data:blog} );
    } catch (error) {
        console.log("Blog creation failed", error.message);
        res.status(500).json({success: false, message: "Server Error"});
    }
}

const updateBlog=async(req, res)=>{
    try {
        const { id }= req.params;
        const blog=await Blog.findByIdAndUpdate(id, req.body,{
            new:true,
            runValidators:true,
        });

        if(!blog) return res.status(404).json({success:false, message:"Invalid Id"});
 
        res.status(200).json({success:true,message: "Update successful", data:blog} );
    } catch (error) {
       console.log("Blog Update failed", error.message);
        res.status(500).json({success: false, message: "Server Error"}); 
    }
}

const deleteBlog=async(req, res)=>{
    try {
        const { id }= req.params;

        const blog=await Blog.findByIdAndDelete(id);

        if(!blog) return res.status(404).json({success:false, message:"Invalid Id"});
 
        res.status(200).json({success:true,message: "Blog Delete successful", data:blog} );
    } catch (error) {
        console.log("Blog delition failed", error.message);
        res.status(500).json({success: false, message: "Server Error"});
    }
}

const getBlogBySlug=async(req,res)=>{
    try {
        const { slug } = req.params;

        const blog = await Blog.findOne({slug})
        .populate("category", "name slug")
        .populate("author", "name slug")
        .lean();

        if(!blog) return res.status(404).json({success:false, message:"Invalid Slug"});
 
        res.status(200).json({success:true,message: "Blog fetched successfully", data:blog} );
    } catch (error) {
        console.log("Blog getting failed", error.message);
        res.status(500).json({success: false, message: "Server Error"});
    }
}

const getAllBlog=async(req, res)=>{
    try {
        const { title, search}=req.query;
        const page=Math.max(parseInt(req.query.page || '1') , 1);
        const limit=Math.min(parseInt(req.query.limit || '20'), 25);
        const skip=(page -1)*limit;

        const filter={};

        if(title) filter.title=req.query.title;
        if (search) {
         filter.$or = [
          { title: { $regex: search, $options: "i" } },
          { content: { $regex: search, $options: "i" } },
          { tags: { $regex: search, $options: "i" } },
          ];
        }

         const total =await Blog.countDocuments(filter);
        const blogs =await Blog.find(filter)
        .select("title content coverImage slug")
        .sort({createdAt:-1})        
        .limit(limit)
        .skip(skip)
        .lean();

        res.status(200).json({success: true, message:"Blogs fetch successfully", data:blogs, total, page, pages:Math.ceil(total / limit), });
    } catch (error) {
        console.log("Blog getting failed", error.message);
        res.status(500).json({success: false, message: "Server Error"});
    }
}
export {createBlog, updateBlog, deleteBlog , getBlogBySlug, getAllBlog};