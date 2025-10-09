import { Job } from "../models/Job.js";
import mongoose from "mongoose";
const createJob = async (req, res) => {
  try {
    const { title, department } = req.body;

    if (!title || !department) {
      return res
        .status(400)
        .json({ success: false, message: "Required things missing" });
    }

    const job = new Job({ ...req.body });
    await job.save();

    res
      .status(201)
      .json({ success: true, message: "Job created Successfully", data: job });
  } catch (error) {
    console.log("Job creation failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Required things missing" });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Job fetched successfully", data: job });
  } catch (error) {
    console.log("Job getting by id failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getAllJobs = async (req, res) => {
  try {
    const { filter = {} } = req.query;

    if (req.query?.title) filter.title = req.query.title;
    if (req.query?.department) filter.department = req.query.department;
    if (req.query?.experienceLevel)
      filter.experienceLevel = req.query.experienceLevel;
    if (req.query?.location) filter.location = req.query.location;
    if (req.query?.employmentType)
      filter.employmentType = req.query.employmentType;
    if (req.query?.jobType) filter.jobType = req.query.jobType;
    const jobs = await Job.find(filter).sort({ createdAt: -1 }).lean();
    if (!jobs) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Job fetched successfully", data: jobs });
  } catch (error) {
    console.log("Job getting by id failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: "Invalid Id" });
    const job = await Job.findById(id);
    if (!job)
      return res.status(404).json({ success: false, message: "Job not found" });
    const updatedJob = await Job.findByIdAndUpdate(id, req.body, { new: true });
    res.status(200).json({
      success: true,
      message: "Job updated successfully",
      data: updatedJob,
    });
  } catch (error) {
    console.log("Job getting by id failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: "Invalid Id" });
    const job = await Job.findById(id);
    if (!job)
      return res.status(404).json({ success: false, message: "Job not found" });
    const deletedJob = await Job.findByIdAndDelete(id);
    res.status(200).json({
      success: true,
      message: "Job deleted successfully",
      data: deletedJob,
    });
  } catch (error) {
    console.log("Job getting by id failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
export { createJob, getJobById, getAllJobs, updateJob, deleteJob };
