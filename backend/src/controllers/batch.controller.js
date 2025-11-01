import { Batch } from "../models/Batch.js";

const createBatch = async (req, res) => {
  try {
    const { name, startDate, endDate, quad, triple, double, child } = req.body;
    if (
      !name ||
      !startDate ||
      !endDate ||
      !quad ||
      !triple ||
      !double ||
      !child
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }
    const batch = new Batch({
      name,
      startDate,
      endDate,
      quad,
      triple,
      double,
      child,
      ...req.body,
    });
    await batch.save();
    res
      .status(201)
      .json({
        success: true,
        message: "Batch created successfully",
        data: batch,
      });
  } catch (error) {
    console.log("batch creation failed: ", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const updateBatch = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const batch = await Batch.findByIdAndUpdate(id, req.body, { new: true });
    if (!batch) {
      return res
        .status(404)
        .json({ success: false, message: "Batch not found" });
    }
    res
      .status(200)
      .json({
        success: true,
        message: "Batch updated successfully",
        data: batch,
      });
  } catch (error) {
    console.log("batch update failed: ", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export { createBatch, updateBatch };
