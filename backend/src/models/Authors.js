import mongoose from "mongoose";
import slugify from "slugify";
const authorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    about: {
        type: String,
    },
    avatar: {
        url: String,
        public_id: String,
        width: Number,
        height: Number
    },
    slug:{
        type:String,
        unique:true,
    },
    role:{
        type:String,
        enum:["editor", "author"],
        default:"author",
    }
},
    {timestamps:true},
)


authorSchema.pre("save", function(next){
    if(this.isModified('name')){
        this.slug=slugify(this.name, {lower:true, strict:true});
    }
    next();
})
export const Author = mongoose.model("Author", authorSchema);