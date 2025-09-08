import mongoose, { modelNames } from "mongoose";
import slugify from "slugify";

const blogSchema=new mongoose.Schema({
    title:{
        type:String,
        required:true,
        trim:true,
        maxlength:[150, "Title must be less then 150 characters"],
    },
    slug:{
        type:String,
        unique:true,
        index:true,
    },
    content:{
        type:String,
        required:true,
    },
    excerpt:{
        type:String,
        maxlength:300,
    },
    coverImage:{
        url:String,
        alt:String,
        public_id:String,
        width:Number,
        height:Number
    },
    gallery:[{
        url:String,
        alt:String,
        public_id:String,
        width:Number,
        height:Number
    }],
    category:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Category",
    },
    author:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
    },
    tags:[String],
    metaTitle:{
        type:String,
        maxlength:60
    },
    metaDescription:{
        type:String,
        maxlength:160,
    },
    keywords: [
      {
        type: String,
      },
    ],
    canonicalUrl: {
      type: String,
    },
    schemaType: {
      type: String,
    },
    status:{
        type:String,
        enum:["draft", "published", "archived"],
        default:"draft",
    },
    views:{
        type:Number,
        default:0,
    },
    likes:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"User",
        },
    ],
    comments:[
        {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        text: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now },   
        }
    ]
},
{timestamps:true});

blogSchema.pre("save", function(next){
    if(this.isModified('title')){
        this.slug=slugify(this.title, {lower:true, strict:true});
    }
    next();
})

blogSchema.index({ title: "text", content: "text" }); // full-text
blogSchema.index({ tags: 1 }); // fast filtering

export const Blog=mongoose.model("Blog", blogSchema);