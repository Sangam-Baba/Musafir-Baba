import mongoose from "mongoose";
import { Footer } from "../models/footer.js";

const createFooter=async (req, res)=>{
    try {
        const { title, content}= req.body;
        if(!title || !content ){
            return res.status(400).json({success:false, message: "Required things missing"});
        }
        const footer= new Footer({...req.body});
        await footer.save();

        res.status(201).json({success:true, data:footer} );
    } catch (error) {
        console.log("Footer creation failed", error.message);
        res.status(500).json({success: false, message: "Server Error"});
    }
}

const getAllFooter = async( req, res)=>{
    try {
        const { filter = {}}= req.query;
        if(req.query?.title) filter.title = req.query.title;
        const footer= await Footer.find(filter);
        res.status(200).json({success:true, data:footer} );        
    } catch (error) {
        console.log("Footer getting failed", error.message);
        res.status(500).json({success: false, message: "Server Error"});
    }
}

const getFooterById= async (req, res)=>{
    try {
        const { id} = req.params;
        if(!id){
            return res.status(400).json({success:false, message: "Required things missing"});
        }
        if(!mongoose.Types.ObjectId.isValid(id)){
            return res.status(400).json({success:false, message: "Invalid Id"});
        }
        const footer= await Footer.findById(id);
        if(!footer){
            return res.status(404).json({success:false, message: "Footer not found"});
        }
        res.status(200).json({success:true, message:"Footer fetched successfully", data:footer});
    } catch (error) {
        console.log("Footer getting by Id failed", error.message);
        res.status(500).json({success: false, message: "Server Error"});
    }
}

const updateFooterById= async (req, res)=>{
    try {
        const { id}  = req.params;
        if(!id){
            return res.status(400).json({success:false, message: "Required things missing"});
        }
        if(!mongoose.Types.ObjectId.isValid(id)){
            return res.status(400).json({success:false, message: "Invalid Id"});
        }
        const footer= await Footer.findByIdAndUpdate(id, req.body, {new:true});
        if(!footer){
            return res.status(404).json({success:false, message: "Footer not found"});
        }
        res.status(200).json({success:true, message:"Footer updated successfully", data:footer});
        
    } catch (error) {
        console.log("Footer Update failed", error.message);
        res.status(500).json({success: false, message: "Server Error"});
    }
}

const deleteFooterById= async (req, res)=>{
    try {
        const { id}  = req.params;
        if(!id){
            return res.status(400).json({success:false, message: "Required things missing"});
        }
        if(!mongoose.Types.ObjectId.isValid(id)){
            return res.status(400).json({success:false, message: "Invalid Id"});
        }
        const footer= await Footer.findByIdAndDelete(id);
        if(!footer){
            return res.status(404).json({success:false, message: "Footer not found"});
        }
        else{
            res.status(200).json({success:true, message:"Footer deleted successfully", data:footer});
        }
    } catch (error) {
        console.log("Footer Delete failed", error.message);
        res.status(500).json({success: false, message: "Server Error"});
    }
}
export { createFooter  , getAllFooter, getFooterById, updateFooterById, deleteFooterById};