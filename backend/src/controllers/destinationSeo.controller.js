import { DestinationSeo } from "../models/Destination-Seo.js";

const createDestinationSeo = async (req, res) => {
  try {
    const { destinationId, categoryId, metaTitle, metaDescription } = req.body;
    if (!destinationId || !categoryId || !metaTitle || !metaDescription) {
      return res
        .status(400)
        .json({ success: false, message: "all Required things missing" });
    }
    const destinationSeo = new DestinationSeo({ ...req.body });
    await destinationSeo.save();
    res.status(201).json({ success: true, data: destinationSeo });
  } catch (error) {
    console.log("Destination Seo creation failed: ", error.message);
    res
      .status(500)
      .json({ success: false, message: `Server Error: ${error.message}` });
  }
};

const updateDestinationSeo = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Required things missing" });
    }
    const destinationSeo = await DestinationSeo.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );
    if (!destinationSeo) {
      return res
        .status(404)
        .json({ success: false, message: "Destination Seo not found" });
    }
    res.status(200).json({ success: true, data: destinationSeo });
  } catch (error) {
    console.log("Destination Seo update failed: ", error.message);
    res
      .status(500)
      .json({ success: false, message: `Server Error: ${error.message}` });
  }
};

const getAllDestinationSeo = async (req, res) => {
  try {
    const getAllDestinationSeo = await DestinationSeo.find()
      .populate("destinationId", "state _id name")
      .populate("categoryId", "name _id slug");
    res.status(200).json({ success: true, data: getAllDestinationSeo });
  } catch (error) {
    console.log("All Destination Seo getting failed: ", error.message);
    res
      .status(500)
      .json({ success: false, message: `Server Error: ${error.message}` });
  }
};

const getDestinationSeoById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "id Required things missing" });
    }
    const destinationSeo = await DestinationSeo.findById(id);
    if (!destinationSeo) {
      return res
        .status(404)
        .json({ success: false, message: "Destination Seo not found" });
    }
    res.status(200).json({ success: true, data: destinationSeo });
  } catch (error) {
    console.log("Destination Seo getting by id failed: ", error.message);
    res
      .status(500)
      .json({ success: false, message: `Server Error: ${error.message}` });
  }
};
const getDestinationSeo = async (req, res) => {
  try {
    const { destination_slug, category_slug } = req.params;
    if (!destination_slug || !category_slug) {
      return res
        .status(400)
        .json({ success: false, message: "Required things missing" });
    }
    const destinationId = await Destination.findOne({
      state: destination_slug,
    }).select("_id");
    const categoryId = await Category.findOne({ slug: category_slug }).select(
      "_id"
    );
    const destinationSeo = await DestinationSeo.findOne({
      destinationId: destinationId._id,
      categoryId: categoryId._id,
    });
    if (!destinationSeo) {
      return res
        .status(404)
        .json({ success: false, message: "Destination Seo not found" });
    }
    res.status(200).json({ success: true, data: destinationSeo });
  } catch (error) {
    console.log(" Destination Seo Getting failed: ", error.message);
    res
      .status(500)
      .json({ success: false, message: `Server Error: ${error.message}` });
  }
};
const deleteDestinationSeo = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Required things missing" });
    }
    const destinationSeo = await DestinationSeo.findByIdAndDelete(id);
    if (!destinationSeo) {
      return res
        .status(404)
        .json({ success: false, message: "Destination Seo not found" });
    }
    res.status(200).json({ success: true, data: destinationSeo });
  } catch (error) {
    console.log("Destination Seo deletion failed: ", error.message);
    res
      .status(500)
      .json({ success: false, message: `Server Error: ${error.message}` });
  }
};
export {
  createDestinationSeo,
  updateDestinationSeo,
  getAllDestinationSeo,
  deleteDestinationSeo,
  getDestinationSeo,
  getDestinationSeoById,
};
