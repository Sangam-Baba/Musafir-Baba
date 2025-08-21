import mongoose from "mongoose"
import slugify from "slugify";
const categorySchema=new mongoose.Schema({
    name:{
        type:String,
        required:true,
        unique:true,
        trim:true,
        maxlength:[50, "Category name cannot exceed 50 character"],
    },
    description:{
        type:String,
        trim:true,
        maxlength:[200, "description cannot exceed 200 character"]
    },
    slug:{
        type:String,
        unique:true,
        index:true,
    },
    image:{
        type:String,
        default:null,
    },
    isActive:{
        type:Boolean,
        default:true,
    },
    createdBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },

},{
    timestamps:true
});

categorySchema.pre("save", function(next){
    if(this.isModified("name")){
        this.slug=slugify(this.name, { lower: true, strict: true });
    }
    next();
});

export const Category=mongoose.model('Category', categorySchema);