import { Author } from "../models/Authors.js";

const createAuthor= async (req,res)=>{
    try {
        const { name, email, about, avatar, role  } = req.body;
        const isExist=await Author.findOne({email});
        if(isExist){
            return res.status(400).json({success:false, message:"Author with this email already exists"});
        }
        const author=await Author.create({name, email, about, avatar , role});
        res.status(201).json({success:true, message:"Author Created successfully", data:author}); 
    } catch (error) {
        console.log("Author created failed", error.message);
        res.status(500).json({success: false, message: "Server Error"});
    }
};  

const getAuthors= async (req, res)=>{
    try{
        const authors=await Author.find({});
        res.status(200).json({success:true, message:"Authors fetched successfully", data:authors});
    }
    catch(error){
        console.log("Author getting failed", error.message);
        res.status(500).json({success: false, message: "Server Error"});
    }
}
const getAuthorById=async (req, res)=>{
    try {
        const {id}= req.params;
        if(!id){
            return res.status(400).json({success:false, message:"Invalid Id"});
        }
        const author=await Author.findById(id);
        if(!author){
            return res.status(404).json({success:false, message:"Author not found"});
        }
        res.status(200).json({success:true, message:"Author fetched successfully", data:author});
    } catch (error) {
        console.log("Author getting failed", error.message);
        res.status(500).json({success: false, message: "Server Error"});
    }
}

const updateAuthor= async(req, res)=>{
try {
    const { id}= req.params;
    if(!id){
        return res.status(400).json({success:false, message:"Invalid Id"});
    }
    const author=await Author.findById(id);
    if(!author){
        return res.status(404).json({success:false, message:"Author not found"});
    }
    const { name, email, about, avatar, role  } = req.body;
   const newAuthor = await Author.findByIdAndUpdate(
  id,
  { name, email, about, avatar, role },
  { new: true, runValidators: true }
).lean();
    if(!newAuthor){

        return res.status(404).json({success:false, message:"Author not found"});
    }

    res.status(200).json({success:true, message:"Author Updated successfully", data:newAuthor});
} catch (error) {
    console.log("Author update failed", error.message);
    res.status(500).json({success: false, message: "Server Error"});
}
}

const deleteAuthor= async(req, res)=>{
    try {
        const {id}= req.params;
        if(!id){
            return res.status(400).json({success:false, message:"Invalid Id"});
        }
        const isExist=await Author.findById(id);
        if(!isExist){
            return res.status(404).json({success:false, message:"Author not found"});
        }
        const author=await Author.findByIdAndDelete(id);

        res.status(200).json({success:true, message:"Author Deleted successfully", data:author});
    } catch (error) {
        console.log("Author delition failed", error.message);
        res.status(500).json({success: false, message: "Server Error"});
    }
}

export {createAuthor  , getAuthors , deleteAuthor , updateAuthor , getAuthorById};