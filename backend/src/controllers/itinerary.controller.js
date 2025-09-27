import mongoose from "mongoose";
import { Itinerary } from "../models/Itinerary.js";


const createItinerary = async (req, res) => {
    try {
        const { email, packageId } = req.body;
        if(!email || !packageId) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        if(!mongoose.Types.ObjectId.isValid(packageId)) {
            return res.status(400).json({ message: "Invalid package ID" });
        }
        const itinerary = await Itinerary.create({ email, packageId });
        res.status(201).json({success: true, data: itinerary });
    } catch (error) {
        console.error("Error creating itinerary:", error);
        res.status(500).json({success: false, message: error.message });
    }
};
const getItinerary= async (req, res)=>{
    try {
        const itinerary = await Itinerary.find({});
        res.status(200).json({success: true, data: itinerary });
    } catch (error) {
        console.log("Error getting itinerary", error)
        res.status(500).json({success: false, message: error.message });
    }
}

export { createItinerary , getItinerary};