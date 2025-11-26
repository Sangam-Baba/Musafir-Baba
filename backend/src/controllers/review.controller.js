import { Reviews } from "../models/Reviews.js";
import mongoose from "mongoose";
const createReviews = async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    const { name, rating, comment, location, type } = req.body;
    if (!name || !comment) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }
    const review = await Reviews.create({
      userId,
      name,
      rating,
      comment,
      location,
      type,
    });
    const createdReview = await review.save();
    res.status(201).json({ success: true, data: createdReview });
  } catch (error) {
    console.log("Review creation failed", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

const updateReviews = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const review = await Reviews.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!review)
      return res.status(404).json({ success: false, message: "Invalid Id" });
    res.status(200).json({
      success: true,
      message: "Review Update successful",
      data: review,
    });
  } catch (error) {
    console.log("Review update failed", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

const deleteReviews = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const review = await Reviews.findByIdAndDelete(id);
    if (!review)
      return res.status(404).json({ success: false, message: "Invalid Id" });
    res.status(200).json({
      success: true,
      message: "Review Delete successful",
      data: review,
    });
  } catch (error) {
    console.log("Review delete failed", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const review = await Reviews.findById(id);
    if (!review) {
      return res
        .status(404)
        .json({ success: false, message: "review not found" });
    }
    res.status(200).json({
      success: true,
      message: "review fetched successfully",
      data: review,
    });
  } catch (error) {
    console.log("reviews getting failed: ", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getReviewsByIds = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) {
      return res.status(400).json({ success: false, message: "Invalid Ids" });
    }
    const reviews = await Reviews.find({ _id: { $in: ids } })
      .select("_id name ")
      .lean()
      .exec();
    if (!reviews) {
      return res
        .status(404)
        .json({ success: false, message: "reviews not found" });
    }
    res.status(200).json({
      success: true,
      message: "reviews fetched successfully",
      data: reviews,
    });
  } catch (error) {
    console.log("reviews getting by Ids failed: ", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export {
  createReviews,
  updateReviews,
  deleteReviews,
  getReviewById,
  getReviewsByIds,
};
