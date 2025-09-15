import mongoose from "mongoose";

const authorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
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
        type: String,
    },
    role:{
        type:String,
        enum:["editor", "author"],
        default:"author",
    }
},
    {timestamps:true},
)

export const Author = mongoose.model("Author", authorSchema);