import mongoose from "mongoose";
import { JobApplication } from "../models/JobApplication.js";

const createApplication = async (req, res) => {
  try {
    const { jobId, fullName, email, phone, resumeUrl } = req.body;
    if (!jobId || !fullName || !email || !phone || !resumeUrl) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }
    const jobApplication = new JobApplication({
      jobId,
      fullName,
      email,
      phone,
      resumeUrl,
      ...req.body,
    });
    await jobApplication.save();
    res.status(201).json({
      success: true,
      message: "Job application created successfully",
      data: jobApplication,
    });
  } catch (error) {
    console.log("Error creating job application", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateApplication = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const jobApplication = await JobApplication.findById(id);
    if (!jobApplication) {
      return res
        .status(404)
        .json({ success: false, message: "Job application not found" });
    }
    const updatedJobApplication = await JobApplication.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );
    res.status(200).json({
      success: true,
      message: "Job application updated successfully",
      data: updatedJobApplication,
    });
  } catch (error) {
    console.log("Error updating job application", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllApplications = async (req, res) => {
  try {
    const { filter = {} } = req.query;
    if (req.query?.jobId) filter.jobId = req.query.jobId;
    if (req.query?.fullName) filter.fullName = req.query.fullName;
    if (req.query?.email) filter.email = req.query.email;
    if (req.query?.phone) filter.phone = req.query.phone;
    if (req.query?.status) filter.status = req.query.status;
    const jobApplications = await JobApplication.find(filter).lean();
    if (!jobApplications) {
      return res
        .status(404)
        .json({ success: false, message: "Job applications not found" });
    }
    res.status(200).json({
      success: true,
      message: "Job applications fetched successfully",
      data: jobApplications,
    });
  } catch (error) {
    console.log("Error getting all job applications", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const jobApplication = await JobApplication.findById(id);
    if (!jobApplication) {
      return res
        .status(404)
        .json({ success: false, message: "Job application not found" });
    }
    const deletedJobApplication = await JobApplication.findByIdAndDelete(id);
    res.status(200).json({
      success: true,
      message: "Job application deleted successfully",
      data: deletedJobApplication,
    });
  } catch (error) {
    console.log("Error deleting job application", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
export {
  createApplication,
  getAllApplications,
  updateApplication,
  deleteApplication,
};
