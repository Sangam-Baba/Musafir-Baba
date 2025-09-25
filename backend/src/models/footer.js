import mongoose from "mongoose";

const footerSchema = new mongoose.Schema({
   title:{
       type: String,
       required: true
   },
   content:[{
       text:String,
       url:String
   }]
}, { timestamps: true });

export const Footer = mongoose.model("Footer", footerSchema);