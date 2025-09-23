import { Comment } from "../models/Comment.js";
import mongoose from "mongoose";
import { Blog } from "../models/Blog.js";

const createComment =async (req, res)=>{
    try {
        const {blogId, parentId, name, email, text, rating}= req.body;
        if(!name || !email || !text || !blogId) return res.status(400).json({success:false, message:"Required things missing"});
        if (blogId && !mongoose.Types.ObjectId.isValid(blogId)) return res.status(400).json({ success: false, message: "Invalid blog ID" });
        if (parentId && !mongoose.Types.ObjectId.isValid(parentId)) return res.status(400).json({ success: false, message: "Invalid parent ID" });
        const blog=await Blog.findById(blogId);
        if(!blog) return res.status(404).json({success:false, message:"Invalid Id"});
        if(!rating) rating=0;
        const comment=new Comment({name, email, text, rating, blogId, parentId});
        const newComment=await comment.save();
        blog.comments.push(newComment._id);
        await blog.save();
 
        res.status(200).json({success:true,message: "Blog Comment successful", data:newComment} );
    } catch (error) {
        console.log("Comment creation failed", error.message);
        res.status(500).json({success: false, message: "Server Error"});
    }
}

const getComments= async( req, res)=>{
 try {
      const { blogId } = req.params;

  const comments = await Comment.find({ blogId })
    .sort({ createdAt: -1 })
    .lean();

  // Build tree
  const map = {};
  comments.forEach(c => { map[c._id] = { ...c, replies: [] }; });

  const root = [];
  comments.forEach(c => {
    if (c.parentId) {
      map[c.parentId]?.replies.push(map[c._id]);
    } else {
      root.push(map[c._id]);
    }
  });

  res.json({ success: true, data: root });
 } catch (error) {
    console.log("Comment getting failed", error.message);
    res.status(500).json({success: false, message: "Server Error"});
 }
}

export {createComment , getComments}