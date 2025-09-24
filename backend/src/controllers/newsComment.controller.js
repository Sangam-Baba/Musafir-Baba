import { NewsComment } from "../models/NewsComment.js";
import mongoose from "mongoose";
import { News } from "../models/News.js";

const createComment =async (req, res)=>{
    try {
        const {newsId, parentId, name, email, text, rating}= req.body;
        if(!name || !email || !text || !newsId) return res.status(400).json({success:false, message:"Required things missing"});
        if (newsId && !mongoose.Types.ObjectId.isValid(newsId)) return res.status(400).json({ success: false, message: "Invalid blog ID" });
        if (parentId && !mongoose.Types.ObjectId.isValid(parentId)) return res.status(400).json({ success: false, message: "Invalid parent ID" });
        const news=await News.findById(newsId);
        if(!news) return res.status(404).json({success:false, message:"Invalid Id"});
        if(!rating) rating=0;
        const comment=new NewsComment({name, email, text, rating, newsId, parentId});
        const newComment=await comment.save();
        news.comments.push(newComment._id);
        await news.save();
 
        res.status(200).json({success:true,message: "News Comment successful", data:newComment} );
    } catch (error) {
        console.log("Comment on news creation failed", error.message);
        res.status(500).json({success: false, message: "Server Error"});
    }
}

const getComments= async( req, res)=>{
 try {
      const { newsId } = req.params;

  const comments = await NewsComment.find({ newsId })
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
    console.log("News Comment getting failed", error.message);
    res.status(500).json({success: false, message: "Server Error"});
 }
}

export {createComment , getComments}