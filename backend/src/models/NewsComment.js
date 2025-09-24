import mongoose from "mongoose";

const newsCommentSchema = new mongoose.Schema({
    newsId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "News",
        required: true,
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "NewsComment",
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

export const NewsComment = mongoose.model("NewsComment", newsCommentSchema);