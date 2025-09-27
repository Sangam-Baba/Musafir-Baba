import mongoose from "mongoose";

const itineraySchema= new mongoose.Schema({
    email:{
        type: String,
        required: true
    },
    packageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Package",
        required: true,
    }
}, {timestamps: true});

export const Itinerary = mongoose.model("Itinerary", itineraySchema);