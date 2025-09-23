import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
    blogId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Blog",
        required: true,
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
        default: null,
    },
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    text: {
        type: String,
        required: true,
    },
    rating: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });

export const Comment = mongoose.model("Comment", commentSchema);