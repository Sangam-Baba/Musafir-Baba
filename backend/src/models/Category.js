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
    packages:[{type:mongoose.Schema.Types.ObjectId, ref:"Package"}],
    coverImage:{
        url:String,
        alt:String,
        public_id:String,
        width:Number,
        height:Number
    },
    isActive:{
        type:Boolean,
        default:true,
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